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
    vi.spyOn(metricsModule, 'recordError').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the input lines that opened a tab in opened', async () => {
    const promise = openList('https://a.com\nhttps://b.com');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.opened).toEqual(['https://a.com', 'https://b.com']);
  });

  it('opened leaves out blank, invalid, and failed lines and keeps search text', async () => {
    (tabsModule.createTab as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 1 } as chrome.tabs.Tab)
      .mockRejectedValueOnce(new Error('tab creation error'))
      .mockResolvedValueOnce({ id: 3 } as chrome.tabs.Tab);

    const promise = openList('  https://a.com  \n\nhttps://\nhttps://b.com\nbest pizza');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.opened).toEqual(['https://a.com', 'best pizza']);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(2);
  });

  it('opened stops at the tab cap', async () => {
    const lines = Array.from({ length: 25 }, (_, i) => `https://example${i}.com`);
    const promise = openList(lines.join('\n'));
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.opened).toEqual(lines.slice(0, 20));
  });
});
