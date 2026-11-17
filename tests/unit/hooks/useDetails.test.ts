// Unit tests for hooks/useDetails.ts

import { useDetails } from '@/hooks/useDetails';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFakeStorage } from '@tests/helpers/chrome-storage';
import { describe, expect, it, vi } from 'vitest';

const TOTALS = { tabsOpened: 8, tabsFailed: 2, urlsProcessed: 10, lastError: null };

describe('useDetails', () => {
  it('starts with zero totals and no session start', () => {
    useFakeStorage();
    const { result } = renderHook(() => useDetails());
    expect(result.current.totals).toEqual({
      tabsOpened: 0,
      tabsFailed: 0,
      urlsProcessed: 0,
      lastError: null,
    });
    expect(result.current.openSince).toBe(0);
  });

  it('reads totals and openSince once and refresh reads again; it sets no interval', async () => {
    const storage = useFakeStorage();
    storage.local.totals = TOTALS;
    storage.session.openSince = 1000;
    const interval = vi.spyOn(globalThis, 'setInterval');
    const { result } = renderHook(() => useDetails());
    await act(async () => {});
    expect(result.current.totals).toEqual(TOTALS);
    expect(result.current.openSince).toBe(1000);
    expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);

    storage.local.totals = { ...TOTALS, tabsOpened: 12, urlsProcessed: 14 };
    storage.session.openSince = 2000;
    await act(async () => result.current.refresh());
    expect(result.current.totals.tabsOpened).toBe(12);
    expect(result.current.openSince).toBe(2000);
    expect(chrome.storage.local.get).toHaveBeenCalledTimes(2);
    expect(interval).not.toHaveBeenCalled();
    interval.mockRestore();
  });

  it('keeps the last values when a read fails', async () => {
    const storage = useFakeStorage();
    storage.local.totals = TOTALS;
    const { result } = renderHook(() => useDetails());
    await waitFor(() => expect(result.current.totals).toEqual(TOTALS));
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('gone'));
    await act(async () => result.current.refresh());
    expect(result.current.totals).toEqual(TOTALS);
  });
});
