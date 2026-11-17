// Unit tests for background/copy-window.ts

import { copyWindowTabs } from '@/background/copy-window';
import { logger } from '@/utils/logger';
import { type FakeStorage, useFakeStorage } from '@tests/helpers/chrome-storage';
import { chromeTab } from '@tests/helpers/chrome-tabs';
import { mockWindows, siteTab } from '@tests/helpers/hook-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const OFFSCREEN_URL = 'chrome-extension://openlist/offscreen/index.html';

let storage: FakeStorage;

/** Stores the remembered format, as the popup does. */
function rememberFormat(format: string): void {
  storage.local.settings = { format };
}

/** The messages that the service worker sent to the offscreen page. */
function sentMessages(): unknown[] {
  return vi.mocked(chrome.runtime.sendMessage).mock.calls.map((call) => call[0]);
}

describe('copyWindowTabs', () => {
  beforeEach(() => {
    storage = useFakeStorage();
    mockWindows([[siteTab(1), siteTab(2), siteTab(3)]]);
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({ ok: true });
    (chrome.permissions.contains as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the Markdown payload of 3 tabs to the offscreen document and shows the count', async () => {
    rememberFormat('Markdown');

    await copyWindowTabs();

    expect(chrome.offscreen.createDocument).toHaveBeenCalledWith({
      url: OFFSCREEN_URL,
      reasons: ['CLIPBOARD'],
      justification: expect.any(String),
    });
    expect(sentMessages()).toEqual([
      {
        target: 'offscreen',
        type: 'copy',
        payload: {
          text: [
            '- [Site 1](https://site1.com/)',
            '- [Site 2](https://site2.com/)',
            '- [Site 3](https://site3.com/)',
          ].join('\n'),
        },
      },
    ]);
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Copied 3 as Markdown.' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' });
    const create = vi.mocked(chrome.offscreen.createDocument).mock.invocationCallOrder[0];
    const send = vi.mocked(chrome.runtime.sendMessage).mock.invocationCallOrder[0];
    const close = vi.mocked(chrome.offscreen.closeDocument).mock.invocationCallOrder[0];
    expect(create).toBeLessThan(send);
    expect(send).toBeLessThan(close);
  });

  it('asks the user to open OpenList once when the clipboard permission is missing', async () => {
    (chrome.permissions.contains as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await copyWindowTabs();

    expect(chrome.permissions.contains).toHaveBeenCalledWith({
      permissions: ['clipboardRead', 'clipboardWrite'],
    });
    expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      title: 'Open OpenList and press "Turn on clipboard detection" once to turn on copying.',
    });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '!' });
  });

  it('keeps the permission hint on the toolbar until the permissions are granted', async () => {
    vi.useFakeTimers();
    try {
      (chrome.permissions.contains as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      await copyWindowTabs();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: '' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the first-run format URL when nothing is remembered', async () => {
    await copyWindowTabs();

    expect(sentMessages()).toEqual([
      {
        target: 'offscreen',
        type: 'copy',
        payload: { text: 'https://site1.com/\nhttps://site2.com/\nhttps://site3.com/' },
      },
    ]);
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Copied 3 as URL.' });
  });

  it('sends the HTML flavor for a rich format', async () => {
    rememberFormat('Link');

    await copyWindowTabs();

    const [message] = sentMessages() as Array<{ payload: { text: string; html?: string } }>;
    expect(message.payload.html).toContain('<a href="https://site1.com/">');
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Copied 3 as Link.' });
  });

  it('copies only this window, and drops new-tab pages', async () => {
    mockWindows([
      [siteTab(1), chromeTab({ url: 'chrome://newtab/', title: 'New Tab' })],
      [siteTab(2)],
    ]);

    await copyWindowTabs();

    expect(sentMessages()).toEqual([
      { target: 'offscreen', type: 'copy', payload: { text: 'https://site1.com/' } },
    ]);
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Copied 1 as URL.' });
  });

  it("shows 'Nothing to copy.' as a failure mark and creates no document when no tab is left", async () => {
    mockWindows([[chromeTab({ url: 'about:blank' })]]);

    await copyWindowTabs();

    expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Nothing to copy.' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '!' });
  });

  it('does not reject when createDocument rejects, and shows the error', async () => {
    vi.mocked(chrome.offscreen.createDocument).mockRejectedValue(new Error('No offscreen here'));

    await expect(copyWindowTabs()).resolves.toBeUndefined();

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'No offscreen here' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '!' });
  });

  it('reuses the open document when Chrome allows only one', async () => {
    vi.mocked(chrome.offscreen.createDocument).mockRejectedValue(
      new Error('Only a single offscreen document may be created.')
    );

    await copyWindowTabs();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledOnce();
    expect(chrome.offscreen.closeDocument).toHaveBeenCalledOnce();
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Copied 3 as URL.' });
  });

  it('shows the error text of the offscreen page and still closes the document', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({ ok: false, error: 'Write denied' });

    await copyWindowTabs();

    expect(chrome.offscreen.closeDocument).toHaveBeenCalledOnce();
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Write denied' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '!' });
  });

  it('shows an error when the offscreen page gives no answer', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue(undefined);

    await copyWindowTabs();

    expect(chrome.offscreen.closeDocument).toHaveBeenCalledOnce();
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      title: 'The clipboard page did not answer.',
    });
  });

  it('shows the error when the tabs cannot load', async () => {
    vi.mocked(chrome.windows.getCurrent).mockRejectedValue(new Error('windows gone'));

    await expect(copyWindowTabs()).resolves.toBeUndefined();

    expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'windows gone' });
  });

  it('logs a failed close and still reports the copy', async () => {
    const errorLog = vi.spyOn(logger, 'error');
    vi.mocked(chrome.offscreen.closeDocument).mockRejectedValue(new Error('already closed'));

    await copyWindowTabs();

    expect(errorLog).toHaveBeenCalledWith('Offscreen close failed', { error: 'already closed' });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Copied 3 as URL.' });
  });

  it('does not reject when the toolbar feedback fails', async () => {
    const errorLog = vi.spyOn(logger, 'error');
    vi.mocked(chrome.action.setTitle).mockRejectedValue(new Error('action gone'));

    await expect(copyWindowTabs()).resolves.toBeUndefined();

    expect(errorLog).toHaveBeenCalledWith('Feedback failed', { error: 'action gone' });
  });
});
