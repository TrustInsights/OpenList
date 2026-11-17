// Unit tests for utils/metrics-store.ts

import { openList } from '@/background/open-list';
import * as store from '@/utils/metrics-store';
import {
  addTotals,
  getOpenSince,
  getTotals,
  markSessionStart,
  recordError,
} from '@/utils/metrics-store';
import * as tabsModule from '@/utils/tabs';
import { useFakeStorage } from '@tests/helpers/chrome-storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ZEROS = { tabsOpened: 0, tabsFailed: 0, urlsProcessed: 0, lastError: null };

describe('getTotals', () => {
  it('returns zeros and no error when storage is empty', async () => {
    useFakeStorage();
    expect(await getTotals()).toEqual(ZEROS);
  });

  it('returns the stored totals when they are valid', async () => {
    const fake = useFakeStorage();
    const stored = { tabsOpened: 5, tabsFailed: 1, urlsProcessed: 6, lastError: 'some error' };
    fake.local.totals = stored;
    expect(await getTotals()).toEqual(stored);
  });

  it('returns zeros for corrupt storage', async () => {
    const fake = useFakeStorage();
    fake.local.totals = { tabsOpened: 'not-a-number', invalid: true };
    expect(await getTotals()).toEqual(ZEROS);
    fake.local.totals = { ...ZEROS, tabsOpened: -3 };
    expect(await getTotals()).toEqual(ZEROS);
  });

  it('reads from local storage and never from session storage', async () => {
    const fake = useFakeStorage();
    fake.session.totals = { ...ZEROS, tabsOpened: 9 };
    expect(await getTotals()).toEqual(ZEROS);
  });
});

describe('addTotals', () => {
  it('adds to stored totals and keeps them across a simulated restart', async () => {
    const fake = useFakeStorage();
    await addTotals({ tabsOpened: 3, tabsFailed: 1, urlsProcessed: 4 });
    await markSessionStart(1000);
    fake.restart();
    expect(fake.session).toEqual({});
    await addTotals({ tabsOpened: 2, urlsProcessed: 2 });
    expect(await getTotals()).toEqual({ ...ZEROS, tabsOpened: 5, tabsFailed: 1, urlsProcessed: 6 });
    expect(await getOpenSince()).toBe(0);
  });

  it('uses 0 for omitted fields and keeps the last error', async () => {
    const fake = useFakeStorage();
    fake.local.totals = { tabsOpened: 10, tabsFailed: 2, urlsProcessed: 12, lastError: 'old' };
    await addTotals({ tabsOpened: 5 });
    expect(fake.local.totals).toEqual({
      tabsOpened: 15,
      tabsFailed: 2,
      urlsProcessed: 12,
      lastError: 'old',
    });
  });

  it('adds each counter alone and leaves the other counters unchanged', async () => {
    const fake = useFakeStorage();
    await addTotals({ tabsFailed: 2 });
    await addTotals({ urlsProcessed: 3 });
    await addTotals({});
    expect(fake.local.totals).toEqual({ ...ZEROS, tabsFailed: 2, urlsProcessed: 3 });
  });

  it('writes once, to local storage only', async () => {
    useFakeStorage();
    await addTotals({ tabsOpened: 1, tabsFailed: 1, urlsProcessed: 2 });
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    expect(chrome.storage.session.set).not.toHaveBeenCalled();
  });

  it('keeps every count when two increments run at once', async () => {
    const fake = useFakeStorage();
    await Promise.all([addTotals({ tabsOpened: 1 }), addTotals({ tabsOpened: 2 })]);
    expect(fake.local.totals).toEqual({ ...ZEROS, tabsOpened: 3 });
  });

  it('keeps every count when increments, errors, and session starts run at once', async () => {
    const fake = useFakeStorage();
    await Promise.all([
      markSessionStart(5000),
      addTotals({ tabsOpened: 2, tabsFailed: 1, urlsProcessed: 2 }),
      recordError('boom'),
      addTotals({ tabsOpened: 1, urlsProcessed: 1 }),
    ]);
    expect(fake.local.totals).toEqual({
      tabsOpened: 3,
      tabsFailed: 1,
      urlsProcessed: 3,
      lastError: 'boom',
    });
    expect(fake.session.openSince).toBe(5000);
  });

  it('runs the next write after a write whose set rejects', async () => {
    const fake = useFakeStorage({ failLocalSets: 1 });
    const first = addTotals({ tabsOpened: 1 });
    const second = addTotals({ tabsOpened: 2 });
    await expect(first).rejects.toThrow('quota');
    await second;
    expect(fake.local.totals).toEqual({ ...ZEROS, tabsOpened: 2 });
  });
});

describe('recordError', () => {
  it('sets lastError and keeps the counters', async () => {
    const fake = useFakeStorage();
    await addTotals({ tabsOpened: 2, urlsProcessed: 2 });
    await recordError('something broke');
    expect(fake.local.totals).toEqual({
      tabsOpened: 2,
      tabsFailed: 0,
      urlsProcessed: 2,
      lastError: 'something broke',
    });
  });

  it('cuts a very long message to 300 characters so the totals stay bounded', async () => {
    const fake = useFakeStorage();
    await recordError('x'.repeat(5000));
    expect((fake.local.totals as { lastError: string }).lastError).toBe('x'.repeat(300));
  });
});

describe('markSessionStart and getOpenSince', () => {
  beforeEach(() => {
    useFakeStorage();
  });

  it('returns 0 when no start time is saved', async () => {
    expect(await getOpenSince()).toBe(0);
  });

  it('returns the saved start time on repeated reads', async () => {
    await markSessionStart(1000);
    expect(await getOpenSince()).toBe(1000);
    expect(await getOpenSince()).toBe(1000);
  });

  it('uses the current time when no time is given', async () => {
    const before = Date.now();
    await markSessionStart();
    const after = Date.now();
    expect(await getOpenSince()).toBeGreaterThanOrEqual(before);
    expect(await getOpenSince()).toBeLessThanOrEqual(after);
  });

  it('returns 0 for a corrupt start time', async () => {
    chrome.storage.session.get = vi.fn().mockResolvedValue({ openSince: 'yesterday' });
    expect(await getOpenSince()).toBe(0);
  });

  it('writes only the openSince key, to session storage', async () => {
    await markSessionStart(7);
    expect(chrome.storage.session.set).toHaveBeenCalledWith({ openSince: 7 });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
});

describe('stored keys and exports', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a failed tab open in openList stores no URL and no search text in local storage', async () => {
    const fake = useFakeStorage();
    vi.spyOn(tabsModule, 'createTab').mockRejectedValue(new Error('tab creation error'));
    const result = await openList('https://secret.example/path\nbest pizza');
    expect(result.failed).toBe(2);
    expect(result.errors.join(' ')).toContain('secret.example');
    expect(fake.local.totals).toEqual({
      tabsOpened: 0,
      tabsFailed: 2,
      urlsProcessed: 2,
      lastError: 'Failed to open a tab: tab creation error',
    });
    const stored = JSON.stringify(fake.local);
    expect(stored).not.toContain('secret.example');
    expect(stored).not.toContain('best pizza');
  });

  it('Totals never hold URLs: the stored object has exactly the four counter keys', async () => {
    const fake = useFakeStorage();
    await addTotals({ tabsOpened: 1, tabsFailed: 1, urlsProcessed: 2 });
    await recordError('Failed to open one tab');
    expect(Object.keys(fake.local.totals as object).sort()).toEqual([
      'lastError',
      'tabsFailed',
      'tabsOpened',
      'urlsProcessed',
    ]);
  });

  it('writes no serviceWorkerState or metrics key to either area', async () => {
    const fake = useFakeStorage();
    await addTotals({ tabsOpened: 1 });
    await recordError('e');
    await markSessionStart(1);
    expect(Object.keys(fake.local)).toEqual(['totals']);
    expect(Object.keys(fake.session)).toEqual(['openSince']);
  });

  it('has no getMetrics, batchIncrementMetrics, or state exports', () => {
    for (const name of ['getMetrics', 'batchIncrementMetrics', 'getSwState', 'setSwState']) {
      expect(store).not.toHaveProperty(name);
    }
  });
});
