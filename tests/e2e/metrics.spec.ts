// E2E tests for the Details totals: they update after Open and survive a new popup

import type { Page } from '@playwright/test';
import { expect, test } from '@tests/e2e/fixtures';

/**
 * Finds the value next to a Details label.
 * @param page - The popup page.
 * @param label - The label, for example "Tabs opened".
 * @returns The locator of the value.
 */
function totalOf(page: Page, label: string): ReturnType<Page['locator']> {
  return page
    .locator('.metrics > div', { has: page.getByText(label, { exact: true }) })
    .locator('dd');
}

test.describe('Details totals', () => {
  test('update right after Open and stay for the next popup', async ({
    context,
    site,
    popup,
    countTabs,
  }) => {
    const page = await context.newPage();
    await popup(page);
    await page.getByText('Details', { exact: true }).click();
    await expect(totalOf(page, 'Tabs opened')).toHaveText('0');
    await expect(totalOf(page, 'Open since')).not.toHaveText('Unknown');

    await page.locator('#list').fill(`${site.url('a')}\n${site.url('b')}`);
    await page.getByRole('button', { name: 'Open 2 URLs' }).click();

    await expect(totalOf(page, 'Tabs opened')).toHaveText('2');
    await expect(totalOf(page, 'Success rate')).toHaveText('100%');
    await expect(totalOf(page, 'Errors')).toHaveText('0');
    await expect.poll(() => countTabs(site.origin)).toBe(2);

    const next = await context.newPage();
    await popup(next);
    await next.getByText('Details', { exact: true }).click();
    await expect(totalOf(next, 'Tabs opened')).toHaveText('2');
  });

  test('Refresh reads the totals that another popup wrote', async ({ context, site, popup }) => {
    const first = await context.newPage();
    await popup(first);
    await first.getByText('Details', { exact: true }).click();
    await expect(totalOf(first, 'Tabs opened')).toHaveText('0');

    const second = await context.newPage();
    await popup(second);
    await second.locator('#list').fill(site.url('c'));
    await second.getByRole('button', { name: 'Open 1 URL' }).click();
    await expect(second.getByRole('status')).toHaveText('Opened 1.');

    await first.bringToFront();
    await first.getByRole('button', { name: 'Refresh' }).click();
    await expect(totalOf(first, 'Tabs opened')).toHaveText('1');
  });
});
