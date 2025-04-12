# Blink Fee Calculator

A sophisticated web application for real-time Blink onchain send fee calculations, offering advanced network fee analysis and interactive visualization tools.

<img src="client/src/assets/blink-logo.png" alt="Blink Logo" width="250"/>

## Overview

The Blink Fee Calculator provides accurate fee estimates for Bitcoin transactions sent through the Blink platform. It uses real-time mempool data to calculate appropriate fees based on current network conditions and transaction characteristics.

## Features

- **Real-time Fee Calculation**: Uses live mempool.space API data to calculate accurate Bitcoin transaction fees
- **Multiple Fee Tiers**: Choose between Priority, Standard, and Economy fee levels
- **Dynamic Transaction Sizing**: Calculates transaction size based on payment amount
- **Flexible Unit Display**: Toggle between BTC and satoshi display for both inputs and calculated fees
- **Simulation Mode**: Test fee calculations under different network congestion scenarios
- **Responsive Design**: Works on desktop and mobile devices
- **Interactive Sliders**: Use logarithmic sliders to input payment amounts and simulate network conditions

## Technical Details

### Fee Calculation Model

The Blink fee calculator uses a sophisticated model that takes into account:

- **Payment Amount**: Affects both the percentage fee and the number of inputs needed
- **Network Congestion**: Uses current mempool fee rates to adjust calculations
- **Transaction Size**: Dynamically calculated based on the number of inputs and outputs
- **Fee Tiers**: Different formulas for each fee preference (Priority, Standard, Economy)

### Fee Tiers

- **Priority**: 4.0% → 0.75% (capped at 30,000 sats)
- **Standard**: 3.0% → 0.50% (capped at 20,000 sats)
- **Economy**: 2.0% → 0.3125% (capped at 12,500 sats)

All tiers use exponential decay to ensure fairness across different payment amounts, with adjustments based on current network conditions.

## Technologies Used

- **Frontend**: React with TypeScript
- **Styling**: TailwindCSS + shadcn/ui for UI components
- **State Management**: React hooks for local state
- **API Fetching**: TanStack Query (React Query) for data fetching and caching
- **Data Visualization**: Interactive components for fee simulation
- **Server**: Express.js for API endpoints

## Development

To run the project locally:

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`
4. Open your browser to `http://localhost:5000`

## Data Sources

- **Fee Rates**: [mempool.space API](https://mempool.space/api) for real-time Bitcoin network fee rates
- **Bitcoin Price**: Blink API for current BTC/USD price data

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.