import { test, expect } from '../fixtures/test-fixtures';

test.describe('Navigation', () => {
  test('should navigate between all main pages', async ({ page }) => {
    await page.goto('/');

    // Test navigation menu is visible
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();

    // Define routes to test
    const routes = [
      { path: '/', title: 'Dashboard', testId: 'dashboard-page' },
      { path: '/analytics', title: 'Analytics', testId: 'analytics-page' },
      { path: '/ai', title: 'AI Assistant', testId: 'ai-page' },
      { path: '/events', title: 'Events', testId: 'events-page' },
      { path: '/customers', title: 'Customers', testId: 'customers-page' },
      { path: '/activity', title: 'Activity', testId: 'activity-page' },
      { path: '/settings', title: 'Settings', testId: 'settings-page' },
    ];

    // Test each route
    for (const route of routes) {
      // Click nav link
      const navLink = page.locator(`a[href="${route.path}"], [data-testid="nav-${route.title.toLowerCase()}"]`);
      
      if (await navLink.isVisible()) {
        await navLink.click();
        
        // Wait for navigation
        await page.waitForURL(`**${route.path}`);
        
        // Verify we're on the correct page
        expect(page.url()).toContain(route.path);
        
        // Check for page-specific content
        const pageContent = page.locator(`[data-testid="${route.testId}"], h1:has-text("${route.title}")`);
        await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/analytics');

    // Find the analytics nav item
    const analyticsNav = page.locator('a[href="/analytics"]');
    
    // Check if it has active styling (common patterns)
    const hasActiveClass = await analyticsNav.evaluate((el) => {
      const classList = Array.from(el.classList);
      return classList.some(cls => 
        cls.includes('active') || 
        cls.includes('current') || 
        cls.includes('selected')
      );
    });

    expect(hasActiveClass).toBeTruthy();
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to AI page
    await page.goto('/ai');
    
    // Verify page loaded
    const chatContainer = page.locator('[data-testid="chat-container"]');
    await expect(chatContainer).toBeVisible();

    // Navigate directly to customers
    await page.goto('/customers');
    
    // Verify page loaded
    const customersPage = page.locator('[data-testid="customers-page"], h1:has-text("Customers")');
    await expect(customersPage.first()).toBeVisible();
  });

  test('should handle 404 pages', async ({ page }) => {
    // Navigate to non-existent route
    await page.goto('/non-existent-route');

    // Should show 404 message or redirect to home
    const notFoundMessage = page.locator('text=/404|not found|page not found/i');
    const dashboard = page.locator('[data-testid="dashboard-page"]');
    
    // Either show 404 or redirect to dashboard
    await expect(notFoundMessage.or(dashboard).first()).toBeVisible({ timeout: 10000 });
  });

  test('should maintain scroll position on navigation', async ({ page }) => {
    await page.goto('/');
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    
    // Navigate to another page
    await page.click('a[href="/analytics"]');
    await page.waitForURL('**/analytics');
    
    // Should be at top of new page
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(100);
  });

  test('should work with browser back/forward buttons', async ({ page }) => {
    // Start at dashboard
    await page.goto('/');
    
    // Navigate to analytics
    await page.click('a[href="/analytics"]');
    await page.waitForURL('**/analytics');
    
    // Navigate to AI
    await page.click('a[href="/ai"]');
    await page.waitForURL('**/ai');
    
    // Go back
    await page.goBack();
    expect(page.url()).toContain('/analytics');
    
    // Go back again
    await page.goBack();
    expect(page.url()).toMatch(/\/$/); // Dashboard
    
    // Go forward
    await page.goForward();
    expect(page.url()).toContain('/analytics');
  });

  test('should show loading states during navigation', async ({ page }) => {
    // Set up slow route responses
    await page.route('**/api/**', async (route) => {
      await page.waitForTimeout(1000); // Simulate delay
      await route.continue();
    });

    await page.goto('/');
    
    // Click to navigate
    const analyticsLink = page.locator('a[href="/analytics"]');
    await analyticsLink.click();
    
    // Should show some loading indicator
    const loadingIndicator = page.locator('.animate-pulse, [role="progressbar"], [data-testid="loading"]');
    await expect(loadingIndicator.first()).toBeVisible();
  });

  test('mobile navigation menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');

    // Look for mobile menu button
    const menuButton = page.locator('[data-testid="mobile-menu-button"], button[aria-label*="menu"]');
    
    if (await menuButton.isVisible()) {
      // Open mobile menu
      await menuButton.click();
      
      // Menu should be visible
      const mobileMenu = page.locator('[data-testid="mobile-menu"], nav');
      await expect(mobileMenu).toBeVisible();
      
      // Click a link
      const aiLink = page.locator('a[href="/ai"]');
      await aiLink.click();
      
      // Menu should close after navigation
      await expect(mobileMenu).not.toBeVisible();
      
      // Should be on AI page
      expect(page.url()).toContain('/ai');
    }
  });
});