// Unit tests for background/context-menu.ts

import { initializeContextMenu } from '@/background/context-menu';
import { CONFIG } from '@/schemas/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CreateCallback = (() => void) | undefined;

/** Makes create() call its callback with lastError set to the given message, or cleared when null. */
function createCallsBackWith(messages: Array<string | null>): void {
  let call = 0;
  chrome.contextMenus.create = vi.fn((_props: unknown, cb?: CreateCallback) => {
    const message = messages[Math.min(call, messages.length - 1)];
    call++;
    chrome.runtime.lastError = message === null ? undefined : { message };
    cb?.();
    chrome.runtime.lastError = undefined;
    return 'menu-id';
  }) as unknown as typeof chrome.contextMenus.create;
}

/** Makes removeAll() call its callback with lastError set to the given message. */
function removeAllCallsBackWith(message: string): void {
  chrome.contextMenus.removeAll = vi.fn((cb?: () => void) => {
    chrome.runtime.lastError = { message };
    cb?.();
    chrome.runtime.lastError = undefined;
  }) as unknown as typeof chrome.contextMenus.removeAll;
}

describe('initializeContextMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes all items then creates two items on success', async () => {
    await initializeContextMenu();

    expect(chrome.contextMenus.removeAll).toHaveBeenCalledOnce();
    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(2);
    const removeOrder = vi.mocked(chrome.contextMenus.removeAll).mock.invocationCallOrder[0];
    const createOrder = vi.mocked(chrome.contextMenus.create).mock.invocationCallOrder[0];
    expect(removeOrder).toBeLessThan(createOrder);
    expect(chrome.contextMenus.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: CONFIG.CONTEXT_MENU_ID, contexts: ['selection'] }),
      expect.any(Function)
    );
  });

  it("creates the toolbar item 'Copy this window's tabs' with the action context second", async () => {
    await initializeContextMenu();

    expect(chrome.contextMenus.create).toHaveBeenNthCalledWith(
      2,
      {
        id: 'OpenList-CopyWindow',
        title: "Copy this window's tabs",
        contexts: ['action'],
      },
      expect.any(Function)
    );
  });

  it('rejects and does not create when removeAll fails', async () => {
    removeAllCallsBackWith('gone');

    await expect(initializeContextMenu()).rejects.toThrow(new Error('gone'));

    expect(chrome.contextMenus.create).not.toHaveBeenCalled();
  });

  it('retries once after 1000 ms when the first create sets lastError', async () => {
    createCallsBackWith(['transient', null]);

    const promise = initializeContextMenu();
    await vi.advanceTimersByTimeAsync(999);
    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBeUndefined();

    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(3);
  });

  it('retries only the toolbar item when it fails and does not create the first item twice', async () => {
    createCallsBackWith([null, 'transient', null]);

    const promise = initializeContextMenu();
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toBeUndefined();

    const ids = vi
      .mocked(chrome.contextMenus.create)
      .mock.calls.map((call) => (call[0] as { id: string }).id);
    expect(ids).toEqual([CONFIG.CONTEXT_MENU_ID, 'OpenList-CopyWindow', 'OpenList-CopyWindow']);
  });

  it('rejects when the second create also fails', async () => {
    createCallsBackWith(['persistent']);

    const [result] = await Promise.allSettled([initializeContextMenu(), vi.runAllTimersAsync()]);

    expect(result.status).toBe('rejected');
    expect((result as PromiseRejectedResult).reason).toBeInstanceOf(Error);
    expect((result as PromiseRejectedResult).reason.message).toBe('persistent');
    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(2);
  });
});
