import { test, expect } from './fixtures';

test.describe('Popup', () => {
  test('opens with textarea and button', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);

    await expect(page.locator('#list, textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: /open urls/i })).toBeVisible();
  });

  test('opens URLs when button is clicked', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);

    const textarea = page.locator('#list, textarea').first();
    await textarea.fill('https://example.com');

    const initialTabCount = context.pages().length;
    await page.getByRole('button', { name: /open urls/i }).click();

    // Wait a moment for tabs to open
    await page.waitForTimeout(2000);
    expect(context.pages().length).toBeGreaterThan(initialTabCount);
  });

  test('shows metrics section', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await expect(page.locator('#metrics')).toBeVisible();
  });
});
