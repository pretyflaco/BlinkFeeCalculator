# Blink Fee Model Specification

## Overview

This document specifies the complete fee calculation model used by the Blink platform for onchain Bitcoin transactions. The model calculates fees based on payment amount, network conditions, and user fee preferences.

## Core Formula

The Blink fee is calculated using this formula:

```
BlinkFee = (PaymentAmount × FeePercentage) + (PaymentCostToBank × BaseMultiplier)
```

Where:
- `PaymentAmount` = Transaction amount in satoshis
- `FeePercentage` = Percentage-based fee (varies by tier and amount)
- `PaymentCostToBank` = Network transaction cost in satoshis
- `BaseMultiplier` = Multiplier for network costs (varies by tier)

## Required Inputs

### 1. Payment Amount
- **Type**: `number` (satoshis)
- **Range**: 10,000 - 100,000,000 sats (0.0001 - 1 BTC)
- **Description**: The amount being sent in the transaction

### 2. Fee Preference (Tier)
- **Type**: `enum` ('fastestFee' | 'hourFee' | 'economyFee')
- **Values**:
  - `fastestFee` = Priority tier
  - `hourFee` = Standard tier  
  - `economyFee` = Economy tier

### 3. Network Fee Rate
- **Type**: `number` (satoshis per virtual byte)
- **Source**: mempool.space API (`fastestFee` field)
- **Description**: Current network fee rate for fast confirmation

## Fee Tiers Configuration

### Priority Tier (`fastestFee`)
- **Fee Range**: 4.0% → 0.75%
- **Cap**: 30,000 sats
- **Base Multiplier**: `(2 / fastestFee) + 1.3`

### Standard Tier (`hourFee`)
- **Fee Range**: 3.0% → 0.50%
- **Cap**: 20,000 sats
- **Base Multiplier**: `(1 / fastestFee) + 1.1`

### Economy Tier (`economyFee`)
- **Fee Range**: 2.0% → 0.3125%
- **Cap**: 12,500 sats
- **Base Multiplier**: `(2 / fastestFee) + 1.1`
- **Special**: Uses batched transaction model

## Transaction Size Constants

```typescript
const BASE_SIZE = 11; // bytes
const P2WPKH_INPUT_SIZE = 68; // bytes per input
const P2WPKH_OUTPUT_SIZE = 31; // bytes per output
```

## Input Count Estimation

### Regular Transactions (Priority & Standard)
```typescript
function getNumberOfInputs(amountSats: number): number {
  if (amountSats < 1) return 0;
  if (amountSats < 500000) return 1;
  if (amountSats < 3000000) return 2;
  if (amountSats < 10000000) return 3;
  if (amountSats < 22000000) return 4;
  if (amountSats < 70000000) return 5;
  return 6;
}
```

### Batched Transactions (Economy)
```typescript
function getBatchInputCount(amountSats: number): number {
  if (amountSats < 500000) return 3;
  if (amountSats < 3000000) return 4;
  if (amountSats < 10000000) return 5;
  if (amountSats < 22000000) return 6;
  if (amountSats < 70000000) return 7;
  return 8;
}
```

## Transaction Size Calculation

```typescript
function calculateTransactionSize(numInputs: number, numOutputs: number = 2): number {
  return BASE_SIZE + (numInputs * P2WPKH_INPUT_SIZE) + (numOutputs * P2WPKH_OUTPUT_SIZE);
}
```

## Exponential Decay Function

```typescript
function calculateExpDecay(
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
```

## Fee Percentage Calculation

```typescript
function calculateFeePercentage(paymentAmountSats: number, feeType: FeePreference, fastestFee: number): number {
  if (paymentAmountSats === 0) return 0;

  switch (feeType) {
    case 'fastestFee': { // Priority
      const expDecay = calculateExpDecay(paymentAmountSats, 0.0075, 0.04, 30000);
      return expDecay + ((fastestFee - 1) / (2000 - 1)) * (0.005 - expDecay);
    }
    case 'hourFee': { // Standard
      const expDecay = calculateExpDecay(paymentAmountSats, 0.005, 0.03, 20000);
      return expDecay + ((fastestFee - 1) / (2000 - 1)) * (0.0025 - expDecay);
    }
    case 'economyFee': { // Economy
      const expDecay = calculateExpDecay(paymentAmountSats, 0.003125, 0.02, 12500);
      return expDecay + ((fastestFee - 1) / (2000 - 1)) * (0.001 - expDecay);
    }
    default:
      return 0;
  }
}
```

## Base Multiplier Calculation

```typescript
function calculateBaseMultiplier(feeType: FeePreference, fastestFee: number): number {
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
```

## Payment Cost to Bank Calculation

```typescript
function calculatePaymentCostToBank(
  paymentAmountSats: number, 
  feeType: FeePreference, 
  mempoolFee: number
): number {
  if (feeType === 'economyFee') {
    // Batched transaction calculation for Economy tier
    const batchInputs = getBatchInputCount(paymentAmountSats);
    const batchOutputs = 11;
    const batchSize = calculateTransactionSize(batchInputs, batchOutputs);
    return Math.round((batchSize * mempoolFee) / 10); // Divide by 10 for individual payment cost
  }

  // Regular transaction calculation for Priority and Standard
  const numInputs = getNumberOfInputs(paymentAmountSats);
  const transactionSize = calculateTransactionSize(numInputs);
  return transactionSize * mempoolFee;
}
```

## Complete Fee Calculation

```typescript
function calculateBlinkFee(
  paymentAmountSats: number,
  feeType: FeePreference,
  fastestFee: number
): { feeSats: number; transactionSize: number } {
  const paymentCostToBank = calculatePaymentCostToBank(paymentAmountSats, feeType, fastestFee);
  const transactionSize = feeType === 'economyFee'
    ? calculateTransactionSize(getBatchInputCount(paymentAmountSats), 11)
    : calculateTransactionSize(getNumberOfInputs(paymentAmountSats));

  const feePercentage = calculateFeePercentage(paymentAmountSats, feeType, fastestFee);
  const baseMultiplier = calculateBaseMultiplier(feeType, fastestFee);

  const feeSats = Math.round(
    (paymentAmountSats * feePercentage) + (paymentCostToBank * baseMultiplier)
  );

  return { feeSats, transactionSize };
}
```

## API Integration

### Required External Data

1. **Mempool Fee Data**
   - **Endpoint**: `https://mempool.space/api/v1/fees/recommended`
   - **Required Field**: `fastestFee` (satoshis per virtual byte)
   - **Refresh Rate**: Every 2 minutes recommended

2. **Bitcoin Price** (for USD conversion)
   - **Source**: Blink GraphQL API or alternative
   - **Purpose**: USD fee display (optional)

### Example API Response
```json
{
  "fastestFee": 50,
  "halfHourFee": 30,
  "hourFee": 20,
  "economyFee": 10,
  "minimumFee": 1
}
```

## Implementation Notes

### Key Considerations

1. **Precision**: All calculations should use integer arithmetic for satoshis
2. **Rounding**: Use `Math.round()` for final fee calculation
3. **Validation**: Ensure payment amount is within valid range (10,000 - 100,000,000 sats)
4. **Error Handling**: Handle API failures gracefully with fallback fee rates

### Edge Cases

1. **Very Low Amounts**: Minimum fee applies for amounts below 21,000 sats
2. **Very High Amounts**: Fee percentage approaches minimum rate asymptotically
3. **Network Congestion**: High `fastestFee` values increase both percentage and multiplier
4. **API Failures**: Implement fallback fee rates (e.g., 50 sat/vB default)

### Testing Scenarios

1. **Minimum Amount**: 10,000 sats with each tier
2. **Typical Amounts**: 100,000, 1,000,000, 10,000,000 sats
3. **Maximum Amount**: 100,000,000 sats
4. **Network Conditions**: Low (1 sat/vB), Medium (50 sat/vB), High (2000 sat/vB) fee rates

## Example Calculations

### Example 1: Priority Tier
- **Amount**: 1,000,000 sats (0.01 BTC)
- **Network Fee**: 50 sat/vB
- **Expected Fee**: ~15,000-20,000 sats

### Example 2: Economy Tier (Batched)
- **Amount**: 500,000 sats (0.005 BTC)
- **Network Fee**: 20 sat/vB
- **Expected Fee**: ~8,000-12,000 sats

### Example 3: High Network Congestion
- **Amount**: 10,000,000 sats (0.1 BTC)
- **Network Fee**: 200 sat/vB
- **Expected Fee**: ~50,000-80,000 sats

## Validation

To validate your implementation:

1. Use the same inputs as the web calculator
2. Compare results with the live calculator at the same time
3. Account for slight differences due to real-time network data
4. Test with various network conditions and amounts

## Support

For questions about the fee model implementation, refer to the source code in `client/src/components/FeeCalculator.tsx` or contact the development team. 