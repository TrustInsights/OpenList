// E2E tests for Open: tab counts, the skip of open URLs, and the cap of 20 tabs per click

import type { Page } from '@playwright/test';
import { expect, test } from '@tests/e2e/fixtures';

/**
 * Selects the Open button.
 * @param page - The popup page.
 * @returns The locator of the button.
 */
function openButton(page: Page): ReturnType<Page['getByRole']> {
  return page.getByRole('button', { name: /^Open / });
}

test.describe('Open', () => {
  test('Ctrl+Enter opens three pasted URLs, and a second paste is skipped as already open', async ({
    context,
    site,
    popup,
    countTabs,
  }) => {
    const page = await context.newPage();
    await popup(page);
    const urls = ['a', 'b', 'c'].map((name) => site.url(name, 'n=1'));

    await page.locator('#list').fill(urls.join('\n'));
    await expect(openButton(page)).toHaveText('Open 3 URLs');
    await page.locator('#list').press('Control+Enter');
    await expect(page.getByRole('status')).toHaveText('Opened 3.');
    await expect.poll(() => countTabs(site.origin)).toBe(3);
    await expect(page.locator('#list')).toHaveValue('');

    await page.locator('#list').fill(urls.join('\n'));
    await page.bringToFront();
    await openButton(page).click();
    await expect(page.getByRole('status')).toHaveText('All 3 URLs are already open.');
    expect(await countTabs(site.origin)).toBe(3);
  });

  test('45 URLs open 20 at a time, and the label follows the rest', async ({
    context,
    site,
    popup,
    countTabs,
  }) => {
    const page = await context.newPage();
    await popup(page);
    const urls = Array.from({ length: 45 }, (_, index) => site.url('a', `n=${index + 1}`));

    await page.locator('#list').fill(urls.join('\n'));
    await expect(openButton(page)).toHaveText('Open first 20 of 45');

    await page.bringToFront();
    await openButton(page).click();
    await expect(openButton(page)).toHaveText('Open next 20 of 25');
    await expect.poll(() => countTabs(site.origin)).toBe(20);

    await page.bringToFront();
    await openButton(page).click();
    await expect(openButton(page)).toHaveText('Open 5 URLs');
    await expect.poll(() => countTabs(site.origin)).toBe(40);

    await page.bringToFront();
    await openButton(page).click();
    await expect(page.getByRole('status')).toHaveText('Opened 5.');
    await expect.poll(() => countTabs(site.origin)).toBe(45);
    await expect(page.locator('#list')).toHaveValue('');
  });

  test('Open leaves http as typed for local addresses', async ({
    context,
    site,
    popup,
    countTabs,
  }) => {
    const page = await context.newPage();
    await popup(page);
    const port = new URL(site.origin).port;
    const localhost = `http://localhost:${port}/b.html`;

    await page.locator('#list').fill(`${site.url('a')}\n${localhost}`);
    await page.locator('#list').press('Control+Enter');
    await expect(page.getByRole('status')).toHaveText('Opened 2.');

    await expect.poll(() => countTabs(site.url('a'))).toBe(1);
    await expect.poll(() => countTabs(localhost)).toBe(1);
    expect(await countTabs(`https://127.0.0.1:${port}`)).toBe(0);
    expect(await countTabs(`https://localhost:${port}`)).toBe(0);
  });

  test('Open upgrades http to https for a website', async ({ context, popup, countTabs }) => {
    const page = await context.newPage();
    await popup(page);

    await page.locator('#list').fill('http://openlist-upgrade.example/a');
    await page.locator('#list').press('Control+Enter');
    await expect(page.getByRole('status')).toHaveText('Opened 1.');

    await expect.poll(() => countTabs('https://openlist-upgrade.example/a')).toBe(1);
    expect(await countTabs('http://openlist-upgrade.example')).toBe(0);
  });

  test('an empty list shows the alert, and typing removes it', async ({ context, popup }) => {
    const page = await context.newPage();
    await popup(page);

    await page.locator('#list').fill('');
    await openButton(page).click();
    await expect(page.getByRole('alert')).toHaveText('Please enter some URLs or text to search.');
    await expect(page.locator('#list')).toHaveAttribute('aria-invalid', 'true');

    await page.locator('#list').fill('example.com');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
