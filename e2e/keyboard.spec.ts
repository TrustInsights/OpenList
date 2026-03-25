import { test, expect } from './fixtures';

test.describe('Keyboard shortcuts', () => {
  test('Ctrl+Enter triggers URL opening', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);

    const textarea = page.locator('#list, textarea').first();
    await textarea.fill('https://example.com');

    const initialTabCount = context.pages().length;
    await textarea.press('Control+Enter');

    await page.waitForTimeout(2000);
    expect(context.pages().length).toBeGreaterThan(initialTabCount);
  });
});
