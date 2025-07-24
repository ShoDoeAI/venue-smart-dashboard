import { test as base } from '@playwright/test';

// Define custom fixtures
export const test = base.extend({
  // Add custom fixtures here if needed
  // For example, authenticated page, mock data, etc.
});

export { expect } from '@playwright/test';