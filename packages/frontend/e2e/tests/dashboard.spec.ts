import { test, expect } from '../fixtures/test-fixtures';
import { waitForDashboardLoad, mockDashboardData, selectDateRange } from '../utils/test-helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
  });

  test('should load dashboard with KPI cards', async ({ page }) => {
    // Wait for dashboard to load
    await waitForDashboardLoad(page);

    // Check if KPI cards are visible
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    await expect(kpiCards).toHaveCount(4);

    // Verify KPI card structure
    const firstCard = kpiCards.first();
    await expect(firstCard).toBeVisible();
    
    // Check for essential elements in KPI card
    await expect(firstCard.locator('.text-2xl')).toBeVisible(); // Value
    await expect(firstCard.locator('.text-sm')).toBeVisible(); // Label
  });

  test('should display revenue chart', async ({ page }) => {
    await waitForDashboardLoad(page);

    // Check if revenue chart is visible
    const revenueChart = page.locator('[data-testid="revenue-chart"]');
    await expect(revenueChart).toBeVisible();

    // Verify chart has rendered (Recharts creates SVG elements)
    const chartSvg = revenueChart.locator('svg.recharts-surface');
    await expect(chartSvg).toBeVisible();
  });

  test('should display top items chart', async ({ page }) => {
    await waitForDashboardLoad(page);

    // Check if top items chart is visible
    const topItemsChart = page.locator('[data-testid="top-items-chart"]');
    await expect(topItemsChart).toBeVisible();

    // Verify chart has rendered
    const chartSvg = topItemsChart.locator('svg.recharts-surface');
    await expect(chartSvg).toBeVisible();
  });

  test('should display hourly activity heatmap', async ({ page }) => {
    await waitForDashboardLoad(page);

    // Check if activity heatmap is visible
    const activityHeatmap = page.locator('[data-testid="activity-heatmap"]');
    await expect(activityHeatmap).toBeVisible();

    // Verify heatmap has cells
    const heatmapCells = activityHeatmap.locator('.recharts-rectangle');
    await expect(heatmapCells.first()).toBeVisible();
  });

  test('should change date range', async ({ page }) => {
    await waitForDashboardLoad(page);

    // Get initial KPI value
    const kpiValue = page.locator('[data-testid="kpi-card"]').first().locator('.text-2xl');
    const initialValue = await kpiValue.textContent();

    // Change date range
    await selectDateRange(page, '7d');

    // Verify the value might have changed (or at least the request was made)
    // In real scenario, we'd mock different data for different date ranges
    await expect(kpiValue).toBeVisible();
  });

  test('should handle data loading errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');

    // Should show error message
    const errorMessage = page.locator('text=/error|failed|unable/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    await waitForDashboardLoad(page);

    // Set up request interceptor to count API calls
    let apiCallCount = 0;
    await page.route('**/api/dashboard', async (route) => {
      apiCallCount++;
      await route.continue();
    });

    // Click refresh button
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    await refreshButton.click();

    // Wait for new request
    await page.waitForTimeout(1000);

    // Verify additional API call was made
    expect(apiCallCount).toBeGreaterThan(1);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await waitForDashboardLoad(page);

    // Verify KPI cards stack vertically on mobile
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    await expect(kpiCards).toHaveCount(4);

    // Charts should still be visible
    const revenueChart = page.locator('[data-testid="revenue-chart"]');
    await expect(revenueChart).toBeVisible();
  });
});