// Unit tests for background/open-list.ts

import * as metricsModule from '@/background/metrics';
import { openList } from '@/background/open-list';
import * as tabsModule from '@/utils/tabs';
import * as urlsModule from '@/utils/urls';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('openList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default: createTab succeeds
    vi.spyOn(tabsModule, 'createTab').mockResolvedValue({
      id: 1,
      url: 'https://example.com',
    } as chrome.tabs.Tab);
    // Stub metric calls to avoid storage side effects
    vi.spyOn(metricsModule, 'incrementMetric').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('empty string → returns { successful:0, failed:0, skipped:0 }', async () => {
    const promise = openList('');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(1); // empty string splits into one empty line → skipped
  });

  it('all blank lines → all skipped', async () => {
    const promise = openList('\n\n\n');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(4);
  });

  it('valid URL → opens tab, returns successful:1', async () => {
    const promise = openList('https://example.com');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(tabsModule.createTab).toHaveBeenCalledWith('https://example.com/');
  });

  it('invalid URL (sanitizeUrl returns null) → failed:1', async () => {
    // Force sanitizeUrl to return null for a URL-like string
    vi.spyOn(urlsModule, 'sanitizeUrl').mockReturnValue(null);
    vi.spyOn(urlsModule, 'isProbablyUrl').mockReturnValue(true);

    const promise = openList('javascript:alert(1)');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.failed).toBe(1);
    expect(result.successful).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Invalid URL');
  });

  it('non-URL text → opens Google search URL', async () => {
    vi.spyOn(urlsModule, 'isProbablyUrl').mockReturnValue(false);

    const promise = openList('hello world');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(1);
    expect(tabsModule.createTab).toHaveBeenCalledWith(
      expect.stringContaining('https://www.google.com/search?q=')
    );
    expect(tabsModule.createTab).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('hello world'))
    );
  });

  it('respects MAX_TABS limit (stops after 20)', async () => {
    // Generate 25 valid URLs
    const urls = Array.from({ length: 25 }, (_, i) => `https://example${i}.com`).join('\n');

    const promise = openList(urls);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(20);
    expect(tabsModule.createTab).toHaveBeenCalledTimes(20);
  });

  it('mixed valid/invalid/blank → correct counts', async () => {
    vi.spyOn(urlsModule, 'isProbablyUrl').mockImplementation((s) => {
      if (typeof s !== 'string') return false;
      return s.startsWith('https://');
    });
    vi.spyOn(urlsModule, 'sanitizeUrl').mockImplementation((s) => {
      return s.startsWith('https://bad') ? null : s;
    });

    (tabsModule.createTab as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 1 } as chrome.tabs.Tab)
      .mockResolvedValueOnce({ id: 2 } as chrome.tabs.Tab);

    const input = [
      '', // skipped
      'https://good.com', // successful
      'https://bad.com', // failed (sanitize returns null)
      '  ', // skipped
      'https://good2.com', // successful
    ].join('\n');

    const promise = openList(input);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.skipped).toBe(2);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('createTab failure → increments failed, adds to errors array', async () => {
    (tabsModule.createTab as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('tab creation error')
    );

    const promise = openList('https://example.com');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.failed).toBe(1);
    expect(result.successful).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('tab creation error');
  });

  it('updates metrics in storage (batched at end)', async () => {
    const promise = openList('https://a.com\nhttps://b.com');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.successful).toBe(2);
    expect(metricsModule.incrementMetric).toHaveBeenCalledWith('tabsOpened', 2);
    expect(metricsModule.incrementMetric).toHaveBeenCalledWith('tabsFailed', 0);
    expect(metricsModule.incrementMetric).toHaveBeenCalledWith('urlsProcessed', 2);
  });

  it('totalTime is set and non-negative', async () => {
    const promise = openList('https://example.com');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.totalTime).toBeGreaterThanOrEqual(0);
  });
});
