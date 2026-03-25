import { createTab } from '@/utils/tabs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
});

describe('createTab', () => {
  it('creates a tab successfully and returns the tab object', async () => {
    const mockTab = { id: 1, url: 'https://example.com' };
    vi.mocked(chrome.tabs.create).mockResolvedValueOnce(mockTab as unknown as undefined);

    const result = await createTab('https://example.com');

    expect(result).toEqual(mockTab);
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com',
      active: false,
    });
  });

  it('uses active: false when creating a tab', async () => {
    const mockTab = { id: 2, url: 'https://test.com' };
    vi.mocked(chrome.tabs.create).mockResolvedValueOnce(mockTab as unknown as undefined);

    await createTab('https://test.com');

    expect(chrome.tabs.create).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });

  it('retries on failure and succeeds on the second attempt', async () => {
    const mockTab = { id: 3, url: 'https://retry.com' };
    vi.mocked(chrome.tabs.create)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(mockTab as unknown as undefined);

    vi.useFakeTimers();
    const promise = createTab('https://retry.com');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(mockTab);
    expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries', async () => {
    const error = new Error('persistent failure');
    vi.mocked(chrome.tabs.create).mockRejectedValue(error);

    vi.useFakeTimers();

    // Attach rejection handler immediately to prevent unhandled rejection
    const promise = createTab('https://fail.com', 2);
    const caught = promise.catch((e: unknown) => e);

    // Advance all timers to exhaust retries
    await vi.runAllTimersAsync();

    const result = await caught;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('persistent failure');
    expect(chrome.tabs.create).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});
