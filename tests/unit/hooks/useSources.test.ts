// Unit tests for hooks/useSources.ts

import { useSources } from '@/hooks/useSources';
import { act, renderHook, waitFor } from '@testing-library/react';
import { deferred, mockWindows, siteTab, stubClipboard } from '@tests/helpers/hook-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contains = chrome.permissions.contains as ReturnType<typeof vi.fn>;
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

describe('useSources default source', () => {
  it("picks 'selected' when two tabs are highlighted", async () => {
    mockWindows([
      [
        siteTab(1, { active: true, highlighted: true }),
        siteTab(2, { highlighted: true }),
        siteTab(3),
      ],
    ]);
    const { result } = await loaded();
    expect(result.current.source).toBe('selected');
    expect(result.current.text).toBe('https://site1.com/\nhttps://site2.com/');
    expect(result.current.notice).toBe('');
    expect(result.current.options.map((o) => o.label)).toEqual([
      'Selected tabs (2)',
      'This window (3)',
      'This tab (1)',
      'All windows (3)',
    ]);
  });

  it("picks 'clipboard' when the clipboard holds URLs and permission is granted", async () => {
    contains.mockResolvedValue(true);
    clipboard.readText.mockResolvedValue(FIVE.join('\n'));
    const { result } = await loaded();
    expect(result.current.source).toBe('clipboard');
    expect(result.current.text).toBe(FIVE.join('\n'));
    expect(result.current.notice).toBe('Using 5 URLs from your clipboard.');
    expect(result.current.clipboardPrompt).toBe('hidden');
    expect(result.current.options[0].label).toBe('Clipboard (5 URLs)');
  });

  it("picks 'clipboard' when the clipboard holds exactly 2 URLs", async () => {
    contains.mockResolvedValue(true);
    clipboard.readText.mockResolvedValue('https://clip1.com/\nhttps://clip2.com/');
    const { result } = await loaded();
    expect(result.current.source).toBe('clipboard');
    expect(result.current.text).toBe('https://clip1.com/\nhttps://clip2.com/');
    expect(result.current.notice).toBe('Using 2 URLs from your clipboard.');
    expect(result.current.options[0].label).toBe('Clipboard (2 URLs)');
  });

  it("picks 'window' when the clipboard holds 1 URL", async () => {
    contains.mockResolvedValue(true);
    clipboard.readText.mockResolvedValue('https://clip1.com/');
    const { result } = await loaded();
    expect(result.current.source).toBe('window');
    expect(result.current.text).toBe('https://site1.com/\nhttps://site2.com/\nhttps://site3.com/');
    expect(result.current.notice).toBe('');
  });

  it("picks 'tab' for a one-tab window", async () => {
    mockWindows([[siteTab(1, { active: true })]]);
    const { result } = await loaded();
    expect(result.current.source).toBe('tab');
    expect(result.current.text).toBe('https://site1.com/');
  });

  it('a rejected readText leaves the window source and no notice', async () => {
    contains.mockResolvedValue(true);
    clipboard.readText.mockRejectedValue(new Error('denied'));
    const { result } = await loaded();
    expect(result.current.source).toBe('window');
    expect(result.current.notice).toBe('');
    expect(result.current.clipboardPrompt).toBe('hidden');
  });

  it('an empty window starts at window with an empty list', async () => {
    mockWindows([[]]);
    const { result } = renderHook(() => useSources());
    // The prompt leaves 'hidden' only when the load has ended, because no permission is granted.
    await waitFor(() => expect(result.current.clipboardPrompt).toBe('button'));
    expect(result.current.source).toBe('window');
    expect(result.current.text).toBe('');
  });

  it('sets a notice when the tabs cannot be read', async () => {
    vi.mocked(chrome.windows.getAll).mockRejectedValue(new Error('no windows'));
    const { result } = renderHook(() => useSources());
    await waitFor(() => expect(result.current.notice).toBe('Could not read your open tabs.'));
    expect(result.current.text).toBe('');
  });
});

describe('useSources unmount', () => {
  it('ignores a load that ends after the popup unmounts', async () => {
    const gate = deferred<chrome.windows.Window[]>();
    vi.mocked(chrome.windows.getAll).mockReturnValue(gate.promise);
    const { result, unmount } = renderHook(() => useSources());
    unmount();
    await act(async () => gate.resolve([]));
    expect(result.current.text).toBe('');
    expect(result.current.known).toEqual([]);
  });

  it('ignores a load failure that ends after the popup unmounts', async () => {
    const gate = deferred<chrome.windows.Window[]>();
    vi.mocked(chrome.windows.getAll).mockReturnValue(
      (async () => {
        await gate.promise;
        throw new Error('late');
      })()
    );
    const { result, unmount } = renderHook(() => useSources());
    unmount();
    await act(async () => gate.resolve([]));
    expect(result.current.notice).toBe('');
  });
});

describe('useSources changes', () => {
  it('changeSource replaces edited text and names the source in the notice', async () => {
    mockWindows([[siteTab(1, { active: true }), siteTab(2)], [siteTab(3, { windowId: 2 })]]);
    const { result } = await loaded();
    act(() => result.current.setText('my own edit'));
    act(() => result.current.changeSource('all'));
    expect(result.current.source).toBe('all');
    expect(result.current.text).toBe(
      'https://site1.com/\nhttps://site2.com/\n\nhttps://site3.com/'
    );
    expect(result.current.notice).toBe('List replaced with 3 tabs from all windows.');
    act(() => result.current.changeSource('window'));
    expect(result.current.notice).toBe('List replaced with 2 tabs from this window.');
    act(() => result.current.changeSource('tab'));
    expect(result.current.text).toBe('https://site1.com/');
    expect(result.current.notice).toBe('List replaced with 1 tab from this tab.');
  });

  it('changeSource to selected and clipboard fills their URLs', async () => {
    contains.mockResolvedValue(true);
    clipboard.readText.mockResolvedValue(FIVE.join('\n'));
    mockWindows([
      [siteTab(1, { active: true, highlighted: true }), siteTab(2, { highlighted: true })],
    ]);
    const { result } = await loaded();
    act(() => result.current.changeSource('clipboard'));
    expect(result.current.notice).toBe('List replaced with 5 URLs from clipboard.');
    act(() => result.current.changeSource('selected'));
    expect(result.current.text).toBe('https://site1.com/\nhttps://site2.com/');
    expect(result.current.notice).toBe('List replaced with 2 tabs from selected tabs.');
  });

  it('changeSource to tab in a window without tabs gives an empty list', async () => {
    mockWindows([[]]);
    const { result } = renderHook(() => useSources());
    await waitFor(() => expect(result.current.clipboardPrompt).toBe('button'));
    act(() => result.current.changeSource('tab'));
    expect(result.current.text).toBe('');
  });

  it('typing never changes source', async () => {
    const { result } = await loaded();
    act(() => result.current.setText('anything\nhttps://x.com'));
    expect(result.current.source).toBe('window');
    expect(result.current.text).toBe('anything\nhttps://x.com');
    expect(result.current.notice).toBe('');
  });

  it('an edit made before the load ends is not overwritten', async () => {
    const gate = deferred<chrome.windows.Window[]>();
    vi.mocked(chrome.windows.getAll).mockReturnValue(gate.promise);
    const { result } = renderHook(() => useSources());
    act(() => result.current.setText('typed early'));
    await act(async () => gate.resolve([]));
    expect(result.current.text).toBe('typed early');
    expect(result.current.source).toBe('window');
  });
});
