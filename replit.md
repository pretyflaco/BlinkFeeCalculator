# Blink Fee Calculator

## Overview

The Blink Fee Calculator is a web application that provides real-time Bitcoin transaction fee estimates for the Blink platform's onchain transactions. It implements a sophisticated fee calculation model that considers payment amounts, network conditions (via mempool.space API), and user-selected priority levels (Priority, Standard, Economy). The calculator uses P2WPKH transaction modeling to estimate transaction sizes and applies dynamic fee percentages with network-based adjustments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: Radix UI primitives with custom styling via Tailwind CSS
- **Styling**: Tailwind CSS with CSS custom properties for theming (shadcn/ui design system)
- **Component Structure**: 
  - Page components (`Home`, `Docs`, `About`) for main routes
  - Feature components (`FeeCalculator`, `Documentation`) for core functionality
  - Shared UI components library under `client/src/components/ui/`

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints for fee data and calculations
- **Development Server**: Vite integration for HMR (Hot Module Replacement) in development
- **Proxy Pattern**: Backend proxies requests to mempool.space API to avoid CORS issues
- **Error Handling**: Centralized error middleware with structured error responses

### Fee Calculation Engine
- **Core Algorithm**: Implements the formula `BlinkFee = (PaymentAmount × FeePercentage) + (PaymentCostToBank × BaseMultiplier)`
- **Transaction Modeling**: Uses P2WPKH (Pay-to-Witness-Public-Key-Hash) standards
  - Base transaction size: 11 bytes
  - Input size: 68 bytes per input
  - Output size: 31 bytes per output
- **Dynamic Input Calculation**: Determines number of inputs based on payment amount ranges
- **Fee Tiers**:
  - Priority: 4% → 0.75% with 30,000 sat cap
  - Standard: 3% → 0.50% with 20,000 sat cap
  - Economy: 2% → 0.3125% with 12,500 sat cap (uses batched transactions)
- **Network Adjustment**: Base multipliers vary by tier and current network fee rates

### Data Storage
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts` for type-safe database schemas
- **In-Memory Fallback**: `MemStorage` class provides temporary storage for development
- **Database Configuration**: Connection via `DATABASE_URL` environment variable

### Type Safety & Validation
- **Schema Validation**: Zod schemas for runtime type checking
- **Shared Types**: Common types and schemas in `shared/` directory accessible to both client and server
- **API Response Validation**: mempool.space API responses validated against `mempoolFeeSchema`

## External Dependencies

### Third-Party APIs
- **mempool.space API** (`https://mempool.space/api/v1/fees/recommended`)
  - Purpose: Real-time Bitcoin network fee recommendations
  - Data: Fastest fee, half-hour fee, hour fee, economy fee, minimum fee
  - Fallback: Hardcoded default values if API fails
  - Integration: Server-side proxy endpoint at `/api/fees/recommended`

- **Blink GraphQL API** (`https://api.blink.sv/graphql`)
  - Purpose: Bitcoin price data for USD conversions
  - Query: `btcPriceList` with price history
  - Data format: Base/offset price representation in USDCENT

### Database
- **PostgreSQL** via Neon Database serverless driver (`@neondatabase/serverless`)
- **Schema Management**: Drizzle Kit for migrations
- **Current Usage**: Minimal - includes basic user table structure for future authentication

### External Services & Libraries
- **UI Component Libraries**:
  - Radix UI for accessible, unstyled primitives
  - Tailwind CSS for utility-first styling
  - shadcn/ui design system theme plugin
  
- **Development Tools**:
  - Replit-specific plugins for runtime error overlay and cartographer
  - ESBuild for production server bundling
  - PostCSS with Autoprefixer for CSS processing

### API Key Management
- **Local Storage**: Client-side storage for optional API keys (mempool.space, price APIs)
- **Obfuscation**: Basic base64 encoding (not cryptographic security)
- **Optional Enhancement**: Supports higher rate limits when API keys are provided