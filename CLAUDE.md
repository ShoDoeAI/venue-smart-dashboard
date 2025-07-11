# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VenueSync - Unified venue operations platform aggregating data from 7 service APIs (Eventbrite, Square POS, WISK, Resy, Audience Republic, Meta Business Suite, OpenTable) with AI-powered insights via Claude.

## Technology Stack

- **TypeScript** (strict mode)
- **React + Vite** 
- **Vercel Functions** (backend)
- **Supabase** (PostgreSQL)
- **pnpm** workspaces
- **Vitest** + React Testing Library
- **Tailwind CSS**
- **Zod** (validation)

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev             # Run development servers
pnpm build           # Build for production
pnpm test            # Run tests
pnpm test:watch      # Run tests in watch mode
pnpm typecheck       # Type checking
pnpm lint            # Linting
```

## React Development Rules

- **Data-first UIs**: Treat UIs as a thin layer over data. Skip local state (useState) unless absolutely needed and clearly separate from business logic. Use variables and useRef if it doesn't need to be reactive.

- **Component extraction**: When you find nested if/else or complex conditional rendering, create a new component. Reserve inline ternaries for tiny, readable sections.

- **Derive, don't effect**: Derive data rather than use useEffect. Only use useEffect to synchronize with external systems (e.g. document-level events). Avoid implicit reactive behavior.

- **setTimeout as last resort**: Always comment why it's necessary when used.

- **Minimal comments**: Only add comments for race conditions, long-term TODOs, or genuinely confusing code that would puzzle senior engineers.

## Architecture

### Monorepo Structure
- `packages/shared/` - Types, Zod schemas, utilities
- `packages/backend/` - Vercel Functions (`/api` directory)
- `packages/frontend/` - React + Vite app

### Data Flow
1. Vercel Cron fetches from 7 APIs every 3 minutes
2. Zod validates responses
3. Supabase stores complete snapshots with KPIs
4. Frontend subscribes to real-time updates
5. Claude provides insights via chat API
6. Actions execute with user confirmation

### Key Backend Endpoints
- `/api/cron/fetch-data.ts` - 3-minute data aggregation
- `/api/chat.ts` - Claude integration
- `/api/execute.ts` - Action execution
- `/api/dashboard.ts` - Aggregated data

## Available MCP Servers

- **mcp__sequential-thinking__sequentialthinking** - Step-by-step problem solving
- **mcp__context7__resolve-library-id** - Resolve package names to library IDs
- **mcp__context7__get-library-docs** - Fetch library documentation
- **mcp__github__*** - GitHub operations (create/update files, PRs, issues, etc.)

## Implementation Guidelines

- All API responses validated with Zod before storage
- Handle API failures gracefully, return partial data
- Never delete historical snapshots (needed for trends)
- Store rollback info for every action
- All secrets in Vercel environment variables
- Mock external APIs in tests using MSW