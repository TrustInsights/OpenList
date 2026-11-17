// E2E tests for Copy: the formats leave the popup as text on the real clipboard

import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@tests/e2e/fixtures';

/**
 * Lets the pages of the browser read and write the clipboard. Chrome refuses a grant for a
 * chrome-extension origin, so the grant has no origin.
 * @param context - The browser context.
 * @returns A promise that resolves when the permissions are set.
 */
async function allowClipboard(context: BrowserContext): Promise<void> {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
}

/**
 * Reads the clipboard text in a page.
 * @param page - Any page of the browser.
 * @returns The clipboard text.
 */
async function clipboardText(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

/**
 * Writes the line that the popup tab adds to every window list, because the test opens the popup as a tab.
 * @param extensionId - The id of the extension.
 * @param format - The line format, URL or Markdown.
 * @returns The line of the popup tab.
 */
function popupLine(extensionId: string, format: 'URL' | 'Markdown'): string {
  const url = `chrome-extension://${extensionId}/popup/index.html`;
  return format === 'URL' ? url : `- [OpenList](${url})`;
}

test.describe('Copy', () => {
  test('Markdown gives one linked line per tab, with the page title', async ({
    context,
    extensionId,
    site,
    popup,
    openPage,
  }) => {
    await allowClipboard(context);
    for (const name of ['a', 'b', 'c']) await openPage(name);
    const page = await context.newPage();
    await popup(page);

    await page.getByLabel('Copy as').selectOption('Markdown');
    await page.getByRole('button', { name: 'Copy 4 as Markdown' }).click();
    await expect(page.getByRole('status')).toHaveText('Copied 4 as Markdown.');

    expect((await clipboardText(page)).split('\n')).toEqual([
      ...['a', 'b', 'c'].map((name) => `- [${site.title(name)}](${site.url(name)})`),
      popupLine(extensionId, 'Markdown'),
    ]);
  });

  test('CSV gives the header and one row per tab', async ({ context, site, popup, openPage }) => {
    await allowClipboard(context);
    for (const name of ['a', 'b', 'c']) await openPage(name);
    const page = await context.newPage();
    await popup(page);

    await page.getByLabel('Copy as').selectOption('CSV');
    await page.getByRole('button', { name: 'Copy 4 as CSV' }).click();
    await expect(page.getByRole('status')).toHaveText('Copied 4 as CSV.');

    const lines = (await clipboardText(page)).split('\n');
    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe('title,url,window,index,pinned,active');
    ['a', 'b', 'c'].forEach((name, row) => {
      expect(lines[row + 1]).toMatch(
        new RegExp(`^"${site.title(name)}","${site.url(name)}",\\d+,${row + 1},false,false$`)
      );
    });
  });

  test('JSON gives an array of objects with the title and address of each tab', async ({
    context,
    extensionId,
    site,
    popup,
    openPage,
  }) => {
    await allowClipboard(context);
    for (const name of ['a', 'b', 'c']) await openPage(name);
    const page = await context.newPage();
    await popup(page);

    await page.getByLabel('Copy as').selectOption('JSON');
    await page.getByRole('button', { name: 'Copy 4 as JSON' }).click();
    await expect(page.getByRole('status')).toHaveText('Copied 4 as JSON.');

    const records: Array<Record<string, unknown>> = JSON.parse(await clipboardText(page));
    expect(records.map(({ title, url }) => ({ title, url }))).toEqual([
      ...['a', 'b', 'c'].map((name) => ({ title: site.title(name), url: site.url(name) })),
      { title: 'OpenList', url: popupLine(extensionId, 'URL') },
    ]);
    expect(records.every((record) => typeof record.windowId === 'number')).toBe(true);
  });

  test('All windows in URL format puts a blank line between windows', async ({
    context,
    extensionId,
    worker,
    site,
    openPage,
  }) => {
    await allowClipboard(context);
    for (const name of ['a', 'b', 'c']) await openPage(name);
    const first = await worker.evaluate(async () => (await chrome.windows.getLastFocused()).id);
    await worker.evaluate(async (url) => {
      await chrome.windows.create({ url, focused: false });
    }, site.url('d'));
    await expect
      .poll(() => worker.evaluate(async () => (await chrome.windows.getAll()).length))
      .toBe(2);
    const popupUrl = `chrome-extension://${extensionId}/popup/index.html`;
    await worker.evaluate(
      async (details) => {
        await chrome.tabs.create(details);
      },
      { windowId: first, url: popupUrl }
    );
    await expect
      .poll(() => context.pages().some((candidate) => candidate.url() === popupUrl))
      .toBe(true);
    const page = context.pages().find((candidate) => candidate.url() === popupUrl) as Page;
    await expect(page.locator('#list')).not.toHaveValue('');

    await page.getByLabel('From').selectOption('all');
    await expect(page.getByLabel('From')).toContainText('All windows (5)');
    await page.getByRole('button', { name: 'Copy 5 as URL' }).click();
    await expect(page.getByRole('status')).toHaveText('Copied 5 as URL.');

    const groups = (await clipboardText(page))
      .split('\n\n')
      .map((group) => group.split('\n'))
      .sort((left, right) => right.length - left.length);
    expect(groups).toEqual([
      [site.url('a'), site.url('b'), site.url('c'), popupLine(extensionId, 'URL')],
      [site.url('d')],
    ]);
  });

  test('the offscreen page cannot write while the optional clipboardWrite permission is missing', async ({
    context,
    extensionId,
    worker,
  }) => {
    await allowClipboard(context);
    await worker.evaluate(async (url) => {
      await chrome.offscreen.createDocument({
        url,
        reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification: 'Write the copied list of tabs to the clipboard',
      });
    }, `chrome-extension://${extensionId}/offscreen/index.html`);
    const reply = await worker.evaluate(() =>
      chrome.runtime.sendMessage({ target: 'offscreen', type: 'copy', payload: { text: 'x' } })
    );
    expect(reply).toEqual({ ok: false, error: 'The copy command failed.' });
  });

  test.describe('with the clipboard permission granted', () => {
    test.use({ grantClipboard: true });

    test('the offscreen page writes the clipboard in real Chrome', async ({
      context,
      extensionId,
      worker,
      popup,
    }) => {
      await allowClipboard(context);
      await worker.evaluate(async (url) => {
        await chrome.offscreen.createDocument({
          url,
          reasons: [chrome.offscreen.Reason.CLIPBOARD],
          justification: 'Write the copied list of tabs to the clipboard',
        });
      }, `chrome-extension://${extensionId}/offscreen/index.html`);
      const reply = await worker.evaluate(() =>
        chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'copy',
          payload: { text: 'one\ntwo' },
        })
      );
      expect(reply).toEqual({ ok: true });

      const page = await context.newPage();
      await popup(page);
      expect(await clipboardText(page)).toBe('one\ntwo');
    });
  });
});
