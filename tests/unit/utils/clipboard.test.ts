// Unit tests for utils/clipboard.ts

import {
  hasClipboardPermission,
  readClipboardUrls,
  requestClipboardPermission,
  writeClipboard,
} from '@/utils/clipboard';
import { urlKey } from '@/utils/extract-urls';
import { formatTabs } from '@/utils/formatters';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const readText = vi.fn();
const writeText = vi.fn();
const write = vi.fn();
const contains = chrome.permissions.contains as ReturnType<typeof vi.fn>;
const request = chrome.permissions.request as ReturnType<typeof vi.fn>;

/** Records the arguments of each ClipboardItem built by the code under test. */
const items: Record<string, Blob>[] = [];

beforeEach(() => {
  items.length = 0;
  readText.mockReset().mockResolvedValue('');
  writeText.mockReset().mockResolvedValue(undefined);
  write.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { readText, writeText, write } });
  vi.stubGlobal(
    'ClipboardItem',
    class {
      constructor(data: Record<string, Blob>) {
        items.push(data);
      }
    }
  );
  contains.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('permission helpers', () => {
  it('hasClipboardPermission asks chrome.permissions.contains for clipboardRead and clipboardWrite', async () => {
    expect(await hasClipboardPermission()).toBe(true);
    expect(contains).toHaveBeenCalledWith({ permissions: ['clipboardRead', 'clipboardWrite'] });
  });

  it('hasClipboardPermission returns false when the permission is missing', async () => {
    contains.mockResolvedValue(false);
    expect(await hasClipboardPermission()).toBe(false);
  });

  it('requestClipboardPermission asks chrome.permissions.request for clipboardRead and clipboardWrite', async () => {
    request.mockResolvedValue(true);
    expect(await requestClipboardPermission()).toBe(true);
    expect(request).toHaveBeenCalledWith({ permissions: ['clipboardRead', 'clipboardWrite'] });
  });

  it('requestClipboardPermission returns false when the user declines', async () => {
    request.mockResolvedValue(false);
    expect(await requestClipboardPermission()).toBe(false);
  });
});

describe('readClipboardUrls', () => {
  it('returns null when permission is missing and never calls readText', async () => {
    contains.mockResolvedValue(false);
    expect(await readClipboardUrls()).toBeNull();
    expect(readText).not.toHaveBeenCalled();
  });

  it('returns the urls of "https://a.com\nhttps://b.com"', async () => {
    readText.mockResolvedValue('https://a.com\nhttps://b.com');
    expect(await readClipboardUrls()).toEqual(['https://a.com/', 'https://b.com/']);
  });

  it('leaves out search terms and keeps only web addresses (parseList upgrades a website to https)', async () => {
    readText.mockResolvedValue('plain words\nhttp://a.com\nftp://old.example/file');
    expect(await readClipboardUrls()).toEqual(['https://a.com/']);
  });

  it('does not count a site-like line as a web address (spec 7: http and https only)', async () => {
    readText.mockResolvedValue('example.com\nnode.js\nhttps://a.com\nhttps://b.com');
    expect(await readClipboardUrls()).toEqual(['https://a.com/', 'https://b.com/']);
  });

  const hostile = {
    title: 'See https://evil.example/x for more',
    url: 'https://example.com/a_(b)?x=1&y=2',
    windowId: 1,
    index: 0,
    pinned: false,
    active: true,
    groupId: -1,
  };

  it.each(['Markdown', 'BBCode', 'Title & URL', 'Link'] as const)(
    "reads only the tab address from OpenList's own %s output (a hostile title adds no page)",
    async (format) => {
      readText.mockResolvedValue(
        formatTabs(format, [[hostile, { ...hostile, url: 'https://example.net/b' }]]).text
      );
      expect((await readClipboardUrls())?.map(urlKey)).toEqual([
        urlKey('https://example.com/a_(b)?x=1&y=2'),
        urlKey('https://example.net/b'),
      ]);
    }
  );

  it.each(['HTML', 'HTML table'] as const)(
    "decodes the address in OpenList's own %s output",
    async (format) => {
      readText.mockResolvedValue(
        formatTabs(format, [[hostile, { ...hostile, url: 'https://example.net/b?p=1&q=2' }]]).text
      );
      expect(await readClipboardUrls()).toEqual([
        'https://example.com/a_(b)?x=1&y=2',
        'https://example.net/b?p=1&q=2',
      ]);
    }
  );

  it('reads hostile text at the size limit in well under two seconds', async () => {
    readText.mockResolvedValue(' (https://a'.repeat(90_000));
    const started = performance.now();
    await readClipboardUrls();
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('keeps http for a local address', async () => {
    readText.mockResolvedValue('http://localhost:3000/a\nhttp://a.com');
    expect(await readClipboardUrls()).toEqual(['http://localhost:3000/a', 'https://a.com/']);
  });

  it('returns an empty list for text with no URL', async () => {
    readText.mockResolvedValue('nothing here');
    expect(await readClipboardUrls()).toEqual([]);
  });

  it('returns null when readText rejects', async () => {
    readText.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    expect(await readClipboardUrls()).toBeNull();
  });

  it('returns null when the permission check rejects', async () => {
    contains.mockRejectedValue(new Error('no permissions api'));
    expect(await readClipboardUrls()).toBeNull();
    expect(readText).not.toHaveBeenCalled();
  });

  it('returns null for a 1,000,001-character text without parsing it', async () => {
    readText.mockResolvedValue(`https://a.com/${'x'.repeat(1_000_001 - 14)}`);
    const started = performance.now();
    expect(await readClipboardUrls()).toBeNull();
    expect(performance.now() - started).toBeLessThan(200);
  });

  it('still reads a text of exactly 1,000,000 characters', async () => {
    readText.mockResolvedValue(`https://a.com/${'x'.repeat(1_000_000 - 14)}`);
    const urls = await readClipboardUrls();
    expect(urls).toHaveLength(1);
  });
});

describe('writeClipboard', () => {
  it('calls write with both flavors for a payload with html', async () => {
    await writeClipboard({ text: 'source', html: '<b>rich</b>' });
    expect(write).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    const [item] = items;
    expect(Object.keys(item ?? {})).toEqual(['text/plain', 'text/html']);
    expect(await item?.['text/plain']?.text()).toBe('source');
    expect(item?.['text/plain']?.type).toBe('text/plain');
    expect(await item?.['text/html']?.text()).toBe('<b>rich</b>');
    expect(item?.['text/html']?.type).toBe('text/html');
  });

  it('calls writeText for a payload without html', async () => {
    await writeClipboard({ text: 'plain' });
    expect(writeText).toHaveBeenCalledWith('plain');
    expect(write).not.toHaveBeenCalled();
  });
});
