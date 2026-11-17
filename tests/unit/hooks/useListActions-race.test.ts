// Unit tests for hooks/useListActions.ts: Open looks up the open tabs again before it plans

import { useListActions } from '@/hooks/useListActions';
import { act, renderHook, waitFor } from '@testing-library/react';
import { deferred } from '@tests/helpers/hook-env';
import { renderActions } from '@tests/helpers/list-harness';
import { describe, expect, it, vi } from 'vitest';

const send = vi.mocked(chrome.runtime.sendMessage);
const query = vi.mocked(chrome.tabs.query);

describe('useListActions open race', () => {
  it('an Open before the first tab lookup lands does not open a tab that is already open', async () => {
    const gate = deferred<chrome.tabs.Tab[]>();
    query.mockReturnValue(gate.promise);
    const view = renderHook(() =>
      useListActions({ text: 'https://a.com', setText: () => undefined, known: [], format: 'URL' })
    );
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = view.result.current.open();
    });
    await waitFor(() => expect(view.result.current.running).toBe(true));
    await act(async () => {
      gate.resolve([{ url: 'https://a.com/' } as chrome.tabs.Tab]);
      await pending;
    });
    expect(send).not.toHaveBeenCalled();
    expect(view.result.current.status).toBe('All 1 URL is already open.');
    expect(view.result.current.running).toBe(false);
  });

  it('skips a tab that was opened after the popup loaded', async () => {
    const actions = await renderActions('https://a.com\nhttps://b.com', { open: [] });
    query.mockResolvedValue([{ url: 'https://a.com/' } as chrome.tabs.Tab]);
    send.mockResolvedValue({
      status: 'complete',
      results: { successful: 1, failed: 0, errors: [], opened: ['https://b.com/'] },
    });
    await act(async () => actions.current.open());
    expect(send).toHaveBeenCalledWith({ action: 'openList', urls: ['https://b.com/'] });
    expect(actions.current.status).toBe('Opened 1, skipped 1 already open.');
  });

  it('plans from the last known tabs when the new lookup fails', async () => {
    const actions = await renderActions('https://a.com', { open: ['https://a.com/'] });
    query.mockRejectedValue(new Error('no tabs'));
    await act(async () => actions.current.open());
    expect(send).not.toHaveBeenCalled();
    expect(actions.current.status).toBe('All 1 URL is already open.');
  });
});
