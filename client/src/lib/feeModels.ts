// Shared, parameterized Blink on-chain fee model.
//
// Both the live calculator (FeeCalculator.tsx) and the documentation charts
// (FeeComparisonChart.tsx, BaseMultiplierChart.tsx) import from this module so
// that the fee math is defined exactly once.
//
// Two configurations are exported:
//   - CURRENT_MODEL:     the existing production parameters (flat-ish caps).
//   - RECOMMENDED_MODEL: the "On-Chain Fee Model Analysis" (June 2026)
//                        recommendation — smooth curves with no visible cap,
//                        narrower rate bands, slower decay, and a min-fee floor.

// ---------------------------------------------------------------------------
// Transaction size components for P2WPKH
// ---------------------------------------------------------------------------
export const BASE_SIZE = 11; // bytes
export const P2WPKH_INPUT_SIZE = 68; // bytes
export const P2WPKH_OUTPUT_SIZE = 31; // bytes

export type FeePreference = 'fastestFee' | 'hourFee' | 'economyFee';

// A tier maps onto the three exponential-decay tiers.
export interface TierParams {
  /** Starting fee percentage for the smallest transactions (e.g. 0.04 = 4%). */
  maxRate: number;
  /** Floor fee percentage the curve decays toward (e.g. 0.0075 = 0.75%). */
  minRate: number;
  /**
   * Numerator of the linear-tail / cap formula used above `decayStartAmount`
   * (fee% = cap / amount). Historically this was the per-tier sats cap
   * (30000 / 20000 / 12500).
   */
  cap: number;
  /**
   * Target fee percentage the model blends toward during high network
   * congestion. Left as an explicit, per-tier configuration knob.
   */
  congestionTarget: number;
  /** Additive constant in the base-multiplier formula. */
  baseMultiplierConst: number;
  /** Numerator in the base-multiplier formula: (divisor / networkFee) + const. */
  baseMultiplierDivisor: number;
}

export interface FeeModelConfig {
  id: 'current' | 'recommended';
  label: string;
  description: string;
  /** Where the decay range begins. Transactions below pay maxRate. */
  baseAmount: number;
  /**
   * Threshold where the exponential decay ends and the linear-tail/cap
   * formula begins. Setting this far above real transaction sizes (100M)
   * effectively removes the cap.
   */
  decayStartAmount: number;
  /** How quickly the rate drops from maxRate toward minRate. */
  decaySpeed: number;
  /** Minimum fee in sats applied after the formula (0 = no floor). */
  minFeeFloor: number;
  tiers: Record<FeePreference, TierParams>;
}

// ---------------------------------------------------------------------------
// Model configurations
// ---------------------------------------------------------------------------

export const CURRENT_MODEL: FeeModelConfig = {
  id: 'current',
  label: 'Current',
  description: 'Current production parameters with per-tier fee caps above 4M sats.',
  baseAmount: 21000,
  decayStartAmount: 4000000,
  decaySpeed: 21,
  minFeeFloor: 0,
  tiers: {
    fastestFee: {
      maxRate: 0.04,
      minRate: 0.0075,
      cap: 30000,
      congestionTarget: 0.005,
      baseMultiplierConst: 1.3,
      baseMultiplierDivisor: 2,
    },
    hourFee: {
      maxRate: 0.03,
      minRate: 0.005,
      cap: 20000,
      congestionTarget: 0.0025,
      baseMultiplierConst: 1.1,
      baseMultiplierDivisor: 1,
    },
    economyFee: {
      maxRate: 0.02,
      minRate: 0.003125,
      cap: 12500,
      congestionTarget: 0.001,
      baseMultiplierConst: 1.1,
      baseMultiplierDivisor: 2,
    },
  },
};

// Recommended parameters from the June 2026 analysis.
// decayStartAmount = 100M (removes the visible cap), decaySpeed = 6 (smoother),
// narrower rate bands, and a 100-sat minimum fee floor.
//
// The doc does not specify new congestion-target rates, so per the agreed
// default we set congestionTarget = minRate for each tier (keeps the effective
// rate within the stated band under congestion). This is the config "knob".
export const RECOMMENDED_MODEL: FeeModelConfig = {
  id: 'recommended',
  label: 'Recommended',
  description:
    'June 2026 analysis recommendation: smooth curves (no visible cap), narrower rate bands, slower decay, and a 100-sat minimum floor.',
  baseAmount: 21000,
  decayStartAmount: 100000000,
  decaySpeed: 6,
  minFeeFloor: 100,
  tiers: {
    fastestFee: {
      maxRate: 0.015,
      minRate: 0.004,
      cap: 30000,
      congestionTarget: 0.004,
      baseMultiplierConst: 1.3,
      baseMultiplierDivisor: 2,
    },
    hourFee: {
      maxRate: 0.007,
      minRate: 0.003,
      cap: 20000,
      congestionTarget: 0.003,
      baseMultiplierConst: 1.1,
      baseMultiplierDivisor: 1,
    },
    economyFee: {
      maxRate: 0.004,
      minRate: 0.0015,
      cap: 12500,
      congestionTarget: 0.0015,
      baseMultiplierConst: 1.1,
      baseMultiplierDivisor: 2,
    },
  },
};

export const FEE_MODELS: Record<FeeModelConfig['id'], FeeModelConfig> = {
  current: CURRENT_MODEL,
  recommended: RECOMMENDED_MODEL,
};

// ---------------------------------------------------------------------------
// Core math
// ---------------------------------------------------------------------------

/** Estimate the number of inputs for a regular (Priority/Standard) transaction. */
export function getNumberOfInputs(amountSats: number): number {
  if (amountSats < 1) return 0;
  if (amountSats < 500000) return 1;
  if (amountSats < 3000000) return 2;
  if (amountSats < 10000000) return 3;
  if (amountSats < 22000000) return 4;
  if (amountSats < 70000000) return 5;
  return 6;
}

/** Estimate the number of inputs for a batched (Economy) transaction. */
export function getBatchInputCount(amountSats: number): number {
  if (amountSats < 500000) return 3;
  if (amountSats < 3000000) return 4;
  if (amountSats < 10000000) return 5;
  if (amountSats < 22000000) return 6;
  if (amountSats < 70000000) return 7;
  return 8;
}

/** Transaction size in vbytes. */
export function calculateTransactionSize(numInputs: number, numOutputs = 2): number {
  return BASE_SIZE + numInputs * P2WPKH_INPUT_SIZE + numOutputs * P2WPKH_OUTPUT_SIZE;
}

/**
 * Exponential-decay fee rate. Below `decayStartAmount` the rate decays from
 * maxRate toward minRate; at/above it the linear-tail/cap formula applies.
 */
export function calculateExpDecay(
  paymentAmountSats: number,
  tier: TierParams,
  config: FeeModelConfig,
): number {
  const { baseAmount, decayStartAmount, decaySpeed } = config;
  if (paymentAmountSats < decayStartAmount) {
    return (
      tier.minRate +
      (tier.maxRate - tier.minRate) *
        Math.exp(-((paymentAmountSats - baseAmount) / (decayStartAmount - baseAmount)) * decaySpeed)
    );
  }
  return tier.cap / paymentAmountSats;
}

/**
 * Fee percentage for a given amount, tier, and network fee rate. Blends the
 * exponential-decay rate toward the tier's congestion target as the network
 * fee rate rises (1 -> 2000 sat/vB).
 */
export function calculateFeePercentage(
  paymentAmountSats: number,
  feeType: FeePreference,
  networkFee: number,
  config: FeeModelConfig,
): number {
  if (paymentAmountSats === 0) return 0;
  const tier = config.tiers[feeType];
  const expDecay = calculateExpDecay(paymentAmountSats, tier, config);
  return expDecay + ((networkFee - 1) / (2000 - 1)) * (tier.congestionTarget - expDecay);
}

/** Base multiplier for a given tier and network fee rate. */
export function calculateBaseMultiplier(
  feeType: FeePreference,
  networkFee: number,
  config: FeeModelConfig,
): number {
  if (!networkFee) return 0;
  const tier = config.tiers[feeType];
  return tier.baseMultiplierDivisor / networkFee + tier.baseMultiplierConst;
}

/** Per-payment network cost ("payment cost to bank") in sats. */
export function calculatePaymentCostToBank(
  paymentAmountSats: number,
  feeType: FeePreference,
  networkFee: number,
): number {
  if (feeType === 'economyFee') {
    const batchInputs = getBatchInputCount(paymentAmountSats);
    const batchOutputs = 11;
    const batchSize = calculateTransactionSize(batchInputs, batchOutputs);
    return Math.round((batchSize * networkFee) / 10);
  }
  const numInputs = getNumberOfInputs(paymentAmountSats);
  const transactionSize = calculateTransactionSize(numInputs);
  return transactionSize * networkFee;
}

export interface BlinkFeeResult {
  feeSats: number;
  feePercentage: number;
  transactionSize: number;
}

/** Complete Blink fee calculation for a given model config. */
export function calculateBlinkFee(
  paymentAmountSats: number,
  feeType: FeePreference,
  networkFee: number,
  config: FeeModelConfig,
): BlinkFeeResult | null {
  if (paymentAmountSats === 0) return null;

  const paymentCostToBank = calculatePaymentCostToBank(paymentAmountSats, feeType, networkFee);
  const transactionSize =
    feeType === 'economyFee'
      ? calculateTransactionSize(getBatchInputCount(paymentAmountSats), 11)
      : calculateTransactionSize(getNumberOfInputs(paymentAmountSats));

  const feePercentage = calculateFeePercentage(paymentAmountSats, feeType, networkFee, config);
  const baseMultiplier = calculateBaseMultiplier(feeType, networkFee, config);

  let feeSats = Math.round(paymentAmountSats * feePercentage + paymentCostToBank * baseMultiplier);
  if (config.minFeeFloor > 0) {
    feeSats = Math.max(feeSats, config.minFeeFloor);
  }

  return { feeSats, feePercentage, transactionSize };
}

/**
 * Current flat-fee baseline used to show savings during the transition:
 * 5,000 sats below 1M, 10,000 sats at/above 1M.
 */
export function calculateFlatFee(paymentAmountSats: number): number {
  if (paymentAmountSats === 0) return 0;
  return paymentAmountSats < 1000000 ? 5000 : 10000;
}
