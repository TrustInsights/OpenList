// Unit tests for hooks/useFormat.ts

import { useFormat } from '@/hooks/useFormat';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFakeStorage } from '@tests/helpers/chrome-storage';
import { describe, expect, it, vi } from 'vitest';

describe('useFormat', () => {
  it("starts at 'URL' and persists the change", async () => {
    const storage = useFakeStorage();
    const { result } = renderHook(() => useFormat());
    expect(result.current.format).toBe('URL');
    await act(async () => {});
    act(() => result.current.changeFormat('Markdown'));
    expect(result.current.format).toBe('Markdown');
    await waitFor(() => expect(storage.local.settings).toEqual({ format: 'Markdown' }));
  });

  it('reads the remembered format on mount', async () => {
    const storage = useFakeStorage();
    storage.local.settings = { format: 'CSV' };
    const { result } = renderHook(() => useFormat());
    await waitFor(() => expect(result.current.format).toBe('CSV'));
  });

  it('keeps a choice made before the stored format arrives', async () => {
    const storage = useFakeStorage();
    storage.local.settings = { format: 'CSV' };
    const { result } = renderHook(() => useFormat());
    act(() => result.current.changeFormat('JSON'));
    await act(async () => {});
    expect(result.current.format).toBe('JSON');
    await waitFor(() => expect(storage.local.settings).toEqual({ format: 'JSON' }));
  });

  it("keeps 'URL' when the stored format cannot be read", async () => {
    useFakeStorage();
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage down'));
    const { result } = renderHook(() => useFormat());
    await act(async () => {});
    expect(result.current.format).toBe('URL');
    act(() => result.current.changeFormat('CSV'));
    expect(result.current.format).toBe('CSV');
  });

  it('keeps the new format when saving fails', async () => {
    const storage = useFakeStorage({ failLocalSets: 1 });
    const { result } = renderHook(() => useFormat());
    await act(async () => {});
    act(() => result.current.changeFormat('BBCode'));
    await act(async () => {});
    expect(result.current.format).toBe('BBCode');
    expect(storage.local.settings).toBeUndefined();
  });
});
