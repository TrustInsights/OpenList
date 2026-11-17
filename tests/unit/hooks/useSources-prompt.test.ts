// Unit tests for the clipboard prompt of hooks/useSources.ts

import { useSources } from '@/hooks/useSources';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFakeStorage } from '@tests/helpers/chrome-storage';
import { mockWindows, siteTab, stubClipboard } from '@tests/helpers/hook-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contains = chrome.permissions.contains as ReturnType<typeof vi.fn>;
const request = chrome.permissions.request as ReturnType<typeof vi.fn>;
let clipboard = stubClipboard();

/** Renders the hook and waits until the first load ends. */
async function loaded(): Promise<
  ReturnType<typeof renderHook<ReturnType<typeof useSources>, void>>
> {
  const view = renderHook(() => useSources());
  await waitFor(() => expect(view.result.current.known.length).toBeGreaterThan(0));
  return view;
}

const FIVE = [1, 2, 3, 4, 5].map((n) => `https://clip${n}.com/`);

beforeEach(() => {
  clipboard = stubClipboard();
  mockWindows([[siteTab(1, { active: true }), siteTab(2), siteTab(3)]]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useSources clipboard prompt', () => {
  it('shows a button, then moves to details after one dismissal', async () => {
    const { result } = await loaded();
    expect(result.current.clipboardPrompt).toBe('button');
    act(() => result.current.dismissPrompt());
    expect(result.current.clipboardPrompt).toBe('details');
  });

  it('keeps the dismissal for the next time the popup opens', async () => {
    const storage = useFakeStorage();
    const first = await loaded();
    expect(first.result.current.clipboardPrompt).toBe('button');
    act(() => first.result.current.dismissPrompt());
    expect(first.result.current.clipboardPrompt).toBe('details');
    await waitFor(() => expect(storage.local.clipboardPromptDismissed).toBe(true));
    first.unmount();
    const second = await loaded();
    expect(second.result.current.clipboardPrompt).toBe('details');
  });

  it('shows the button again when no dismissal was saved', async () => {
    useFakeStorage();
    const first = await loaded();
    first.unmount();
    const second = await loaded();
    expect(second.result.current.clipboardPrompt).toBe('button');
  });

  it('keeps the button when the saved dismissal cannot be read', async () => {
    vi.mocked(chrome.storage.local.get).mockRejectedValue(new Error('storage down'));
    const { result } = await loaded();
    expect(result.current.clipboardPrompt).toBe('button');
    expect(result.current.notice).toBe('');
  });

  it('keeps the details view for this visit when saving the dismissal fails', async () => {
    useFakeStorage({ failLocalSets: 1 });
    const { result } = await loaded();
    act(() => result.current.dismissPrompt());
    await act(async () => {});
    expect(result.current.clipboardPrompt).toBe('details');
  });

  it('enableClipboard grants, re-reads, and hides the prompt', async () => {
    const { result } = await loaded();
    request.mockResolvedValue(true);
    contains.mockResolvedValue(true);
    clipboard.readText.mockResolvedValue(FIVE.join('\n'));
    await act(async () => result.current.enableClipboard());
    expect(request).toHaveBeenCalledWith({ permissions: ['clipboardRead', 'clipboardWrite'] });
    expect(result.current.clipboardPrompt).toBe('hidden');
    expect(result.current.source).toBe('clipboard');
    expect(result.current.notice).toBe('Using 5 URLs from your clipboard.');
  });

  it('enableClipboard keeps a list the user touched', async () => {
    const { result } = await loaded();
    act(() => result.current.setText('my list'));
    request.mockResolvedValue(true);
    contains.mockResolvedValue(true);
    clipboard.readText.mockResolvedValue(FIVE.join('\n'));
    await act(async () => result.current.enableClipboard());
    expect(result.current.clipboardPrompt).toBe('hidden');
    expect(result.current.source).toBe('window');
    expect(result.current.text).toBe('my list');
    expect(result.current.options[0].label).toBe('Clipboard (5 URLs)');
  });

  it('enableClipboard keeps the prompt when the user declines', async () => {
    const { result } = await loaded();
    request.mockResolvedValue(false);
    await act(async () => result.current.enableClipboard());
    expect(result.current.clipboardPrompt).toBe('button');
    expect(clipboard.readText).not.toHaveBeenCalled();
  });

  it('enableClipboard hides the prompt when the new read finds nothing', async () => {
    const { result } = await loaded();
    request.mockResolvedValue(true);
    contains.mockResolvedValue(true);
    clipboard.readText.mockRejectedValue(new Error('blocked'));
    await act(async () => result.current.enableClipboard());
    expect(result.current.clipboardPrompt).toBe('hidden');
    expect(result.current.source).toBe('window');
  });
});
