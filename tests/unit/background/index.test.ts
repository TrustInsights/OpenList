// Unit tests for background/index.ts: the service worker registers every listener at the top level

import { copyWindowTabs } from '@/background/copy-window';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/background/copy-window', () => ({ copyWindowTabs: vi.fn() }));

describe('service worker entry point', () => {
  beforeEach(async () => {
    vi.resetModules();
    await import('@/background/index');
  });

  it('registers the lifecycle, menu click, and message listeners', () => {
    for (const event of [
      chrome.runtime.onInstalled,
      chrome.runtime.onStartup,
      chrome.contextMenus.onClicked,
      chrome.runtime.onMessage,
    ]) {
      expect(event.addListener).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
    }
  });

  it('copies the window when the copy-window command fires', () => {
    expect(chrome.commands.onCommand.addListener).toHaveBeenCalledOnce();
    const listener = vi.mocked(chrome.commands.onCommand.addListener).mock.calls[0][0];

    listener('copy-window', {} as chrome.tabs.Tab);

    expect(copyWindowTabs).toHaveBeenCalledOnce();
  });

  it('ignores every other command', () => {
    const listener = vi.mocked(chrome.commands.onCommand.addListener).mock.calls[0][0];

    listener('_execute_action', {} as chrome.tabs.Tab);

    expect(copyWindowTabs).not.toHaveBeenCalled();
  });
});
