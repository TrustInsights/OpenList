import { test, expect } from './fixtures';

test.describe('Dark mode', () => {
  test('popup adapts to dark color scheme', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);

    // Background should not be white in dark mode
    const bodyBg = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body);
      return style.backgroundColor;
    });

    // Light mode body is rgb(238, 238, 238), dark mode is rgb(32, 33, 36)
    expect(bodyBg).not.toBe('rgb(238, 238, 238)');
  });
});
