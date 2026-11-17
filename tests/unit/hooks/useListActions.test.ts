// Unit tests for hooks/useListActions.ts: labels, example, and copy

import type { TabRecord } from '@/schemas/tab';
import { act, waitFor } from '@testing-library/react';
import { stubClipboard } from '@tests/helpers/hook-env';
import { renderActions } from '@tests/helpers/list-harness';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let clipboard = stubClipboard();

/** Builds a known tab for a URL. */
function known(title: string, url: string): TabRecord {
  return { title, url, windowId: 1, index: 0, pinned: false, active: false, groupId: -1 };
}

const THREE = 'https://a.com\nhttps://b.com\nhttps://c.com';
const KNOWN = [
  known('Alpha', 'https://a.com/'),
  known('Beta', 'https://b.com/'),
  known('Gamma', 'https://c.com/'),
];

beforeEach(() => {
  clipboard = stubClipboard();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useListActions labels and example', () => {
  it("copyLabel is 'Copy 3 as Markdown' for 3 URL lines", async () => {
    const actions = await renderActions(THREE, { format: 'Markdown' });
    expect(actions.current.copyLabel).toBe('Copy 3 as Markdown');
  });

  it('copyLabel counts URLs only, not search lines', async () => {
    const actions = await renderActions('https://a.com\nbest pizza', { format: 'CSV' });
    expect(actions.current.copyLabel).toBe('Copy 1 as CSV');
  });

  it("openLabel is 'Open 0 URLs' when all are open", async () => {
    const actions = await renderActions(THREE, {
      open: ['https://a.com/', 'https://b.com/', 'https://c.com/'],
    });
    await waitFor(() => expect(actions.current.openLabel).toBe('Open 0 URLs'));
  });

  it('openLabel counts only the URLs that are not open and uses the singular', async () => {
    const actions = await renderActions(THREE, { open: ['https://a.com/', 'https://b.com/'] });
    await waitFor(() => expect(actions.current.openLabel).toBe('Open 1 URL'));
  });

  it('an open tab that is still loading counts through its pending URL', async () => {
    const actions = await renderActions('https://a.com\nhttps://b.com', {
      tabs: [{ pendingUrl: 'https://a.com/' }, {}],
    });
    await waitFor(() => expect(actions.current.openLabel).toBe('Open 1 URL'));
  });

  it('example shows the first URL in the format, with the known title', async () => {
    const actions = await renderActions(THREE, { known: KNOWN, format: 'Markdown' });
    expect(actions.current.example).toBe('- [Alpha](https://a.com/)');
  });

  it('example is empty for an empty list', async () => {
    const actions = await renderActions('', { format: 'Markdown' });
    expect(actions.current.example).toBe('');
  });

  it('example is cut with an ellipsis when long', async () => {
    const actions = await renderActions('https://a.com', {
      known: [known('T'.repeat(300), 'https://a.com/')],
      format: 'Title',
    });
    expect(actions.current.example).toBe(`${'T'.repeat(79)}…`);
  });

  it('a failed tab lookup leaves the label working', async () => {
    const actions = await renderActions('https://a.com', { tabs: new Error('no tabs') });
    expect(actions.current.openLabel).toBe('Open 1 URL');
  });
});

describe('useListActions copy', () => {
  it("copy() writes the formatted payload and sets status 'Copied 3 as Markdown.'", async () => {
    const actions = await renderActions(THREE, { known: KNOWN, format: 'Markdown' });
    await act(async () => actions.current.copy());
    expect(clipboard.writeText).toHaveBeenCalledWith(
      '- [Alpha](https://a.com/)\n- [Beta](https://b.com/)\n- [Gamma](https://c.com/)'
    );
    expect(actions.current.status).toBe('Copied 3 as Markdown.');
    expect(actions.current.error).toBeNull();
  });

  it('copy() uses the URL as the title when no tab matches', async () => {
    const actions = await renderActions('https://z.com', { format: 'Title' });
    await act(async () => actions.current.copy());
    expect(clipboard.writeText).toHaveBeenCalledWith('https://z.com/');
  });

  it('copy() writes both flavors for a rich format', async () => {
    const actions = await renderActions('https://a.com', { known: KNOWN, format: 'Link' });
    await act(async () => actions.current.copy());
    expect(clipboard.write).toHaveBeenCalledTimes(1);
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copy() with search lines sets the skipped note', async () => {
    const urls = [1, 2, 3, 4, 5].map((n) => `https://s${n}.com`);
    const text = [...urls, 'best pizza'].join('\n');
    const actions = await renderActions(text, { format: 'Markdown' });
    await act(async () => actions.current.copy());
    expect(actions.current.status).toBe('Copied 5 as Markdown, skipped 1 search term.');
  });

  it('copy() names two skipped search terms in the plural', async () => {
    const actions = await renderActions('https://a.com\npizza\ntacos', { format: 'URL' });
    await act(async () => actions.current.copy());
    expect(actions.current.status).toBe('Copied 1 as URL, skipped 2 search terms.');
  });

  it('copy() keeps the blank-line groups for a text format', async () => {
    const actions = await renderActions('https://a.com\n\nhttps://b.com', { format: 'URL' });
    await act(async () => actions.current.copy());
    expect(clipboard.writeText).toHaveBeenCalledWith('https://a.com/\n\nhttps://b.com/');
  });

  it("copy() with an empty list sets 'Nothing to copy.'", async () => {
    const actions = await renderActions('', { format: 'Markdown' });
    await act(async () => actions.current.copy());
    expect(actions.current.status).toBe('Nothing to copy.');
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("copy() with search terms only sets 'Nothing to copy.'", async () => {
    const actions = await renderActions('best pizza', { format: 'Markdown' });
    await act(async () => actions.current.copy());
    expect(actions.current.status).toBe('Nothing to copy.');
  });

  it('copy() reports a clipboard failure as an error', async () => {
    clipboard.writeText.mockRejectedValue(new Error('Document is not focused'));
    const actions = await renderActions('https://a.com', { format: 'URL' });
    await act(async () => actions.current.copy());
    expect(actions.current.error).toBe('Document is not focused');
    expect(actions.current.status).toBe('');
    expect(actions.current.running).toBe(false);
  });

  it('a new copy clears the earlier error', async () => {
    clipboard.writeText.mockRejectedValueOnce(new Error('first'));
    const actions = await renderActions('https://a.com', { format: 'URL' });
    await act(async () => actions.current.copy());
    await act(async () => actions.current.copy());
    expect(actions.current.error).toBeNull();
    expect(actions.current.status).toBe('Copied 1 as URL.');
  });
});
