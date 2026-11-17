// Store images: builds the Chrome Web Store screenshots and the promo tile from the real built extension

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { chromium, expect, test } from '@playwright/test';
import { type Shot, pngInfo, popupPicture, renderImage } from '@tests/helpers/store-image-compose';

const ROOT = path.join(__dirname, '../..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'output/store-images');
const PROFILE_ROOT = path.join(ROOT, 'temp/store-image-profiles');
const LOGO = path.join(ROOT, 'docs/trust-insights-brand/TI_Primary_3Color.png');

/** Sample sites. The key is host plus path. The value is the page title. All use example domains. */
const PAGES: Readonly<Record<string, string>> = {
  'docs.example.com/reports/q3': 'Q3 performance report – Example Docs',
  'recipes.example.org/crispy-fish-and-chips': 'Crispy fish and chips – Example Recipes',
  'news.example.net/product-launch-recap': 'Product launch recap – Example News',
  'design.example.com/tokens-explained': 'Design tokens, explained – Example Design',
  'blog.example.org/accessibility-checklist': 'A practical accessibility checklist – Example Blog',
};

/** Addresses that are not open yet. They fill the list for the Open screenshot. */
const NEW_LINKS: readonly string[] = [
  'https://news.example.net/ai-weekly-roundup',
  'https://docs.example.com/guides/getting-started',
  'https://blog.example.org/ten-tips-for-better-meetings',
  'https://recipes.example.org/weeknight-pasta',
  'https://design.example.com/color-contrast-guide',
  'https://news.example.net/browser-security-update',
];

/**
 * Copies the build and makes the two clipboard permissions required, so the Copy button works without a prompt.
 * @param profile - A folder in temp/.
 * @returns The folder of the copy.
 */
async function grantedBuild(profile: string): Promise<string> {
  const copy = path.join(profile, 'extension');
  await cp(DIST, copy, { recursive: true });
  const file = path.join(copy, 'manifest.json');
  const manifest = JSON.parse(await readFile(file, 'utf8')) as { permissions: string[] };
  manifest.permissions.push('clipboardRead', 'clipboardWrite');
  await writeFile(file, JSON.stringify(manifest));
  return copy;
}

test.describe('Store images', () => {
  test('builds three screenshots and the small tile from the real extension', async () => {
    test.setTimeout(240_000);
    await mkdir(OUT, { recursive: true });
    await mkdir(PROFILE_ROOT, { recursive: true });
    const profile = await mkdtemp(path.join(PROFILE_ROOT, 'profile-'));

    const server = createServer((request, response) => {
      const host = (request.headers.host ?? '').split(':')[0] ?? '';
      const key = host + new URL(request.url ?? '/', 'http://x').pathname;
      const title = PAGES[key] ?? 'Example page';
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(
        `<!doctype html><html lang="en"><head><title>${title}</title></head><body><h1>${title}</h1></body></html>`
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const hosts = Array.from(new Set(Object.keys(PAGES).map((key) => key.split('/')[0] ?? '')));
    const rules = hosts.map((host) => `MAP ${host} 127.0.0.1:${port}`).join(',');

    const extension = await grantedBuild(profile);
    const context = await chromium.launchPersistentContext(path.join(profile, 'data'), {
      channel: 'chromium',
      headless: true,
      deviceScaleFactor: 2,
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
        `--host-resolver-rules=${rules}`,
      ],
    });
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const [existing] = context.serviceWorkers();
      const worker = existing ?? (await context.waitForEvent('serviceworker'));
      const extensionId = new URL(worker.url()).host;
      const logo = `data:image/png;base64,${(await readFile(LOGO)).toString('base64')}`;

      for (const key of Object.keys(PAGES)) {
        const page = await context.newPage();
        await page.goto(`http://${key}`);
      }
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup/index.html`);
      const list = popup.locator('#list');
      await expect(list).not.toHaveValue('');

      // Screenshot 1: open a list of links that are not open yet.
      await list.fill(NEW_LINKS.join('\n'));
      await expect(
        popup.getByRole('button', { name: `Open ${NEW_LINKS.length} URLs` })
      ).toBeVisible();
      const pictureOpen = await popupPicture(popup, 'light');

      // Screenshot 2: copy open tabs as Markdown.
      const openAddresses = Object.keys(PAGES).map((key) => `https://${key}`);
      await list.fill(openAddresses.join('\n'));
      await popup.getByLabel('Copy as').selectOption('Markdown');
      await popup.getByRole('button', { name: 'Copy 5 as Markdown' }).click();
      await expect(popup.getByRole('status')).toHaveText('Copied 5 as Markdown.');
      const pictureCopy = await popupPicture(popup, 'dark');

      // Screenshot 3: a real Open that skips two open pages, then the Details totals.
      const mixed = [...openAddresses.slice(0, 2), ...NEW_LINKS.slice(0, 2)];
      await list.fill(mixed.join('\n'));
      await popup.getByRole('button', { name: 'Open 2 URLs' }).click();
      await expect(popup.getByRole('status')).toHaveText('Opened 2, skipped 2 already open.');
      await list.fill(NEW_LINKS.slice(2).join('\n'));
      await expect(popup.getByRole('status')).toHaveText('Opened 2, skipped 2 already open.');
      await popup.getByText('Details', { exact: true }).click();
      const pictureDetails = await popupPicture(popup, 'light');

      const shots: Array<[string, string, string, Shot]> = [
        [
          pictureOpen,
          'Open a whole list of links in one click',
          'Paste URLs, Markdown, HTML, CSV, or JSON. OpenList finds the addresses.',
          { file: 'screenshot-1-open-list.png', width: 1280, height: 800 },
        ],
        [
          pictureCopy,
          'Copy your tabs in the format you need',
          'Markdown, CSV, JSON, HTML, and more, from one list.',
          { file: 'screenshot-2-copy-tabs.png', width: 1280, height: 800 },
        ],
        [
          pictureDetails,
          'Smart defaults. Private by design.',
          'Skips tabs you already have open. Nothing leaves your browser.',
          { file: 'screenshot-3-details.png', width: 1280, height: 800 },
        ],
        [
          pictureOpen,
          'Open lists.<br>Copy tabs.',
          'One list, two jobs.',
          { file: 'promo-tile-440x280.png', width: 440, height: 280 },
        ],
      ];
      for (const [picture, headline, sub, shot] of shots)
        await renderImage(context, picture, logo, headline, sub, shot, OUT);

      for (const [, , , shot] of shots) {
        const info = await pngInfo(path.join(OUT, shot.file));
        expect(info, shot.file).toEqual({ width: shot.width, height: shot.height, colorType: 2 });
      }
    } finally {
      await context.close();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(profile, { recursive: true, force: true });
    }
  });
});
