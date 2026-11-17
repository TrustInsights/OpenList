// E2E tests for keyboard-only use of every control, and the names that assistive technology reads

import { expect, test } from '@tests/e2e/fixtures';

test.describe('Keyboard only', () => {
  test('Tab, Enter, Space, and type-ahead reach and run every control with no pointer', async ({
    context,
    popup,
  }) => {
    const page = await context.newPage();
    await popup(page);
    await page.getByRole('button', { name: 'Not now' }).click();
    // A new URL keeps Open enabled: Tab skips a disabled Open ("All open").
    await page.locator('#list').fill('https://example.com/new');

    await page.locator('#list').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('From')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /^Open / })).toBeFocused();
    await page.keyboard.press('Tab');
    const copy = page.getByRole('button', { name: /^Copy \d+ as URL$/ });
    await expect(copy).toBeFocused();
    await page.keyboard.press('Tab');
    const format = page.getByLabel('Copy as');
    await expect(format).toBeFocused();

    await page.keyboard.press('M');
    await expect(format).toHaveValue('Markdown');
    await expect(format).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: /^Copy \d+ as Markdown$/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveText(/^Copied \d+ as Markdown\.$/);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const summary = page.getByText('Details', { exact: true });
    await expect(summary).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByText('Tabs opened')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Tabs opened')).toBeHidden();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByText('Tabs opened')).toBeVisible();
  });

  test('the list and the error box expose their names, roles, and links to assistive technology', async ({
    context,
    popup,
  }) => {
    const page = await context.newPage();
    await popup(page);

    await expect(page.getByRole('textbox', { name: 'URLs, one per line' })).toBeFocused();
    await expect(page.getByRole('status')).toBeAttached();
    await page.locator('#list').fill('');
    await page.getByRole('button', { name: /^Open / }).click();
    await expect(page.getByRole('alert')).toHaveText('Please enter some URLs or text to search.');
    await expect(page.locator('#list')).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await page.locator('#list').getAttribute('aria-describedby');
    expect(await page.locator(`#${describedBy}`).textContent()).toBe(
      'Please enter some URLs or text to search.'
    );
  });
});
