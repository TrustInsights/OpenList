// Unit tests for the opened list in the openList reply

import { openList } from '@/background/open-list';
import * as metricsModule from '@/utils/metrics-store';
import * as tabsModule from '@/utils/tabs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('openList opened', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(tabsModule, 'createTab').mockResolvedValue({ id: 1 } as chrome.tabs.Tab);
    vi.spyOn(metricsModule, 'addTotals').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the URLs that opened a tab in opened', async () => {
    const promise = openList(['https://a.com', 'https://b.com']);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.opened).toEqual(['https://a.com', 'https://b.com']);
  });

  it('opened leaves out the URLs that failed', async () => {
    (tabsModule.createTab as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 1 } as chrome.tabs.Tab)
      .mockRejectedValueOnce(new Error('tab creation error'))
      .mockResolvedValueOnce({ id: 3 } as chrome.tabs.Tab);

    const promise = openList(['https://a.com', 'https://bad.com', 'https://b.com']);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.opened).toEqual(['https://a.com', 'https://b.com']);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('opened stops at the tab cap', async () => {
    const urls = Array.from({ length: 25 }, (_, i) => `https://example${i}.com`);
    const promise = openList(urls);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.opened).toEqual(urls.slice(0, 20));
  });
});
