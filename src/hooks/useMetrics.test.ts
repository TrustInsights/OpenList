import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMetrics } from './useMetrics';

// A valid metrics response fixture
function makeMetricsResponse(
  overrides: Partial<{
    tabsOpened: number;
    tabsFailed: number;
    urlsProcessed: number;
    uptime: number;
  }> = {}
) {
  return {
    metrics: {
      tabsOpened: overrides.tabsOpened ?? 0,
      tabsFailed: overrides.tabsFailed ?? 0,
      urlsProcessed: overrides.urlsProcessed ?? 0,
      lastError: null,
      startTime: 1000,
      lastOperation: null,
    },
    serviceWorkerState: {
      installTime: null,
      activationTime: null,
      restarts: 0,
      lastContextMenuCreation: null,
    },
    uptime: overrides.uptime ?? 0,
  };
}

describe('useMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns default state initially', () => {
    // Keep the sendMessage promise pending so no state update occurs
    chrome.runtime.sendMessage = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMetrics());
    expect(result.current).toEqual({
      successRate: '100',
      tabsOpened: 0,
      tabsFailed: 0,
      uptime: '0s',
      error: false,
    });
  });

  it('calls getMetrics message on mount', () => {
    chrome.runtime.sendMessage = vi.fn().mockReturnValue(new Promise(() => {}));
    renderHook(() => useMetrics());
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'getMetrics' });
  });

  it('updates state when valid metrics response arrives', async () => {
    const mockResponse = makeMetricsResponse({
      tabsOpened: 10,
      tabsFailed: 2,
      urlsProcessed: 20,
      uptime: 5000,
    });
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useMetrics());

    // Flush the resolved promise microtasks inside act
    await act(async () => {});

    expect(result.current.tabsOpened).toBe(10);
    expect(result.current.tabsFailed).toBe(2);
    expect(result.current.error).toBe(false);
    expect(result.current.uptime).toBe('5s');
  });

  it('sets error:true when response fails Zod parse', async () => {
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue({ invalid: true });

    const { result } = renderHook(() => useMetrics());
    await act(async () => {});

    expect(result.current.error).toBe(true);
  });

  it('sets error:true when sendMessage rejects', async () => {
    chrome.runtime.sendMessage = vi.fn().mockRejectedValue(new Error('connection failed'));

    const { result } = renderHook(() => useMetrics());
    await act(async () => {});

    expect(result.current.error).toBe(true);
  });

  it('computes successRate as percentage of tabsOpened/urlsProcessed', async () => {
    const mockResponse = makeMetricsResponse({
      tabsOpened: 8,
      tabsFailed: 2,
      urlsProcessed: 10,
    });
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useMetrics());
    await act(async () => {});

    // 8/10 * 100 = 80.0
    expect(result.current.successRate).toBe('80.0');
  });

  it('returns successRate of "100" when urlsProcessed is zero', async () => {
    const mockResponse = makeMetricsResponse({ urlsProcessed: 0 });
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useMetrics());
    await act(async () => {});

    expect(result.current.successRate).toBe('100');
    expect(result.current.error).toBe(false);
  });

  it('polls every 5000ms and cleans up interval on unmount', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue(makeMetricsResponse());

    const { unmount } = renderHook(() => useMetrics());

    // Flush initial fetch
    await act(async () => {});

    // Advance to trigger the 5000ms polling interval once
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await act(async () => {});

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
