import { test, expect } from '../fixtures/test-fixtures';
import { mockAIChatResponse, waitForNetworkIdle } from '../utils/test-helpers';

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai');
  });

  test('should load AI chat interface', async ({ page }) => {
    // Check if chat container is visible
    const chatContainer = page.locator('[data-testid="chat-container"]');
    await expect(chatContainer).toBeVisible();

    // Check for message input
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible();

    // Check for send button
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeVisible();
  });

  test('should send a message and receive response', async ({ page }) => {
    // Mock AI response
    await mockAIChatResponse(page, 'Based on the data, your revenue has increased by 15% this week.');

    // Type a message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('How is our revenue performing this week?');

    // Send the message
    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Wait for response
    await waitForNetworkIdle(page);

    // Check if user message appears
    const userMessage = page.locator('text=How is our revenue performing this week?');
    await expect(userMessage).toBeVisible();

    // Check if AI response appears
    const aiResponse = page.locator('text=Based on the data, your revenue has increased by 15% this week.');
    await expect(aiResponse).toBeVisible();
  });

  test('should use template prompts', async ({ page }) => {
    // Mock AI response
    await mockAIChatResponse(page, 'Here are your top performing items for today...');

    // Look for template buttons
    const templates = page.locator('[data-testid="template-button"]');
    
    // Click first template
    if (await templates.count() > 0) {
      await templates.first().click();
      
      // Message input should be filled
      const messageInput = page.locator('[data-testid="message-input"]');
      const inputValue = await messageInput.inputValue();
      expect(inputValue).toBeTruthy();
    }
  });

  test('should handle long conversations with scrolling', async ({ page }) => {
    // Send multiple messages
    for (let i = 0; i < 5; i++) {
      await mockAIChatResponse(page, `Response ${i + 1}: This is a test response.`);
      
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill(`Question ${i + 1}`);
      
      const sendButton = page.locator('[data-testid="send-button"]');
      await sendButton.click();
      
      await waitForNetworkIdle(page);
    }

    // Check if messages are visible
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(10); // 5 user + 5 AI messages

    // Verify scrolling works
    const chatContainer = page.locator('[data-testid="chat-messages"]');
    const isScrollable = await chatContainer.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(isScrollable).toBeTruthy();
  });

  test('should disable input while loading', async ({ page }) => {
    // Set up slow response
    await page.route('**/api/chat', async (route) => {
      await page.waitForTimeout(2000); // Simulate slow response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: 'Delayed response', actions: [] }),
      });
    });

    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Send message
    await messageInput.fill('Test message');
    await sendButton.click();

    // Check if input is disabled during loading
    await expect(messageInput).toBeDisabled();
    await expect(sendButton).toBeDisabled();

    // Wait for response
    await waitForNetworkIdle(page);

    // Input should be enabled again
    await expect(messageInput).toBeEnabled();
    await expect(sendButton).toBeEnabled();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Send a message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Test message');
    
    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Should show error message
    const errorMessage = page.locator('text=/error|failed|sorry/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should clear chat when clear button is clicked', async ({ page }) => {
    // Send a message first
    await mockAIChatResponse(page, 'Test response');
    
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Test message');
    
    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();
    
    await waitForNetworkIdle(page);

    // Verify messages exist
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(2);

    // Clear chat
    const clearButton = page.locator('[data-testid="clear-chat-button"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      
      // Confirm if there's a confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Messages should be cleared
      await expect(messages).toHaveCount(0);
    }
  });
});