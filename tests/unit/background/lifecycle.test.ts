// Unit tests for background/lifecycle.ts

import { initializeContextMenu } from '@/background/context-menu';
import { handleLifecycle } from '@/background/lifecycle';
import { logger } from '@/utils/logger';
import { getOpenSince } from '@/utils/metrics-store';
import { useFakeStorage } from '@tests/helpers/chrome-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/background/context-menu', () => ({
  initializeContextMenu: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('handleLifecycle', () => {
  beforeEach(() => {
    vi.mocked(initializeContextMenu).mockResolvedValue(undefined);
    useFakeStorage();
  });

  it('saves the session start time and creates the context menu', async () => {
    const before = Date.now();
    await handleLifecycle();
    const after = Date.now();

    const first = await getOpenSince();
    const second = await getOpenSince();
    expect(first).toBeGreaterThanOrEqual(before);
    expect(first).toBeLessThanOrEqual(after);
    expect(second).toBe(first);
    expect(initializeContextMenu).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('writes only the openSince key to session storage and nothing to local storage', async () => {
    await handleLifecycle();
    await handleLifecycle();
    const keys = vi
      .mocked(chrome.storage.session.set)
      .mock.calls.flatMap(([items]) => Object.keys(items));
    expect(new Set(keys)).toEqual(new Set(['openSince']));
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('resolves and logs one error when session storage rejects', async () => {
    chrome.storage.session.set = vi.fn().mockRejectedValue(new Error('quota'));
    await expect(handleLifecycle()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('Lifecycle handler failed', { error: 'quota' });
  });

  it('still creates the context menu when session storage rejects', async () => {
    chrome.storage.session.set = vi.fn().mockRejectedValue(new Error('quota'));
    await handleLifecycle();
    expect(initializeContextMenu).toHaveBeenCalledTimes(1);
  });

  it('resolves and logs one error when the context menu fails', async () => {
    vi.mocked(initializeContextMenu).mockRejectedValue(new Error('menu failed'));
    await expect(handleLifecycle()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('Lifecycle handler failed', {
      error: 'menu failed',
    });
  });
});
