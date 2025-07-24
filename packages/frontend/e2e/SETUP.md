# E2E Test Setup Requirements

## Node.js Version Requirement

**Important**: Playwright requires Node.js 18.19 or higher when using ESM modules.

Current Node version: 18.15.0 (below requirement)

To run E2E tests, you need to:

1. **Option 1: Update Node.js** (Recommended)
   ```bash
   # Using nvm
   nvm install 18.19
   nvm use 18.19
   
   # Or download from nodejs.org
   ```

2. **Option 2: Convert to CommonJS**
   - Remove `"type": "module"` from `packages/frontend/package.json`
   - Rename `playwright.config.js` imports to use `require()` instead of `import`
   - Update test files to use CommonJS syntax

## Running Tests After Setup

Once Node.js is updated:

```bash
# Install dependencies if not already done
pnpm install

# Run E2E tests
pnpm test:e2e

# Run in UI mode
pnpm test:e2e:ui
```

## Test Structure Created

- ✅ Playwright configuration (`playwright.config.js`)
- ✅ Test fixtures and utilities
- ✅ 5 comprehensive test suites:
  - Dashboard functionality (8 tests)
  - AI Assistant chat (7 tests)
  - Real-time data updates (5 tests)
  - Analytics page (8 tests)
  - Navigation and routing (8 tests)
- ✅ Helper functions for common operations
- ✅ Mock data utilities

Total: 36 E2E test cases covering all critical user flows