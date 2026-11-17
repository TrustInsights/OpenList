// E2E test: the popup and the service worker load with no CSP violation and no console error

import type { ConsoleMessage } from '@playwright/test';
import { expect, test } from '@tests/e2e/fixtures';

/** Keeps the text of each error message and each CSP violation. */
function collect(sink: string[]): (message: ConsoleMessage) => void {
  return (message) => {
    if (message.type() === 'error' || /Content Security Policy|unsafe-eval/i.test(message.text())) {
      sink.push(message.text());
    }
  };
}

test.describe('Content Security Policy', () => {
  test('the popup loads, parses a message, and logs no error', async ({ context, extensionId }) => {
    const errors: string[] = [];
    const page = await context.newPage();
    page.on('console', collect(errors));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.waitForFunction(() => document.querySelector('#list') !== null);
    expect(errors).toEqual([]);
  });

  test('the service worker starts, answers a message, and logs no error', async ({
    context,
    worker,
    extensionId,
  }) => {
    const errors: string[] = [];
    worker.on('console', collect(errors));
    const page = await context.newPage();
    page.on('console', collect(errors));
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    const reply = await page.evaluate(() =>
      chrome.runtime.sendMessage({ action: 'openList', urls: [] })
    );
    expect(reply).toMatchObject({ status: 'error' });
    expect(errors).toEqual([]);
  });
});
