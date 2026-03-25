// Unit tests for background/context-menu.ts

import { initializeContextMenu } from '@/background/context-menu';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('initializeContextMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls removeAll() then create() on success', async () => {
    chrome.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
    chrome.contextMenus.create = vi.fn().mockResolvedValue(undefined);

    await initializeContextMenu();

    expect(chrome.contextMenus.removeAll).toHaveBeenCalledOnce();
    expect(chrome.contextMenus.create).toHaveBeenCalledOnce();
  });

  it('on first create() failure, waits and retries', async () => {
    chrome.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
    let callCount = 0;
    chrome.contextMenus.create = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('first fail'));
      return Promise.resolve(undefined);
    });

    const promise = initializeContextMenu();
    // Advance timers to cover the 1000ms retry delay
    await vi.runAllTimersAsync();
    await promise;

    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(2);
  });

  it('retry succeeds and does not throw', async () => {
    chrome.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
    let callCount = 0;
    chrome.contextMenus.create = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('transient error'));
      return Promise.resolve(undefined);
    });

    const promise = initializeContextMenu();
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBeUndefined();
  });

  it('both create() calls fail — throws', async () => {
    chrome.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
    chrome.contextMenus.create = vi.fn().mockImplementation(() => {
      return Promise.reject(new Error('persistent error'));
    });

    // Use Promise.race to keep the rejection chained while running timers
    const [result] = await Promise.allSettled([initializeContextMenu(), vi.runAllTimersAsync()]);

    expect(result.status).toBe('rejected');
    expect((result as PromiseRejectedResult).reason).toBeInstanceOf(Error);
    expect((result as PromiseRejectedResult).reason.message).toBe('persistent error');
  });
});
