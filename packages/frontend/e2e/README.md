# E2E Tests for VenueSync Frontend

This directory contains end-to-end tests for the VenueSync frontend application using Playwright.

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests in UI mode (recommended for development)
pnpm test:e2e:ui

# Debug tests
pnpm test:e2e:debug

# View test report
pnpm test:e2e:report
```

## Test Structure

```
e2e/
├── fixtures/       # Test fixtures and custom test setup
├── tests/          # Test files
│   ├── dashboard.spec.ts      # Dashboard functionality tests
│   ├── ai-assistant.spec.ts   # AI chat interface tests
│   ├── real-time-updates.spec.ts  # Real-time data update tests
│   ├── analytics.spec.ts      # Analytics page tests
│   └── navigation.spec.ts     # Navigation and routing tests
└── utils/          # Helper functions and utilities
```

## Test Coverage

### Critical User Flows (High Priority)
1. **Dashboard Data Loading** - Verify KPIs, charts, and data visualization
2. **AI Assistant Chat** - Test chat functionality and AI responses
3. **Real-time Updates** - Ensure data refreshes and notifications work
4. **Analytics** - Test filtering, charting, and data export

### Navigation and UX (Medium Priority)
5. **Page Navigation** - Test all routes and navigation menu
6. **Responsive Design** - Verify mobile and tablet layouts
7. **Error Handling** - Test error states and recovery

## Writing New Tests

1. Create test files in `e2e/tests/` with `.spec.ts` extension
2. Use the custom test fixtures from `e2e/fixtures/test-fixtures.ts`
3. Utilize helper functions from `e2e/utils/test-helpers.ts`
4. Follow the pattern of existing tests

Example test structure:
```typescript
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Mock API responses** for consistent test results
3. **Test both success and error scenarios**
4. **Keep tests independent** - each test should run in isolation
5. **Use meaningful test descriptions**
6. **Wait for elements properly** using Playwright's built-in waiting strategies

## CI/CD Integration

Tests are configured to run in CI with:
- Parallel execution disabled for stability
- 2 retries on failure
- HTML report generation
- Screenshot capture on failure

## Debugging Failed Tests

1. Run specific test file: `pnpm playwright test dashboard.spec.ts`
2. Use UI mode to see test execution: `pnpm test:e2e:ui`
3. Debug mode for step-by-step execution: `pnpm test:e2e:debug`
4. Check screenshots in test results
5. View traces for failed tests in the HTML report