// Unit tests for background/open-list.ts

import { openList } from '@/background/open-list';
import * as metricsModule from '@/utils/metrics-store';
import * as tabsModule from '@/utils/tabs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('openList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(tabsModule, 'createTab').mockResolvedValue({
      id: 1,
      url: 'https://example.com',
    } as chrome.tabs.Tab);
    vi.spyOn(metricsModule, 'addTotals').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('empty array → opens nothing and counts nothing', async () => {
    const promise = openList([]);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(0);
    expect(tabsModule.createTab).not.toHaveBeenCalled();
  });

  it('opens each URL in order, unchanged', async () => {
    const urls = [
      'https://a.com/',
      'https://www.google.com/search?q=best%20pizza',
      'https://b.com/x',
    ];
    const promise = openList(urls);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(3);
    expect(tabsModule.createTab).toHaveBeenNthCalledWith(1, urls[0]);
    expect(tabsModule.createTab).toHaveBeenNthCalledWith(2, urls[1]);
    expect(tabsModule.createTab).toHaveBeenNthCalledWith(3, urls[2]);
  });

  it('respects MAX_TABS limit (stops after 20)', async () => {
    const urls = Array.from({ length: 25 }, (_, i) => `https://example${i}.com`);

    const promise = openList(urls);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(20);
    expect(tabsModule.createTab).toHaveBeenCalledTimes(20);
  });

  it('createTab failure → increments failed, adds to errors array', async () => {
    (tabsModule.createTab as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('tab creation error')
    );

    const promise = openList(['https://example.com']);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.failed).toBe(1);
    expect(result.successful).toBe(0);
    expect(result.errors).toEqual(['Failed to open https://example.com: tab creation error']);
  });

  it('updates metrics in storage once, at the end', async () => {
    const promise = openList(['https://a.com', 'https://b.com']);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(2);
    expect(metricsModule.addTotals).toHaveBeenCalledTimes(1);
    expect(metricsModule.addTotals).toHaveBeenCalledWith({
      tabsOpened: 2,
      tabsFailed: 0,
      urlsProcessed: 2,
    });
  });

  it('totalTime is set and non-negative', async () => {
    const promise = openList(['https://example.com']);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalTime).toBeGreaterThanOrEqual(0);
  });
});
