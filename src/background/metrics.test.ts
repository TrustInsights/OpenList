// Unit tests for background/metrics.ts

import {
  batchIncrementMetrics,
  getMetrics,
  getSwState,
  incrementMetric,
  recordError,
  setMetrics,
  setSwState,
} from '@/background/metrics';
import { DEFAULT_METRICS, DEFAULT_SW_STATE } from '@/schemas/metrics';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('getMetrics', () => {
  it('returns DEFAULT_METRICS with current startTime when storage is empty', async () => {
    const before = Date.now();
    chrome.storage.session.get = vi.fn().mockResolvedValue({});
    const result = await getMetrics();
    const after = Date.now();

    expect(result.tabsOpened).toBe(0);
    expect(result.tabsFailed).toBe(0);
    expect(result.urlsProcessed).toBe(0);
    expect(result.lastError).toBeNull();
    expect(result.lastOperation).toBeNull();
    expect(result.startTime).toBeGreaterThanOrEqual(before);
    expect(result.startTime).toBeLessThanOrEqual(after);
  });

  it('returns stored metrics when they exist and are valid', async () => {
    const stored = {
      tabsOpened: 5,
      tabsFailed: 1,
      urlsProcessed: 6,
      lastError: 'some error',
      startTime: 12345,
      lastOperation: null,
    };
    chrome.storage.session.get = vi.fn().mockResolvedValue({ metrics: stored });
    const result = await getMetrics();
    expect(result).toEqual(stored);
  });

  it('returns DEFAULT_METRICS when stored data fails Zod validation (corrupted storage)', async () => {
    const corrupted = { tabsOpened: 'not-a-number', invalid: true };
    chrome.storage.session.get = vi.fn().mockResolvedValue({ metrics: corrupted });
    const before = Date.now();
    const result = await getMetrics();
    const after = Date.now();

    expect(result.tabsOpened).toBe(0);
    expect(result.tabsFailed).toBe(0);
    expect(result.startTime).toBeGreaterThanOrEqual(before);
    expect(result.startTime).toBeLessThanOrEqual(after);
  });
});

describe('setMetrics', () => {
  it('calls chrome.storage.session.set with correct key', async () => {
    const metrics = {
      ...DEFAULT_METRICS,
      startTime: Date.now(),
      tabsOpened: 3,
    };
    await setMetrics(metrics);
    expect(chrome.storage.session.set).toHaveBeenCalledWith({ metrics });
  });

  it('passes the metrics object through unchanged', async () => {
    const metrics = {
      tabsOpened: 7,
      tabsFailed: 2,
      urlsProcessed: 9,
      lastError: 'oops',
      startTime: 99999,
      lastOperation: null,
    };
    await setMetrics(metrics);
    expect(chrome.storage.session.set).toHaveBeenCalledWith({ metrics });
  });
});

describe('incrementMetric', () => {
  beforeEach(() => {
    const stored = {
      tabsOpened: 10,
      tabsFailed: 2,
      urlsProcessed: 12,
      lastError: null,
      startTime: 1000,
      lastOperation: null,
    };
    chrome.storage.session.get = vi.fn().mockResolvedValue({ metrics: stored });
    chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);
  });

  it('increments tabsOpened correctly', async () => {
    await incrementMetric('tabsOpened');
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      metrics: expect.objectContaining({ tabsOpened: 11 }),
    });
  });

  it('increments tabsFailed correctly', async () => {
    await incrementMetric('tabsFailed');
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      metrics: expect.objectContaining({ tabsFailed: 3 }),
    });
  });

  it('increments by custom amount', async () => {
    await incrementMetric('urlsProcessed', 5);
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      metrics: expect.objectContaining({ urlsProcessed: 17 }),
    });
  });
});

describe('recordError', () => {
  it('sets lastError field in stored metrics', async () => {
    const stored = {
      tabsOpened: 0,
      tabsFailed: 0,
      urlsProcessed: 0,
      lastError: null,
      startTime: 1000,
      lastOperation: null,
    };
    chrome.storage.session.get = vi.fn().mockResolvedValue({ metrics: stored });
    chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);

    await recordError('something broke');
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      metrics: expect.objectContaining({ lastError: 'something broke' }),
    });
  });
});

describe('getSwState', () => {
  it('returns DEFAULT_SW_STATE when storage is empty', async () => {
    chrome.storage.session.get = vi.fn().mockResolvedValue({});
    const result = await getSwState();
    expect(result).toEqual(DEFAULT_SW_STATE);
  });

  it('returns stored SW state when it exists and is valid', async () => {
    const stored = {
      installTime: 111,
      activationTime: 222,
      restarts: 3,
      lastContextMenuCreation: 333,
    };
    chrome.storage.session.get = vi.fn().mockResolvedValue({ swState: stored });
    const result = await getSwState();
    expect(result).toEqual(stored);
  });

  it('returns DEFAULT_SW_STATE when stored data fails Zod validation', async () => {
    const corrupted = { installTime: 'not-a-number', invalid: true };
    chrome.storage.session.get = vi.fn().mockResolvedValue({ swState: corrupted });
    const result = await getSwState();
    expect(result).toEqual(DEFAULT_SW_STATE);
  });
});

describe('setSwState', () => {
  it('calls chrome.storage.session.set with correct key', async () => {
    const state = { ...DEFAULT_SW_STATE, restarts: 2 };
    await setSwState(state);
    expect(chrome.storage.session.set).toHaveBeenCalledWith({ swState: state });
  });

  it('passes the state object through unchanged', async () => {
    const state = {
      installTime: 100,
      activationTime: 200,
      restarts: 1,
      lastContextMenuCreation: 300,
    };
    await setSwState(state);
    expect(chrome.storage.session.set).toHaveBeenCalledWith({ swState: state });
  });
});

describe('batchIncrementMetrics', () => {
  const stored = {
    tabsOpened: 10,
    tabsFailed: 2,
    urlsProcessed: 12,
    lastError: null,
    startTime: 1000,
    lastOperation: null,
  };

  beforeEach(() => {
    chrome.storage.session.get = vi.fn().mockResolvedValue({ metrics: stored });
    chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);
  });

  it('increments all three counters in a single write', async () => {
    await batchIncrementMetrics({ tabsOpened: 3, tabsFailed: 1, urlsProcessed: 4 });
    expect(chrome.storage.session.set).toHaveBeenCalledTimes(1);
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      metrics: expect.objectContaining({
        tabsOpened: 13,
        tabsFailed: 3,
        urlsProcessed: 16,
      }),
    });
  });

  it('uses 0 for omitted fields', async () => {
    await batchIncrementMetrics({ tabsOpened: 5 });
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      metrics: expect.objectContaining({
        tabsOpened: 15,
        tabsFailed: 2,
        urlsProcessed: 12,
      }),
    });
  });

  it('preserves unrelated fields', async () => {
    await batchIncrementMetrics({ urlsProcessed: 2 });
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      metrics: expect.objectContaining({ lastError: null, startTime: 1000 }),
    });
  });
});
