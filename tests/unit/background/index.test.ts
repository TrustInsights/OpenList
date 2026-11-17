// Unit tests for the service worker entry point: every listener is registered at the top level

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Gets the function that the entry point gave to an addListener mock. @param mock - The addListener mock. @returns The listener. */
function listenerOf(mock: unknown): (...args: unknown[]) => unknown {
  return vi.mocked(mock as (listener: unknown) => void).mock.calls[0]?.[0] as (
    ...args: unknown[]
  ) => unknown;
}

describe('service worker entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('registers the install, start, message, menu, and command listeners', async () => {
    await import('@/background/index');
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledOnce();
    expect(chrome.runtime.onStartup.addListener).toHaveBeenCalledOnce();
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledOnce();
    expect(chrome.contextMenus.onClicked.addListener).toHaveBeenCalledOnce();
    expect(chrome.commands.onCommand.addListener).toHaveBeenCalledOnce();
  });

  it('runs one handler for both the install and the start event', async () => {
    await import('@/background/index');
    expect(listenerOf(chrome.runtime.onInstalled.addListener)).toBe(
      listenerOf(chrome.runtime.onStartup.addListener)
    );
  });

  it('clears the toolbar hint when the user grants a permission', async () => {
    const feedback = await import('@/background/feedback');
    const clear = vi.spyOn(feedback, 'clearFeedback').mockResolvedValue(undefined);
    await import('@/background/index');
    listenerOf(chrome.permissions.onAdded.addListener)();
    expect(clear).toHaveBeenCalledOnce();
  });

  it('copies the window on the copy-window command and ignores other commands', async () => {
    const copy = await import('@/background/copy-window');
    const spy = vi.spyOn(copy, 'copyWindowTabs').mockResolvedValue(undefined);
    await import('@/background/index');
    const listener = listenerOf(chrome.commands.onCommand.addListener);
    listener('other-command');
    expect(spy).not.toHaveBeenCalled();
    listener('copy-window');
    expect(spy).toHaveBeenCalledOnce();
  });
});
