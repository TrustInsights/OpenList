// Unit tests for loadTabs in utils/tabs-source.ts: privacy filter and tab sources

import { loadTabs } from '@/utils/tabs-source';
import { chromeTab, chromeWindow } from '@tests/helpers/chrome-tabs';
import { describe, expect, it, vi } from 'vitest';

describe('loadTabs', () => {
  const normalWindow = chromeWindow(1, [
    chromeTab({
      id: 1,
      index: 0,
      active: true,
      highlighted: true,
      title: 'One',
      url: 'https://one.com/',
    }),
    chromeTab({ id: 2, index: 1, highlighted: true, title: 'Two', url: 'https://two.com/' }),
    chromeTab({ id: 3, index: 2, title: 'Three', url: 'https://three.com/' }),
    chromeTab({ id: 4, index: 3, url: 'chrome://newtab/' }),
    chromeTab({ id: 5, index: 4, discarded: true, title: 'Asleep', url: 'https://asleep.com/' }),
  ]);
  const otherWindow = chromeWindow(2, [
    chromeTab({
      id: 6,
      index: 0,
      windowId: 2,
      active: true,
      title: 'Six',
      url: 'https://six.com/',
    }),
  ]);

  it('asks for populated normal windows only', async () => {
    vi.mocked(chrome.windows.getAll).mockResolvedValue([normalWindow]);
    await loadTabs();
    expect(chrome.windows.getAll).toHaveBeenCalledWith({ populate: true, windowTypes: ['normal'] });
  });

  it('fills window, selected, active, all, and known for the current window', async () => {
    vi.mocked(chrome.windows.getAll).mockResolvedValue([normalWindow, otherWindow]);
    const loaded = await loadTabs();
    const urls = (list: readonly { url: string }[]): string[] => list.map((tab) => tab.url);
    expect(urls(loaded.window)).toEqual([
      'https://one.com/',
      'https://two.com/',
      'https://three.com/',
      'https://asleep.com/',
    ]);
    expect(urls(loaded.selected)).toEqual(['https://one.com/', 'https://two.com/']);
    expect(loaded.active?.url).toBe('https://one.com/');
    expect(loaded.all.map(urls)).toEqual([
      ['https://one.com/', 'https://two.com/', 'https://three.com/', 'https://asleep.com/'],
      ['https://six.com/'],
    ]);
    expect(urls(loaded.known)).toEqual([
      'https://one.com/',
      'https://two.com/',
      'https://three.com/',
      'https://asleep.com/',
      'https://six.com/',
    ]);
  });

  it('uses the second window when the popup sits in it', async () => {
    vi.mocked(chrome.windows.getCurrent).mockResolvedValue({
      id: 2,
      incognito: false,
    } as chrome.windows.Window);
    vi.mocked(chrome.windows.getAll).mockResolvedValue([normalWindow, otherWindow]);
    const loaded = await loadTabs();
    expect(loaded.window.map((tab) => tab.url)).toEqual(['https://six.com/']);
    expect(loaded.active?.url).toBe('https://six.com/');
    expect(loaded.selected).toEqual([]);
  });

  it('leaves out a private window for a normal current window', async () => {
    const privateWindow = chromeWindow(
      3,
      [chromeTab({ id: 7, windowId: 3, incognito: true, url: 'https://secret.com/' })],
      true
    );
    vi.mocked(chrome.windows.getAll).mockResolvedValue([normalWindow, privateWindow]);
    const loaded = await loadTabs();
    expect(loaded.all).toHaveLength(1);
    expect(loaded.known.map((tab) => tab.url)).not.toContain('https://secret.com/');
  });

  it('leaves out normal windows for a private current window', async () => {
    const privateWindow = chromeWindow(
      3,
      [
        chromeTab({
          id: 7,
          windowId: 3,
          incognito: true,
          active: true,
          url: 'https://secret.com/',
        }),
      ],
      true
    );
    vi.mocked(chrome.windows.getCurrent).mockResolvedValue({
      id: 3,
      incognito: true,
    } as chrome.windows.Window);
    vi.mocked(chrome.windows.getAll).mockResolvedValue([normalWindow, privateWindow]);
    const loaded = await loadTabs();
    expect(loaded.known.map((tab) => tab.url)).toEqual(['https://secret.com/']);
    expect(loaded.active?.url).toBe('https://secret.com/');
  });

  it('gives empty sources when every tab is filtered out (Review Focus 5)', async () => {
    const junkWindow = chromeWindow(1, [
      chromeTab({ active: true, highlighted: true, url: 'about:blank' }),
    ]);
    vi.mocked(chrome.windows.getAll).mockResolvedValue([junkWindow]);
    expect(await loadTabs()).toEqual({
      active: null,
      window: [],
      selected: [],
      all: [[]],
      known: [],
    });
  });

  it('gives empty sources when the current window is not a normal window', async () => {
    vi.mocked(chrome.windows.getCurrent).mockResolvedValue({
      id: 9,
      incognito: false,
    } as chrome.windows.Window);
    vi.mocked(chrome.windows.getAll).mockResolvedValue([normalWindow]);
    const loaded = await loadTabs();
    expect(loaded.window).toEqual([]);
    expect(loaded.selected).toEqual([]);
    expect(loaded.active).toBeNull();
    expect(loaded.known).toHaveLength(4);
  });

  it('skips a window that has no tabs list', async () => {
    const bare = {
      id: 1,
      incognito: false,
      focused: false,
      alwaysOnTop: false,
    } as chrome.windows.Window;
    vi.mocked(chrome.windows.getAll).mockResolvedValue([bare]);
    const loaded = await loadTabs();
    expect(loaded.window).toEqual([]);
    expect(loaded.all).toEqual([[]]);
  });

  it('passes a lookup failure to the caller', async () => {
    vi.mocked(chrome.windows.getAll).mockRejectedValue(new Error('no windows'));
    await expect(loadTabs()).rejects.toThrow('no windows');
  });
});
