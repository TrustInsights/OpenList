// Unit tests for background/lifecycle.ts

import { initializeContextMenu } from '@/background/context-menu';
import { handleInstalled, handleStartup } from '@/background/lifecycle';
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

describe('handleStartup', () => {
  beforeEach(() => {
    vi.mocked(initializeContextMenu).mockResolvedValue(undefined);
    useFakeStorage();
  });

  it('saves the session start time and creates the context menu', async () => {
    const before = Date.now();
    await handleStartup();
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
    await handleStartup();
    await handleStartup();
    const keys = vi
      .mocked(chrome.storage.session.set)
      .mock.calls.flatMap(([items]) => Object.keys(items));
    expect(new Set(keys)).toEqual(new Set(['openSince']));
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('resolves and logs one error when session storage rejects', async () => {
    chrome.storage.session.set = vi.fn().mockRejectedValue(new Error('quota'));
    await expect(handleStartup()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('Lifecycle handler failed', { error: 'quota' });
  });

  it('still creates the context menu when session storage rejects', async () => {
    chrome.storage.session.set = vi.fn().mockRejectedValue(new Error('quota'));
    await handleStartup();
    expect(initializeContextMenu).toHaveBeenCalledTimes(1);
  });

  it('resolves and logs one error when the context menu fails', async () => {
    vi.mocked(initializeContextMenu).mockRejectedValue(new Error('menu failed'));
    await expect(handleStartup()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('Lifecycle handler failed', {
      error: 'menu failed',
    });
  });
});

describe('handleInstalled', () => {
  beforeEach(() => {
    vi.mocked(initializeContextMenu).mockResolvedValue(undefined);
    useFakeStorage();
  });

  it('saves the session start and creates the context menu', async () => {
    const before = Date.now();
    await handleInstalled();

    const openSince = await getOpenSince();
    const keys = vi
      .mocked(chrome.storage.session.set)
      .mock.calls.flatMap(([items]) => Object.keys(items));
    expect(openSince).toBeGreaterThanOrEqual(before);
    expect(new Set(keys)).toEqual(new Set(['openSince']));
    expect(initializeContextMenu).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('resolves and logs one error when session storage rejects', async () => {
    chrome.storage.session.set = vi.fn().mockRejectedValue(new Error('quota'));
    await expect(handleInstalled()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('Lifecycle handler failed', { error: 'quota' });
    expect(initializeContextMenu).toHaveBeenCalledTimes(1);
  });
});
