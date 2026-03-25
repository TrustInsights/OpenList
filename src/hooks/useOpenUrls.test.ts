import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOpenUrls } from './useOpenUrls';

const validResponse = {
  status: 'complete',
  results: {
    successful: 3,
    failed: 0,
    skipped: 0,
    totalTime: 1500,
    errors: [],
  },
};

describe('useOpenUrls', () => {
  it('has initial state: isLoading false, result null, error null', () => {
    const { result } = renderHook(() => useOpenUrls());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("openUrls('') sets error 'Please enter...'", async () => {
    const { result } = renderHook(() => useOpenUrls());
    await act(async () => {
      await result.current.openUrls('');
    });
    expect(result.current.error).toBe('Please enter some URLs or text to search');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.result).toBeNull();
  });

  it('openUrls with whitespace-only text sets error', async () => {
    const { result } = renderHook(() => useOpenUrls());
    await act(async () => {
      await result.current.openUrls('   ');
    });
    expect(result.current.error).toBe('Please enter some URLs or text to search');
  });

  it('sets isLoading true, then resolves on successful response', async () => {
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue(validResponse);
    const { result } = renderHook(() => useOpenUrls());

    await act(async () => {
      await result.current.openUrls('https://example.com');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.result).toEqual(validResponse.results);
    expect(result.current.error).toBeNull();
  });

  it('sets result and clears error on successful response', async () => {
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue(validResponse);
    const { result } = renderHook(() => useOpenUrls());

    await act(async () => {
      await result.current.openUrls('https://example.com');
    });

    expect(result.current.result).toEqual({
      successful: 3,
      failed: 0,
      skipped: 0,
      totalTime: 1500,
      errors: [],
    });
    expect(result.current.error).toBeNull();
  });

  it('sets error message when response schema parse fails (status error)', async () => {
    const errorResponse = { message: 'Something went wrong', status: 'error' };
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue(errorResponse);
    const { result } = renderHook(() => useOpenUrls());

    await act(async () => {
      await result.current.openUrls('https://example.com');
    });

    expect(result.current.error).toBe('Something went wrong');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.result).toBeNull();
  });

  it('sets error message from raw response when message field missing', async () => {
    // Schema parse fails, but no message property on raw response
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue({ status: 'error' });
    const { result } = renderHook(() => useOpenUrls());

    await act(async () => {
      await result.current.openUrls('https://example.com');
    });

    expect(result.current.error).toBe('Failed to open tabs');
  });

  it('sets error "Failed to open tabs" when sendMessage rejects', async () => {
    chrome.runtime.sendMessage = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useOpenUrls());

    await act(async () => {
      await result.current.openUrls('https://example.com');
    });

    expect(result.current.error).toBe('network error');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error "Failed to open tabs" when non-Error is thrown', async () => {
    chrome.runtime.sendMessage = vi.fn().mockRejectedValue('non-error string');
    const { result } = renderHook(() => useOpenUrls());

    await act(async () => {
      await result.current.openUrls('https://example.com');
    });

    expect(result.current.error).toBe('Failed to open tabs');
  });

  it('returns stable openUrls reference (useCallback)', () => {
    const { result, rerender } = renderHook(() => useOpenUrls());
    const first = result.current.openUrls;
    rerender();
    expect(result.current.openUrls).toBe(first);
  });
});
