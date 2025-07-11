# Blink Fee Model - Quick Summary for Bitcoin Wallet Implementation

## 🎯 What You Need to Implement

The Blink fee model calculates transaction fees using this formula:

```
BlinkFee = (PaymentAmount × FeePercentage) + (PaymentCostToBank × BaseMultiplier)
```

## 📋 Required Inputs

1. **Payment Amount** (satoshis): 10,000 - 100,000,000 sats
2. **Fee Tier**: `fastestFee` (Priority), `hourFee` (Standard), or `economyFee` (Economy)
3. **Network Fee Rate**: Current `fastestFee` from mempool.space API

## 🔧 Key Components

### Fee Tiers
- **Priority**: 4% → 0.75%, cap: 30,000 sats
- **Standard**: 3% → 0.50%, cap: 20,000 sats  
- **Economy**: 2% → 0.3125%, cap: 12,500 sats (uses batching)

### Transaction Modeling
- **P2WPKH**: 68 bytes per input, 31 bytes per output
- **Input Count**: Based on payment amount (see implementation)
- **Economy Tier**: Uses batched transactions (11 outputs, divided by 10)

### Network Adjustment
- **Base Multiplier**: Varies by tier and network conditions
- **Fee Percentage**: Exponential decay + network adjustment

## 📁 Files for Reference

1. **`BLINK_FEE_MODEL_SPECIFICATION.md`** - Complete technical specification
2. **`BLINK_FEE_IMPLEMENTATION_EXAMPLE.ts`** - Working TypeScript implementation
3. **`client/src/components/FeeCalculator.tsx`** - Original source code

## 🚀 Quick Start

```typescript
// 1. Create calculator instance
const calculator = new BlinkFeeCalculator();

// 2. Update mempool data
await calculator.updateMempoolData();

// 3. Calculate fee
const result = calculator.calculateFee(1000000, 'fastestFee');
// Returns: { feeSats: number, feeBTC: number, transactionSize: number, ... }
```

## 🔗 External Dependencies

- **mempool.space API**: `https://mempool.space/api/v1/fees/recommended`
- **Refresh Rate**: Every 2 minutes recommended
- **Required Field**: `fastestFee` (satoshis per virtual byte)

## ⚠️ Important Notes

1. **Precision**: Use integer arithmetic for satoshis
2. **Rounding**: `Math.round()` for final fee calculation
3. **Validation**: Amount must be 10,000 - 100,000,000 sats
4. **Error Handling**: Implement fallback fee rates (e.g., 50 sat/vB)
5. **Economy Tier**: Special batching logic with 11 outputs

## 🧪 Testing

Compare your implementation with the live calculator at the same time to validate results. Account for slight differences due to real-time network data.

## 📞 Support

Refer to the specification document for detailed implementation guidance or contact the development team for questions. 