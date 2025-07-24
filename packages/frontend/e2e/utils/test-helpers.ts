import { Page } from '@playwright/test';

/**
 * Wait for the dashboard to be fully loaded
 */
export async function waitForDashboardLoad(page: Page) {
  // Wait for KPI cards to be visible
  await page.waitForSelector('[data-testid="kpi-card"]', { timeout: 30000 });
  // Wait for at least one chart to be visible
  await page.waitForSelector('.recharts-wrapper', { timeout: 30000 });
}

/**
 * Mock API responses for testing
 */
export async function mockDashboardData(page: Page) {
  await page.route('**/api/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        snapshot: {
          timestamp: new Date().toISOString(),
          kpis: {
            totalRevenue: 125000,
            revenueGrowth: 12.5,
            totalOrders: 450,
            ordersGrowth: 8.3,
            avgOrderValue: 278,
            aovGrowth: 3.8,
            totalCustomers: 1250,
            customersGrowth: 15.2,
          },
          revenueByDay: [
            { date: '2024-01-18', revenue: 18500 },
            { date: '2024-01-19', revenue: 21000 },
            { date: '2024-01-20', revenue: 19500 },
            { date: '2024-01-21', revenue: 17500 },
            { date: '2024-01-22', revenue: 22000 },
            { date: '2024-01-23', revenue: 26500 },
          ],
          topItems: [
            { name: 'Craft Beer Flight', revenue: 12500, quantity: 250 },
            { name: 'Fish & Chips', revenue: 11000, quantity: 180 },
            { name: 'Burger Special', revenue: 9500, quantity: 150 },
            { name: 'Caesar Salad', revenue: 8000, quantity: 160 },
            { name: 'Wings Platter', revenue: 7500, quantity: 125 },
          ],
          hourlyActivity: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            orders: Math.floor(Math.random() * 50) + 10,
            revenue: Math.floor(Math.random() * 5000) + 1000,
          })),
        },
      }),
    });
  });
}

/**
 * Mock AI chat responses
 */
export async function mockAIChatResponse(page: Page, response: string) {
  await page.route('**/api/chat', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response,
          actions: [],
        }),
      });
    }
  });
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Select date range
 */
export async function selectDateRange(page: Page, range: 'today' | '7d' | '30d' | '90d') {
  await page.click('[data-testid="date-range-selector"]');
  await page.click(`[data-testid="date-range-${range}"]`);
  await waitForNetworkIdle(page);
}