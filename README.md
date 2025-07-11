# Blink Fee Calculator

A sophisticated web application for real-time Blink onchain send fee calculations, offering advanced network fee analysis and interactive visualization tools. This project includes comprehensive documentation for implementing the Blink fee model in Bitcoin wallets.

<img src="client/src/assets/blink-logo.png" alt="Blink Logo" width="250"/>

## Overview

The Blink Fee Calculator provides accurate fee estimates for Bitcoin transactions sent through the Blink platform. It uses real-time mempool data to calculate appropriate fees based on current network conditions and transaction characteristics. The project includes a complete fee model specification and implementation examples for Bitcoin wallet developers.

## Features

- **Real-time Fee Calculation**: Uses live mempool.space API data to calculate accurate Bitcoin transaction fees
- **Multiple Fee Tiers**: Choose between Priority, Standard, and Economy fee levels
- **Dynamic Transaction Sizing**: Calculates transaction size based on payment amount using P2WPKH modeling
- **Flexible Unit Display**: Toggle between BTC and satoshi display for both inputs and calculated fees
- **Simulation Mode**: Test fee calculations under different network congestion scenarios
- **Responsive Design**: Works on desktop and mobile devices
- **Interactive Sliders**: Use logarithmic sliders to input payment amounts and simulate network conditions
- **Developer Documentation**: Complete fee model specification and implementation examples

## Fee Model Documentation

For Bitcoin wallet developers implementing the Blink fee model:

- **[Fee Model Specification](BLINK_FEE_MODEL_SPECIFICATION.md)** - Complete technical specification with all formulas and constants
- **[Implementation Example](BLINK_FEE_IMPLEMENTATION_EXAMPLE.ts)** - Working TypeScript implementation
- **[Quick Start Guide](FEE_MODEL_SUMMARY.md)** - Overview for getting started

### Core Fee Formula

```
BlinkFee = (PaymentAmount × FeePercentage) + (PaymentCostToBank × BaseMultiplier)
```

### Fee Tiers

- **Priority**: 4.0% → 0.75% (capped at 30,000 sats)
- **Standard**: 3.0% → 0.50% (capped at 20,000 sats)
- **Economy**: 2.0% → 0.3125% (capped at 12,500 sats) - uses batched transactions

All tiers use exponential decay to ensure fairness across different payment amounts, with adjustments based on current network conditions.

## Technical Details

### Fee Calculation Model

The Blink fee calculator uses a sophisticated model that takes into account:

- **Payment Amount**: Affects both the percentage fee and the number of inputs needed
- **Network Congestion**: Uses current mempool fee rates to adjust calculations
- **Transaction Size**: Dynamically calculated based on P2WPKH inputs (68 bytes) and outputs (31 bytes)
- **Fee Tiers**: Different formulas for each fee preference (Priority, Standard, Economy)
- **Input Estimation**: Based on payment amount ranges

### Transaction Modeling

- **P2WPKH**: 68 bytes per input, 31 bytes per output
- **Base Size**: 11 bytes for transaction overhead
- **Input Count**: Estimated based on payment amount ranges
- **Economy Tier**: Uses batched transactions with 11 outputs, cost divided by 10

### Required External Data

- **Mempool Fee Data**: `https://mempool.space/api/v1/fees/recommended`
- **Required Field**: `fastestFee` (satoshis per virtual byte)
- **Refresh Rate**: Every 2 minutes recommended

## Project Structure

```
BlinkFeeCalculator/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/        # shadcn/ui components (50+ components)
│   │   │   ├── FeeCalculator.tsx  # Main fee calculation logic
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ...
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useMempoolData.ts    # Bitcoin mempool data
│   │   │   ├── useBitcoinPrice.ts   # BTC price from Blink API
│   │   │   └── ...
│   │   ├── pages/         # Route components
│   │   │   ├── Home.tsx   # Main calculator page
│   │   │   ├── Docs.tsx   # Documentation
│   │   │   └── About.tsx  # About page
│   │   └── lib/           # Utilities and configurations
│   └── index.html
├── server/                # Express.js backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API endpoints
│   └── storage.ts        # Database configuration
├── shared/               # Shared types and schemas
│   └── schema.ts         # Zod schemas and database models
├── BLINK_FEE_MODEL_SPECIFICATION.md      # Complete fee model specification
├── BLINK_FEE_IMPLEMENTATION_EXAMPLE.ts   # TypeScript implementation
├── FEE_MODEL_SUMMARY.md                  # Quick start guide
└── Configuration files (vite.config.ts, package.json, etc.)
```

## Technologies Used

- **Frontend**: React 18 with TypeScript
- **Styling**: TailwindCSS + shadcn/ui component library
- **State Management**: React hooks for local state, TanStack Query for server state
- **API Fetching**: TanStack Query (React Query) for data fetching and caching
- **Routing**: Wouter for client-side routing
- **Server**: Express.js with TypeScript
- **Build System**: Vite for fast development and optimized builds
- **Database**: Drizzle ORM with PostgreSQL (configured)
- **Validation**: Zod for schema validation

## Development

To run the project locally:

1. Clone the repository
   ```bash
   git clone https://github.com/pretyflaco/BlinkFeeCalculator.git
   cd BlinkFeeCalculator
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5000`

## API Endpoints

- `GET /api/fees/recommended` - Get mempool fee data
- `POST /api/calculate-fee` - Calculate transaction fee (basic endpoint)

## Data Sources

- **Fee Rates**: [mempool.space API](https://mempool.space/api) for real-time Bitcoin network fee rates
- **Bitcoin Price**: Blink GraphQL API for current BTC/USD price data

## Implementation for Bitcoin Wallets

For developers implementing the Blink fee model in Bitcoin wallets:

1. **Read the Specification**: Start with `BLINK_FEE_MODEL_SPECIFICATION.md`
2. **Use the Example**: Reference `BLINK_FEE_IMPLEMENTATION_EXAMPLE.ts`
3. **Quick Start**: Follow `FEE_MODEL_SUMMARY.md`
4. **Validate**: Compare with the live calculator at the same time

### Key Implementation Notes

- **Precision**: Use integer arithmetic for satoshis
- **Rounding**: Use `Math.round()` for final fee calculation
- **Validation**: Ensure payment amount is 10,000 - 100,000,000 sats
- **Error Handling**: Implement fallback fee rates (e.g., 50 sat/vB default)
- **Economy Tier**: Special batching logic with 11 outputs

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

For questions about the fee model implementation, refer to the documentation files or contact the development team.