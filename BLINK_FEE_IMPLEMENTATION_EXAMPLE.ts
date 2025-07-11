// Blink Fee Model Implementation Example
// This is a reference implementation for Bitcoin wallet developers

type FeePreference = 'fastestFee' | 'hourFee' | 'economyFee';

interface MempoolFeeData {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

interface FeeCalculationResult {
  feeSats: number;
  feeBTC: number;
  transactionSize: number;
  feePercentage: number;
  baseMultiplier: number;
  paymentCostToBank: number;
}

// Transaction size constants for P2WPKH
const BASE_SIZE = 11;
const P2WPKH_INPUT_SIZE = 68;
const P2WPKH_OUTPUT_SIZE = 31;

export class BlinkFeeCalculator {
  private mempoolData: MempoolFeeData | null = null;

  // Update mempool data (call this periodically)
  async updateMempoolData(): Promise<void> {
    try {
      const response = await fetch('https://mempool.space/api/v1/fees/recommended');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.mempoolData = await response.json();
    } catch (error) {
      console.error('Failed to fetch mempool data:', error);
      // Use fallback data if API fails
      this.mempoolData = {
        fastestFee: 50,
        halfHourFee: 30,
        hourFee: 20,
        economyFee: 10,
        minimumFee: 1
      };
    }
  }

  // Get number of inputs for regular transactions (Priority & Standard)
  private getNumberOfInputs(amountSats: number): number {
    if (amountSats < 1) return 0;
    if (amountSats < 500000) return 1;
    if (amountSats < 3000000) return 2;
    if (amountSats < 10000000) return 3;
    if (amountSats < 22000000) return 4;
    if (amountSats < 70000000) return 5;
    return 6;
  }

  // Get number of inputs for batched transactions (Economy)
  private getBatchInputCount(amountSats: number): number {
    if (amountSats < 500000) return 3;
    if (amountSats < 3000000) return 4;
    if (amountSats < 10000000) return 5;
    if (amountSats < 22000000) return 6;
    if (amountSats < 70000000) return 7;
    return 8;
  }

  // Calculate transaction size in virtual bytes
  private calculateTransactionSize(numInputs: number, numOutputs: number = 2): number {
    return BASE_SIZE + (numInputs * P2WPKH_INPUT_SIZE) + (numOutputs * P2WPKH_OUTPUT_SIZE);
  }

  // Calculate exponential decay for fee percentage
  private calculateExpDecay(
    paymentAmountSats: number,
    minRate: number,
    maxRate: number,
    constDivisor: number
  ): number {
    if (paymentAmountSats < 4000000) {
      return minRate + (maxRate - minRate) * Math.exp(-((paymentAmountSats - 21000) / (4000000 - 21000)) * 21);
    } else {
      return constDivisor / paymentAmountSats;
    }
  }

  // Calculate fee percentage based on tier and amount
  private calculateFeePercentage(paymentAmountSats: number, feeType: FeePreference): number {
    if (!this.mempoolData || paymentAmountSats === 0) return 0;

    const fastestFee = this.mempoolData.fastestFee;

    switch (feeType) {
      case 'fastestFee': { // Priority: 4% to 0.75%, capped at 30000 sats
        const expDecay = this.calculateExpDecay(paymentAmountSats, 0.0075, 0.04, 30000);
        return expDecay + ((fastestFee - 1) / (2000 - 1)) * (0.005 - expDecay);
      }
      case 'hourFee': { // Standard: 3% to 0.5%, capped at 20000 sats
        const expDecay = this.calculateExpDecay(paymentAmountSats, 0.005, 0.03, 20000);
        return expDecay + ((fastestFee - 1) / (2000 - 1)) * (0.0025 - expDecay);
      }
      case 'economyFee': { // Economy: 2% to 0.3125%, capped at 12500 sats
        const expDecay = this.calculateExpDecay(paymentAmountSats, 0.003125, 0.02, 12500);
        return expDecay + ((fastestFee - 1) / (2000 - 1)) * (0.001 - expDecay);
      }
      default:
        return 0;
    }
  }

  // Calculate base multiplier for network costs
  private calculateBaseMultiplier(feeType: FeePreference): number {
    if (!this.mempoolData) return 0;

    const fastestFee = this.mempoolData.fastestFee;

    switch (feeType) {
      case 'fastestFee': // Priority
        return (2 / fastestFee) + 1.3;
      case 'hourFee': // Standard
        return (1 / fastestFee) + 1.1;
      case 'economyFee': // Economy
        return (2 / fastestFee) + 1.1;
      default:
        return 0;
    }
  }

  // Calculate payment cost to bank (network transaction cost)
  private calculatePaymentCostToBank(paymentAmountSats: number, feeType: FeePreference): number {
    if (!this.mempoolData) return 0;

    const mempoolFee = this.mempoolData.fastestFee;

    if (feeType === 'economyFee') {
      // Batched transaction calculation for Economy tier
      const batchInputs = this.getBatchInputCount(paymentAmountSats);
      const batchOutputs = 11;
      const batchSize = this.calculateTransactionSize(batchInputs, batchOutputs);
      return Math.round((batchSize * mempoolFee) / 10); // Divide by 10 for individual payment cost
    }

    // Regular transaction calculation for Priority and Standard
    const numInputs = this.getNumberOfInputs(paymentAmountSats);
    const transactionSize = this.calculateTransactionSize(numInputs);
    return transactionSize * mempoolFee;
  }

  // Main fee calculation function
  calculateFee(
    paymentAmountSats: number,
    feeType: FeePreference
  ): FeeCalculationResult | null {
    // Validate inputs
    if (paymentAmountSats < 10000 || paymentAmountSats > 100000000) {
      throw new Error('Payment amount must be between 10,000 and 100,000,000 satoshis');
    }

    if (!this.mempoolData) {
      throw new Error('Mempool data not available. Call updateMempoolData() first.');
    }

    // Calculate components
    const paymentCostToBank = this.calculatePaymentCostToBank(paymentAmountSats, feeType);
    const transactionSize = feeType === 'economyFee'
      ? this.calculateTransactionSize(this.getBatchInputCount(paymentAmountSats), 11)
      : this.calculateTransactionSize(this.getNumberOfInputs(paymentAmountSats));

    const feePercentage = this.calculateFeePercentage(paymentAmountSats, feeType);
    const baseMultiplier = this.calculateBaseMultiplier(feeType);

    // Calculate final fee
    const feeSats = Math.round(
      (paymentAmountSats * feePercentage) + (paymentCostToBank * baseMultiplier)
    );

    const feeBTC = feeSats / 100000000;

    return {
      feeSats,
      feeBTC,
      transactionSize,
      feePercentage,
      baseMultiplier,
      paymentCostToBank
    };
  }

  // Get current mempool data
  getMempoolData(): MempoolFeeData | null {
    return this.mempoolData;
  }

  // Get fee tier display name
  getFeeTierName(feeType: FeePreference): string {
    switch (feeType) {
      case 'fastestFee': return 'Priority';
      case 'hourFee': return 'Standard';
      case 'economyFee': return 'Economy';
      default: return 'Unknown';
    }
  }
}

// Usage example
export async function exampleUsage() {
  const calculator = new BlinkFeeCalculator();
  
  // Update mempool data
  await calculator.updateMempoolData();
  
  // Calculate fees for different scenarios
  const scenarios = [
    { amount: 1000000, tier: 'fastestFee' as FeePreference, description: '1M sats Priority' },
    { amount: 1000000, tier: 'hourFee' as FeePreference, description: '1M sats Standard' },
    { amount: 1000000, tier: 'economyFee' as FeePreference, description: '1M sats Economy' },
    { amount: 10000000, tier: 'fastestFee' as FeePreference, description: '10M sats Priority' },
  ];

  for (const scenario of scenarios) {
    try {
      const result = calculator.calculateFee(scenario.amount, scenario.tier);
      if (result) {
        console.log(`${scenario.description}:`);
        console.log(`  Fee: ${result.feeSats} sats (${result.feeBTC.toFixed(8)} BTC)`);
        console.log(`  Transaction Size: ${result.transactionSize} vbytes`);
        console.log(`  Fee Percentage: ${(result.feePercentage * 100).toFixed(4)}%`);
        console.log(`  Base Multiplier: ${result.baseMultiplier.toFixed(2)}`);
        console.log(`  Payment Cost to Bank: ${result.paymentCostToBank} sats`);
        console.log('');
      }
    } catch (error) {
      console.error(`Error calculating fee for ${scenario.description}:`, error);
    }
  }
}

// Export types for external use
export type { FeePreference, MempoolFeeData, FeeCalculationResult }; 