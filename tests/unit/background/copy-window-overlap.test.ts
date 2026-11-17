// Unit tests for background/copy-window.ts: runs that overlap share one offscreen document

import { copyWindowTabs } from '@/background/copy-window';
import { useFakeStorage } from '@tests/helpers/chrome-storage';
import { mockWindows, siteTab } from '@tests/helpers/hook-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('copyWindowTabs with overlapping runs', () => {
  beforeEach(() => {
    useFakeStorage();
    mockWindows([[siteTab(1), siteTab(2), siteTab(3)]]);
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({ ok: true });
    (chrome.permissions.contains as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serializes two overlapping runs so one never closes the document of the other', async () => {
    let open = false;
    vi.mocked(chrome.offscreen.createDocument).mockImplementation(async () => {
      if (open) throw new Error('Only a single offscreen document may be created.');
      open = true;
    });
    vi.mocked(chrome.offscreen.closeDocument).mockImplementation(async () => {
      open = false;
    });
    let calls = 0;
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async () => {
      calls += 1;
      const mine = calls;
      // The first reply comes fast. The second comes after the first run closes the document.
      for (let tick = 0; tick < (mine === 1 ? 1 : 30); tick++) await Promise.resolve();
      if (!open) throw new Error('Receiving end does not exist.');
      return { ok: true };
    });

    await Promise.all([copyWindowTabs(), copyWindowTabs()]);

    expect(chrome.action.setTitle).not.toHaveBeenCalledWith({
      title: 'Receiving end does not exist.',
    });
    expect(chrome.action.setTitle).toHaveBeenCalledTimes(2);
    expect(chrome.action.setTitle).toHaveBeenLastCalledWith({ title: 'Copied 3 as URL.' });
    expect(chrome.offscreen.closeDocument).toHaveBeenCalledTimes(2);
  });

  it('runs the next copy after a failed one', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
      ok: false,
      error: 'Write denied',
    });

    await copyWindowTabs();
    await copyWindowTabs();

    expect(chrome.action.setTitle).toHaveBeenNthCalledWith(1, { title: 'Write denied' });
    expect(chrome.action.setTitle).toHaveBeenNthCalledWith(2, { title: 'Copied 3 as URL.' });
  });
});
