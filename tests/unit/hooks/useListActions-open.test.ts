// Unit tests for hooks/useListActions.ts: the Open action

import { act, waitFor } from '@testing-library/react';
import { deferred } from '@tests/helpers/hook-env';
import { renderActions } from '@tests/helpers/list-harness';
import { describe, expect, it, vi } from 'vitest';

/** Builds the service worker reply for the lines that opened. */
function reply(opened: string[], errors: string[] = []): unknown {
  return {
    status: 'complete',
    results: {
      successful: opened.length,
      failed: errors.length,
      errors,
      opened,
    },
  };
}

const SIX = ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => `https://${s}.com/`);
const send = vi.mocked(chrome.runtime.sendMessage);

describe('useListActions open', () => {
  it('open() sends the batch only, removes the opened lines, and reports the skips', async () => {
    const actions = await renderActions(SIX.join('\n'), { open: SIX.slice(0, 2) });
    send.mockResolvedValue(reply(SIX.slice(2)));
    await act(async () => actions.current.open());
    expect(send).toHaveBeenCalledWith({ action: 'openList', urls: SIX.slice(2) });
    expect(actions.current.text).toBe('');
    expect(actions.current.status).toBe('Opened 4, skipped 2 already open.');
    expect(actions.current.error).toBeNull();
  });

  it('open() reports only the opened count when nothing was skipped', async () => {
    const actions = await renderActions('https://a.com\nhttps://b.com');
    send.mockResolvedValue(reply(['https://a.com/', 'https://b.com/']));
    await act(async () => actions.current.open());
    expect(actions.current.status).toBe('Opened 2.');
    expect(actions.current.text).toBe('');
  });

  it("open() when nothing opens leaves the text unchanged and sets 'All 6 URLs are already open.'", async () => {
    const text = SIX.join('\n');
    const actions = await renderActions(text, { open: SIX });
    send.mockClear();
    await act(async () => actions.current.open());
    expect(send).not.toHaveBeenCalled();
    expect(actions.current.text).toBe(text);
    expect(actions.current.status).toBe('All 6 URLs are already open.');
  });

  it('open() names one open URL in the singular', async () => {
    const actions = await renderActions('https://a.com', { open: ['https://a.com/'] });
    await act(async () => actions.current.open());
    expect(actions.current.status).toBe('All 1 URL is already open.');
  });

  it('open() on an empty list sets the error and sends no message', async () => {
    const actions = await renderActions('  \n ');
    send.mockClear();
    await act(async () => actions.current.open());
    expect(actions.current.error).toBe('Please enter some URLs or text to search.');
    expect(send).not.toHaveBeenCalled();
  });

  it('open() keeps a failed URL in the list and names it in the error', async () => {
    const actions = await renderActions('https://a.com\nhttps://b.com');
    send.mockResolvedValue(reply(['https://a.com/'], ['Failed to open https://b.com/: boom']));
    await act(async () => actions.current.open());
    expect(actions.current.text).toBe('https://b.com');
    expect(actions.current.error).toBe('Failed to open https://b.com/: boom');
    expect(actions.current.status).toBe('Opened 1.');
  });

  it('open() with every URL failed keeps the text and shows the errors', async () => {
    const actions = await renderActions('https://a.com');
    send.mockResolvedValue(reply([], ['Invalid URL: x', 'Failed to open y: z']));
    await act(async () => actions.current.open());
    expect(actions.current.text).toBe('https://a.com');
    expect(actions.current.error).toBe('Invalid URL: x\nFailed to open y: z');
    expect(actions.current.status).toBe('');
  });

  it("open() with an empty reply sets 'Failed to open tabs'", async () => {
    const actions = await renderActions('https://a.com');
    send.mockResolvedValue(reply([]));
    await act(async () => actions.current.open());
    expect(actions.current.error).toBe('Failed to open tabs');
  });

  it("open() sets 'Failed to open tabs' when the reply fails the schema", async () => {
    const actions = await renderActions('https://a.com');
    send.mockResolvedValue({ status: 'error' });
    await act(async () => actions.current.open());
    expect(actions.current.error).toBe('Failed to open tabs');
    expect(actions.current.text).toBe('https://a.com');
  });

  it('open() shows the message when sendMessage rejects', async () => {
    const actions = await renderActions('https://a.com');
    send.mockRejectedValue(new Error('worker asleep'));
    await act(async () => actions.current.open());
    expect(actions.current.error).toBe('worker asleep');
    expect(actions.current.running).toBe(false);
  });

  it('open() sends search terms as search addresses and removes them when they open', async () => {
    const actions = await renderActions('best pizza\nhttps://a.com');
    send.mockResolvedValue(
      reply(['https://www.google.com/search?q=best%20pizza', 'https://a.com/'])
    );
    await act(async () => actions.current.open());
    expect(send).toHaveBeenCalledWith({
      action: 'openList',
      urls: ['https://www.google.com/search?q=best%20pizza', 'https://a.com/'],
    });
    expect(actions.current.text).toBe('');
  });

  it('running is true while the message is in flight', async () => {
    const actions = await renderActions('https://a.com');
    const gate = deferred<unknown>();
    send.mockReturnValue(gate.promise);
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = actions.current.open();
    });
    await waitFor(() => expect(actions.current.running).toBe(true));
    await act(async () => {
      gate.resolve(reply(['https://a.com/']));
      await pending;
    });
    expect(actions.current.running).toBe(false);
  });

  it("after the first batch of 45 the label reads 'Open next 20 of 25'", async () => {
    const urls = Array.from({ length: 45 }, (_, i) => `https://x.com/${i}`);
    const actions = await renderActions(urls.join('\n'));
    expect(actions.current.openLabel).toBe('Open first 20 of 45');
    send.mockResolvedValue(reply(urls.slice(0, 20)));
    await act(async () => actions.current.open());
    expect(actions.current.text.split('\n')).toHaveLength(25);
    expect(actions.current.openLabel).toBe('Open next 20 of 25');
    act(() => actions.current.setText(urls.join('\n')));
    expect(actions.current.openLabel).toBe('Open first 20 of 45');
  });
});
