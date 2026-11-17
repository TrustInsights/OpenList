// Playwright fixtures: a real Chromium with the built extension, a local site, and the popup helper

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import {
  type BrowserContext,
  type Page,
  type Worker,
  test as base,
  chromium,
} from '@playwright/test';

const EXTENSION_PATH = path.join(import.meta.dirname, '../../dist');
const PROFILE_ROOT = path.join(import.meta.dirname, '../../temp/e2e-profiles');

/** The local site that serves the test pages. */
interface Site {
  /** The origin, for example http://127.0.0.1:41234. */
  origin: string;
  /** Gives the address of a page. The name is a letter from a to z. */
  url: (name: string, query?: string) => string;
  /** Gives the title of a page. */
  title: (name: string) => string;
}

/** What the fixtures give to a test. */
interface Fixtures {
  /**
   * True loads a copy of the build with clipboardRead and clipboardWrite among the required
   * permissions. It stands in for the user grant of the optional permissions, because Playwright
   * cannot click the Chrome prompt.
   */
  grantClipboard: boolean;
  extensionId: string;
  worker: Worker;
  site: Site;
  /** Opens the popup page in a tab and waits until its list holds text. */
  popup: (page: Page) => Promise<void>;
  /** Counts the tabs whose address starts with the prefix, as the browser sees them. */
  countTabs: (prefix: string) => Promise<number>;
  /** Opens a site page in a new tab of the first window and waits for its title. */
  openPage: (name: string, query?: string) => Promise<Page>;
}

/**
 * Writes the title of a site page.
 * @param name - The page name, a letter from a to z.
 * @returns For example "Site page A".
 */
function pageTitle(name: string): string {
  return `Site page ${name.toUpperCase()}`;
}

/**
 * Copies the build and adds the two clipboard permissions to its required permissions.
 * @param profile - A folder in temp/ that the test owns.
 * @returns The folder of the copied build.
 */
async function grantedBuild(profile: string): Promise<string> {
  const copy = path.join(profile, 'extension');
  await cp(EXTENSION_PATH, copy, { recursive: true });
  const file = path.join(copy, 'manifest.json');
  const manifest = JSON.parse(await readFile(file, 'utf8')) as { permissions: string[] };
  manifest.permissions.push('clipboardRead', 'clipboardWrite');
  await writeFile(file, JSON.stringify(manifest));
  return copy;
}

/** Playwright test with the extension loaded in real Chromium, plus the helpers above. */
export const test = base.extend<Fixtures>({
  grantClipboard: [false, { option: true }],

  context: async ({ grantClipboard }, use): Promise<void> => {
    await mkdir(PROFILE_ROOT, { recursive: true });
    const profile = await mkdtemp(path.join(PROFILE_ROOT, 'profile-'));
    const extension = grantClipboard ? await grantedBuild(profile) : EXTENSION_PATH;
    const context: BrowserContext = await chromium.launchPersistentContext(
      path.join(profile, 'data'),
      {
        channel: 'chromium',
        headless: true,
        args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
      }
    );
    await use(context);
    await context.close();
    await rm(profile, { recursive: true, force: true });
  },

  worker: async ({ context }, use): Promise<void> => {
    const [existing] = context.serviceWorkers();
    await use(existing ?? (await context.waitForEvent('serviceworker')));
  },

  extensionId: async ({ worker }, use): Promise<void> => {
    await use(new URL(worker.url()).host);
  },

  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires an object pattern in fixtures
  site: async ({}, use): Promise<void> => {
    const server = createServer((request, response) => {
      const name = /^\/([a-z])\.html$/.exec(new URL(request.url ?? '/', 'http://x').pathname)?.[1];
      if (name === undefined) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(
        `<!doctype html><html lang="en"><head><title>${pageTitle(name)}</title></head><body><h1>${pageTitle(name)}</h1></body></html>`
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    await use({
      origin,
      url: (name, query) => `${origin}/${name}.html${query === undefined ? '' : `?${query}`}`,
      title: pageTitle,
    });
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  },

  popup: async ({ extensionId }, use): Promise<void> => {
    await use(async (page) => {
      await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
      await page.waitForFunction(() => {
        const box = document.querySelector<HTMLTextAreaElement>('#list');
        return box !== null && box.value !== '';
      });
    });
  },

  countTabs: async ({ worker }, use): Promise<void> => {
    await use((prefix) =>
      worker.evaluate(async (start) => {
        const tabs = await chrome.tabs.query({});
        return tabs.filter((tab) => (tab.url || tab.pendingUrl || '').startsWith(start)).length;
      }, prefix)
    );
  },

  openPage: async ({ context, site }, use): Promise<void> => {
    await use(async (name, query) => {
      const page = await context.newPage();
      await page.goto(site.url(name, query));
      return page;
    });
  },
});

export { expect } from '@playwright/test';
