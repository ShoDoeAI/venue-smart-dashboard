# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VenueSync - Unified venue operations platform aggregating data from 7 service APIs (Eventbrite, Toast POS, WISK, Resy, Audience Republic, Meta Business Suite, OpenTable) with AI-powered insights via Claude.

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

## Supabase Development

**IMPORTANT**: Always use Supabase CLI for database operations. Never create ad-hoc endpoints or direct SQL connections for schema changes.

### Supabase CLI Commands

```bash
npx supabase init          # Initialize Supabase project
npx supabase db pull       # Pull remote schema to local (requires Docker)
npx supabase db push       # Push local migrations to remote
npx supabase db reset      # Reset local database
npx supabase migration new <name>  # Create new migration
npx supabase db diff       # Show differences between local and remote
```

### Database Operations Guidelines

1. **Schema Changes**: Always create migrations in `/supabase/migrations/`
2. **Table Creation**: Use `npx supabase migration new <table_name>`
3. **Debugging**: Use `npx supabase db remote query` for read-only queries
4. **Never**: Create API endpoints just to run SQL commands
5. **Never**: Use direct PostgreSQL connections for schema modifications
6. **Always**: Test migrations locally before pushing to production

### When Docker is Required

Some Supabase CLI commands require Docker. If Docker is not available:

- Use Supabase Dashboard for urgent changes
- Document the changes in a migration file for later sync
- Never work around it by creating custom endpoints

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

- **mcp**sequential-thinking**sequentialthinking** - Step-by-step problem solving
- **mcp**context7**resolve-library-id** - Resolve package names to library IDs
- **mcp**context7**get-library-docs** - Fetch library documentation
- **mcp**github**\*** - GitHub operations (create/update files, PRs, issues, etc.)

## Code Review Process

### Pull Request Workflow

1. **Create feature branch** from main
2. **Implement changes** with tests
3. **Create PR** with descriptive title and body
4. **Wait for CodeRabbit review** - Automated AI code review
5. **Address CodeRabbit feedback** before requesting human review
6. **Merge after approvals**

### CodeRabbit Integration

This repository uses CodeRabbit for automated code reviews. When creating PRs:

- CodeRabbit will automatically review within minutes
- Check CodeRabbit's comments for:
  - Security vulnerabilities
  - Performance issues
  - Code quality suggestions
  - Best practice violations
- Address all critical issues before merging
- Use `@coderabbitai` in PR comments to ask questions

### PR Best Practices

- Keep PRs small and focused (< 400 lines when possible)
- Write descriptive PR titles: `feat: add Toast POS connector`
- Include test coverage for new features
- Update documentation alongside code changes
- Link related issues in PR description

## Implementation Guidelines

- All API responses validated with Zod before storage
- Handle API failures gracefully, return partial data
- Never delete historical snapshots (needed for trends)
- Store rollback info for every action
- All secrets in Vercel environment variables
- Mock external APIs in tests using MSW
- Every PR must pass CodeRabbit review before merge
