# VenueSync

Unified venue operations platform aggregating data from 7 service APIs with AI-powered insights via Claude.

## Overview

VenueSync provides real-time visibility into all aspects of venue operations by:
- Aggregating data from Eventbrite, Toast POS, WISK, Resy, Audience Republic, Meta Business Suite, and OpenTable
- Calculating key performance indicators and generating alerts
- Providing natural language insights through Claude AI integration
- Enabling action execution across platforms with confirmation

## Tech Stack

- **TypeScript** (strict mode)
- **React + Vite** (frontend)
- **Vercel Functions** (backend)
- **Supabase** (PostgreSQL database)
- **Claude API** (AI insights)
- **pnpm** (package manager)

## Project Structure

```
venue-smart-dashboard/
├── packages/
│   ├── shared/      # Shared types and utilities
│   ├── backend/     # Vercel Functions
│   └── frontend/    # React application
├── docs/
│   ├── prd.md      # Product Requirements
│   └── schema.md   # Database schema
├── CLAUDE.md       # AI assistant instructions
└── tasks.md        # Development tasks
```

## Getting Started

### Prerequisites

- Node.js 20+ (use nvm: `nvm use`)
- pnpm 8+ (`curl -fsSL https://get.pnpm.io/install.sh | sh -`)
- Supabase account
- API keys for integrated services

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ShoDoeAI/venue-smart-dashboard.git
cd venue-smart-dashboard
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env.local` file with actual API keys:
   - Copy Supabase credentials from `.env.txt` or your Supabase dashboard
   - Add Toast API credentials (optional - test endpoint works without them)
   - Add other API keys as needed

### Development

Run all packages in development mode:
```bash
pnpm dev
```

This will start:
- Frontend at http://localhost:3000 (Data Viewer UI)
- Backend at http://localhost:3001 (Vercel Functions)

Run specific package:
```bash
# Backend only
pnpm --filter @venuesync/backend dev

# Frontend only
pnpm --filter @venuesync/frontend dev
```

### Testing the Integration

1. Open http://localhost:3000 in your browser
2. Click "Fetch Toast Data" to test the integration
3. View transactions, snapshots, and daily summaries in the tabs
4. The API endpoint http://localhost:3001/api/test-toast returns mock data if Toast credentials are not configured

### Testing

Run all tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

Test Toast data flow:
```bash
pnpm --filter @venuesync/backend test:square-flow
```

### Building

Build all packages:
```bash
pnpm build
```

### Code Quality

Run linting:
```bash
pnpm lint
```

Format code:
```bash
pnpm format
```

Type checking:
```bash
pnpm typecheck
```

## Documentation

- [Product Requirements](docs/prd.md)
- [Database Schema](docs/schema.md)
- [Development Tasks](tasks.md)

## Contributing

1. Create a feature branch
2. Make your changes with tests
3. Ensure all checks pass
4. Create a PR and wait for CodeRabbit review
5. Address feedback before merging

## License

MIT