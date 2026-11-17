// E2E tests for keyboard use: Cmd+Enter, the focus on open, and the format control

import { expect, test } from '@tests/e2e/fixtures';

test.describe('Keyboard shortcuts', () => {
  // Control+Enter is covered in open.spec.ts.
  test('Meta+Enter opens the URLs of the list', async ({ context, site, popup, countTabs }) => {
    const page = await context.newPage();
    await popup(page);

    const textarea = page.locator('#list');
    await textarea.fill(site.url('a'));
    await textarea.press('Meta+Enter');

    await expect(page.getByRole('status')).toHaveText('Opened 1.');
    await expect.poll(() => countTabs(site.origin)).toBe(1);
  });

  test('a plain Enter adds a line and opens nothing', async ({
    context,
    site,
    popup,
    countTabs,
  }) => {
    const page = await context.newPage();
    await popup(page);

    const textarea = page.locator('#list');
    await textarea.fill(site.url('a'));
    await textarea.press('Enter');

    await expect(textarea).toHaveValue(`${site.url('a')}\n`);
    await expect(page.getByRole('status')).toBeEmpty();
    expect(await countTabs(site.origin)).toBe(0);
  });

  test('changing the format keeps focus on the control and starts no action', async ({
    context,
    popup,
  }) => {
    const page = await context.newPage();
    await popup(page);

    const format = page.getByLabel('Copy as');
    await format.focus();
    // On macOS an arrow key only opens the native menu, so the choice is set directly.
    await format.selectOption('Title');

    await expect(format).toHaveValue('Title');
    await expect(format).toBeFocused();
    await expect(page.getByRole('button', { name: /^Copy \d+ as Title$/ })).toBeVisible();
    await expect(page.getByRole('status')).toBeEmpty();
  });
});
