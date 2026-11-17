// E2E tests for the extension in real Chrome: the service worker, the manifest, and the popup layout

import type { Page } from '@playwright/test';
import { expect, test } from '@tests/e2e/fixtures';

/**
 * Measures the height of the popup content, not of the browser tab that holds it.
 * @param page - The popup page.
 * @returns The height in pixels.
 */
async function popupHeight(page: Page): Promise<number> {
  return page.locator('main.popup').evaluate((node) => node.getBoundingClientRect().height);
}

test.describe('Extension', () => {
  test('registers the service worker and the copy shortcut from the built manifest', async ({
    worker,
    extensionId,
  }) => {
    expect(worker.url()).toBe(`chrome-extension://${extensionId}/service-worker-loader.js`);

    const details = await worker.evaluate(async () => ({
      manifest: chrome.runtime.getManifest(),
      commands: await chrome.commands.getAll(),
    }));
    expect(details.manifest.name).toBe('OpenList');
    expect(details.manifest.minimum_chrome_version).toBe('110');
    expect([...(details.manifest.permissions ?? [])].sort()).toEqual([
      'contextMenus',
      'offscreen',
      'storage',
      'tabs',
    ]);
    expect(details.manifest.optional_permissions).toEqual(['clipboardRead', 'clipboardWrite']);
    expect(details.commands.find((command) => command.name === 'copy-window')).toMatchObject({
      description: "Copy this window's tabs",
      shortcut: expect.stringContaining('C'),
    });
  });
});

test.describe('Popup', () => {
  test('renders the list, the two actions, and the copy formats in three groups', async ({
    context,
    popup,
  }) => {
    const page = await context.newPage();
    await popup(page);

    await expect(page.getByRole('heading', { name: 'OpenList', level: 1 })).toBeVisible();
    await expect(page.getByLabel('URLs, one per line')).toBeFocused();
    await expect(page.getByRole('button', { name: /^(Open \d+ URLs?|All open)$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Copy \d+ as URL$/ })).toBeVisible();
    await expect(page.getByLabel('From')).toHaveValue('tab');

    const groups = await page.locator('#format optgroup').evaluateAll((nodes) =>
      nodes.map((node) => ({
        label: node.getAttribute('label'),
        formats: Array.from(node.querySelectorAll('option'), (option) => option.value),
      }))
    );
    expect(groups).toEqual([
      { label: 'Plain text', formats: ['URL', 'Title', 'Title & URL'] },
      { label: 'Markup', formats: ['Markdown', 'BBCode', 'HTML', 'Link'] },
      { label: 'Data', formats: ['CSV', 'JSON', 'HTML table'] },
    ]);
    await expect(page.getByLabel('Copy as')).toHaveValue('URL');
  });

  test('starts at This window when the window holds several tabs, and fills the list', async ({
    context,
    site,
    popup,
    openPage,
  }) => {
    for (const name of ['a', 'b']) await openPage(name);
    const page = await context.newPage();
    await popup(page);

    await expect(page.getByLabel('From')).toHaveValue('window');
    await expect(page.getByLabel('From')).toContainText('This window (3)');
    const lines = (await page.locator('#list').inputValue()).split('\n');
    expect(lines.slice(0, 2)).toEqual([site.url('a'), site.url('b')]);
  });

  test('keeps the popup 450 px wide and every control 44 px high', async ({ context, popup }) => {
    const page = await context.newPage();
    await popup(page);
    await page.getByText('Details', { exact: true }).click();
    await expect(page.getByText('Open since')).toBeVisible();
    await expect(
      page.locator('details').getByRole('button', { name: 'Turn on clipboard detection' })
    ).toBeVisible();

    const width = await page
      .locator('main.popup')
      .evaluate((node) => node.getBoundingClientRect().width);
    const controls = await page.locator('button, select, summary').evaluateAll((nodes) =>
      nodes.map((node) => ({
        name: `${node.tagName.toLowerCase()} "${(node.textContent ?? '').trim().slice(0, 30)}"`,
        height: node.getBoundingClientRect().height,
      }))
    );

    expect(width).toBe(450);
    expect(controls.length).toBeGreaterThanOrEqual(7);
    for (const control of controls) expect(control.height, control.name).toBeGreaterThanOrEqual(44);
  });

  test('stays within 600 px at first run, with the clipboard button and Details closed', async ({
    context,
    popup,
  }) => {
    const page = await context.newPage();
    await popup(page);
    await expect(page.getByRole('button', { name: 'Not now' })).toBeVisible();

    expect(await popupHeight(page)).toBeLessThanOrEqual(600);
  });

  test('stays within 600 px at first run with Details open, and the button moves into Details', async ({
    context,
    popup,
  }) => {
    const page = await context.newPage();
    await popup(page);
    await expect(page.getByRole('button', { name: 'Not now' })).toBeVisible();
    await page.getByText('Details', { exact: true }).click();
    await expect(page.getByText('Open since')).toBeVisible();

    const turnOn = page.getByRole('button', { name: 'Turn on clipboard detection' });
    await expect(turnOn).toBeVisible();
    await expect(
      page.locator('details').getByRole('button', { name: 'Turn on clipboard detection' })
    ).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Not now' })).toHaveCount(0);
    expect(await popupHeight(page)).toBeLessThanOrEqual(600);

    await page.getByText('Details', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Not now' })).toBeVisible();
  });

  test('stays within 600 px with Details open after the user chose Not now', async ({
    context,
    popup,
  }) => {
    const page = await context.newPage();
    await popup(page);
    await page.getByRole('button', { name: 'Not now' }).click();
    await page.getByText('Details', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Turn on clipboard detection' })).toBeVisible();

    expect(await popupHeight(page)).toBeLessThanOrEqual(600);
  });

  test('shows the footer link with the manifest version', async ({ context, worker, popup }) => {
    const version = await worker.evaluate(() => chrome.runtime.getManifest().version);
    const page = await context.newPage();
    await popup(page);

    const link = page.getByRole('link', {
      name: `OpenList ${version} brought to you by TrustInsights.ai`,
    });
    await expect(link).toHaveAttribute(
      'href',
      `https://www.trustinsights.ai?utm_source=openlist&utm_medium=referral&utm_campaign=openlist_${version.replaceAll('.', '_')}`
    );
  });

  test('opens a pasted URL in a new tab when the button is clicked', async ({
    context,
    site,
    popup,
    countTabs,
  }) => {
    const page = await context.newPage();
    await popup(page);

    await page.locator('#list').fill(site.url('a'));
    await page.getByRole('button', { name: 'Open 1 URL' }).click();

    await expect.poll(() => countTabs(site.origin)).toBe(1);
  });
});

test.describe('Popup with clipboard access granted', () => {
  test.use({ grantClipboard: true });

  test('stays within 600 px with Details open', async ({ context, popup }) => {
    const page = await context.newPage();
    await popup(page);
    await page.getByText('Details', { exact: true }).click();
    await expect(page.getByText('Open since')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Turn on clipboard detection' })).toHaveCount(0);

    expect(await popupHeight(page)).toBeLessThanOrEqual(600);
  });

  test('a copied list of URLs becomes the default source, and the status line says so', async ({
    context,
    site,
    popup,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const copied = ['a', 'b', 'c'].map((name) => site.url(name));
    const writer = await context.newPage();
    await writer.goto(site.url('z'));
    await writer.evaluate((text) => navigator.clipboard.writeText(text), copied.join('\n'));

    const page = await context.newPage();
    await popup(page);

    await expect(page.getByLabel('From')).toHaveValue('clipboard');
    await expect(page.getByLabel('From')).toContainText('Clipboard (3 URLs)');
    await expect(page.getByRole('status')).toHaveText('Using 3 URLs from your clipboard.');
    // 127.0.0.1 is a local address, so the list reader keeps http as copied.
    await expect(page.locator('#list')).toHaveValue(copied.join('\n'));
  });

  test('a clipboard with one URL is ignored without a message', async ({
    context,
    site,
    popup,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const writer = await context.newPage();
    await writer.goto(site.url('z'));
    await writer.evaluate((text) => navigator.clipboard.writeText(text), site.url('a'));

    const page = await context.newPage();
    await popup(page);

    await expect(page.getByLabel('From')).not.toHaveValue('clipboard');
    await expect(page.getByLabel('From')).not.toContainText('Clipboard');
    await expect(page.getByRole('status')).toBeEmpty();
  });
});
