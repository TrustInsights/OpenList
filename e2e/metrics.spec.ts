import { test, expect } from './fixtures';

test.describe('Metrics', () => {
  test('metrics display updates after opening URLs', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);

    const textarea = page.locator('#list, textarea').first();
    await textarea.fill('https://example.com');
    await page.getByRole('button', { name: /open urls/i }).click();

    // Wait for metrics to update (polling interval is 5s, but result triggers sooner)
    await page.waitForTimeout(3000);

    const metricsText = await page.locator('#metrics').textContent();
    expect(metricsText).toBeTruthy();
  });
});
