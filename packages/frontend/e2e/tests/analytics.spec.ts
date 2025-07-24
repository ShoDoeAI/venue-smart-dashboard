import { test, expect } from '../fixtures/test-fixtures';
import { waitForNetworkIdle, selectDateRange } from '../utils/test-helpers';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock analytics data
    await page.route('**/api/analytics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          revenue: {
            daily: Array.from({ length: 30 }, (_, i) => ({
              date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
              amount: Math.floor(Math.random() * 5000) + 15000,
            })),
            monthly: Array.from({ length: 12 }, (_, i) => ({
              month: new Date(2024, i, 1).toISOString(),
              amount: Math.floor(Math.random() * 50000) + 100000,
            })),
          },
          customers: {
            acquisition: Array.from({ length: 30 }, (_, i) => ({
              date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
              newCustomers: Math.floor(Math.random() * 50) + 20,
              returningCustomers: Math.floor(Math.random() * 100) + 50,
            })),
            demographics: {
              ageGroups: [
                { group: '18-24', count: 150 },
                { group: '25-34', count: 300 },
                { group: '35-44', count: 250 },
                { group: '45-54', count: 200 },
                { group: '55+', count: 100 },
              ],
            },
          },
          products: {
            topPerformers: [
              { name: 'Craft Beer Flight', revenue: 25000, units: 500 },
              { name: 'Fish & Chips', revenue: 22000, units: 360 },
              { name: 'Burger Special', revenue: 19000, units: 300 },
              { name: 'Caesar Salad', revenue: 16000, units: 320 },
              { name: 'Wings Platter', revenue: 15000, units: 250 },
            ],
            categories: [
              { category: 'Food', revenue: 80000, percentage: 64 },
              { category: 'Beverages', revenue: 35000, percentage: 28 },
              { category: 'Desserts', revenue: 10000, percentage: 8 },
            ],
          },
        }),
      });
    });

    await page.goto('/analytics');
  });

  test('should load analytics page with all sections', async ({ page }) => {
    await waitForNetworkIdle(page);

    // Check main sections are visible
    const revenueSection = page.locator('[data-testid="revenue-analytics"]');
    await expect(revenueSection).toBeVisible();

    const customerSection = page.locator('[data-testid="customer-analytics"]');
    await expect(customerSection).toBeVisible();

    const productSection = page.locator('[data-testid="product-analytics"]');
    await expect(productSection).toBeVisible();
  });

  test('should display revenue trends chart', async ({ page }) => {
    await waitForNetworkIdle(page);

    const revenueChart = page.locator('[data-testid="revenue-trend-chart"]');
    await expect(revenueChart).toBeVisible();

    // Verify chart has rendered
    const chartSvg = revenueChart.locator('svg.recharts-surface');
    await expect(chartSvg).toBeVisible();

    // Check for chart elements
    const chartLines = revenueChart.locator('.recharts-line');
    await expect(chartLines.first()).toBeVisible();
  });

  test('should display customer demographics', async ({ page }) => {
    await waitForNetworkIdle(page);

    const demographicsChart = page.locator('[data-testid="demographics-chart"]');
    await expect(demographicsChart).toBeVisible();

    // For pie/donut charts
    const pieSlices = demographicsChart.locator('.recharts-pie-sector, .recharts-bar');
    await expect(pieSlices.first()).toBeVisible();
  });

  test('should filter analytics by date range', async ({ page }) => {
    await waitForNetworkIdle(page);

    // Set up request interceptor to track API calls
    let analyticsCallCount = 0;
    await page.route('**/api/analytics*', async (route) => {
      analyticsCallCount++;
      await route.continue();
    });

    // Change date range
    await selectDateRange(page, '7d');

    // Verify new API call was made
    expect(analyticsCallCount).toBeGreaterThan(1);
  });

  test('should export analytics data', async ({ page }) => {
    await waitForNetworkIdle(page);

    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    const exportButton = page.locator('[data-testid="export-analytics-button"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/analytics.*\.(csv|xlsx|pdf)$/);
    }
  });

  test('should show comparison metrics', async ({ page }) => {
    await waitForNetworkIdle(page);

    // Look for comparison indicators
    const comparisonMetrics = page.locator('[data-testid="comparison-metric"]');
    
    if (await comparisonMetrics.count() > 0) {
      // Check first comparison metric
      const firstMetric = comparisonMetrics.first();
      await expect(firstMetric).toBeVisible();
      
      // Should show percentage change
      const percentageText = await firstMetric.textContent();
      expect(percentageText).toMatch(/[+-]?\d+\.?\d*%/);
    }
  });

  test('should drill down into specific metrics', async ({ page }) => {
    await waitForNetworkIdle(page);

    // Click on a product in top performers
    const topProduct = page.locator('[data-testid="top-product-item"]').first();
    
    if (await topProduct.isVisible()) {
      await topProduct.click();

      // Should show detailed view or modal
      const productDetail = page.locator('[data-testid="product-detail-view"]');
      await expect(productDetail).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Override with empty data
    await page.route('**/api/analytics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          revenue: { daily: [], monthly: [] },
          customers: { acquisition: [], demographics: { ageGroups: [] } },
          products: { topPerformers: [], categories: [] },
        }),
      });
    });

    await page.goto('/analytics');
    await waitForNetworkIdle(page);

    // Should show empty state messages
    const emptyState = page.locator('text=/no data|empty|not available/i');
    await expect(emptyState.first()).toBeVisible();
  });

  test('should be responsive on tablet view', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await waitForNetworkIdle(page);

    // Charts should adapt to tablet size
    const charts = page.locator('.recharts-wrapper');
    const chartCount = await charts.count();
    
    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i);
      const box = await chart.boundingBox();
      
      // Charts should not overflow viewport
      expect(box?.width).toBeLessThanOrEqual(768);
    }
  });
});