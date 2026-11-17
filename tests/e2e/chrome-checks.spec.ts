// E2E tests for the Chrome checks of spec section 14 that run without a human prompt

import { expect, test } from '@tests/e2e/fixtures';

test.describe('Chrome checks of spec section 14', () => {
  test('Chrome accepts clipboardRead and clipboardWrite as optional permissions and grants neither at install', async ({
    worker,
  }) => {
    const state = await worker.evaluate(async () => ({
      optional: chrome.runtime.getManifest().optional_permissions,
      required: chrome.runtime.getManifest().permissions,
      readGranted: await chrome.permissions.contains({ permissions: ['clipboardRead'] }),
      writeGranted: await chrome.permissions.contains({ permissions: ['clipboardWrite'] }),
    }));

    expect(state.optional).toEqual(['clipboardRead', 'clipboardWrite']);
    expect(state.required).toEqual(['contextMenus', 'storage', 'tabs', 'offscreen']);
    expect(state.readGranted).toBe(false);
    expect(state.writeGranted).toBe(false);
  });

  test('a permission request without a user gesture is refused, so only the button can ask', async ({
    worker,
  }) => {
    const message = await worker.evaluate(async () => {
      try {
        await chrome.permissions.request({ permissions: ['clipboardRead', 'clipboardWrite'] });
        return 'granted without a gesture';
      } catch (error) {
        return (error as Error).message;
      }
    });

    expect(message).toMatch(/user gesture/i);
  });

  test('Chrome lists the copy-window command with its description and the suggested key', async ({
    worker,
  }) => {
    const commands = await worker.evaluate(() => chrome.commands.getAll());
    const copy = commands.find((command) => command.name === 'copy-window');

    expect(copy?.description).toBe("Copy this window's tabs");
    expect(copy?.shortcut).toMatch(/Alt\+Shift\+C|⌥⇧C/);
  });

  test('Ctrl+Z after a paste into the pre-selected list brings the earlier text back', async ({
    context,
    popup,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const page = await context.newPage();
    await popup(page);
    const filled = await page.locator('#list').inputValue();
    await page.evaluate(() => navigator.clipboard.writeText('https://example.com/pasted'));

    await page.locator('#list').focus();
    await page.evaluate(() => (document.querySelector('#list') as HTMLTextAreaElement).select());
    await page.keyboard.press('ControlOrMeta+V');
    await expect(page.locator('#list')).toHaveValue('https://example.com/pasted');
    await page.keyboard.press('ControlOrMeta+Z');

    await expect(page.locator('#list')).toHaveValue(filled);
  });
});
