// Unit tests for utils/extract-urls.ts

import { parseList, urlKey } from '@/utils/extract-urls';
import { describe, expect, it } from 'vitest';

describe('parseList: line by line', () => {
  it('reads a mixed list of address, site, and search', () => {
    expect(parseList('https://a.com\nexample.com\nbest pizza').entries).toEqual([
      { kind: 'url', url: 'https://a.com/', line: 0 },
      { kind: 'url', url: 'https://example.com/', line: 1 },
      { kind: 'search', term: 'best pizza', line: 2 },
    ]);
  });

  it('removes repeats', () => {
    expect(parseList('https://a.com\nhttps://a.com/').entries).toHaveLength(1);
  });

  it('ends a group at a blank line', () => {
    const parsed = parseList('https://a.com\n\nhttps://b.com');
    expect(parsed.groups).toHaveLength(2);
    expect(parsed.groups[1]).toEqual([{ kind: 'url', url: 'https://b.com/', line: 2 }]);
  });

  it('does not make empty groups from repeated blank lines', () => {
    expect(parseList('\n\nhttps://a.com\n\n\n\nhttps://b.com\n\n').groups).toHaveLength(2);
  });

  it('returns no entries and no groups for empty text', () => {
    expect(parseList('')).toEqual({ entries: [], groups: [], structured: false });
  });

  it('handles Windows line endings, a tab, a BOM, and trailing spaces', () => {
    const clean = parseList('https://a.com\nexample.com\n');
    const messy = parseList('\uFEFFhttps://a.com \r\nexample.com\t\r\n');
    expect(messy.entries).toEqual(clean.entries);
    expect(messy.entries).toHaveLength(2);
  });

  it('reads old Mac line endings', () => {
    expect(parseList('https://a.com\rhttps://b.com').entries.map((e) => e.line)).toEqual([0, 1]);
  });

  it('upgrades http to https for a website', () => {
    expect(parseList('http://example.com').entries).toEqual([
      { kind: 'url', url: 'https://example.com/', line: 0 },
    ]);
    expect(parseList('http://a.com/x').entries).toEqual([
      { kind: 'url', url: 'https://a.com/x', line: 0 },
    ]);
  });

  it.each([
    'http://localhost:3000/a',
    'http://127.0.0.1:8080/',
    'http://[::1]:3000/',
    'http://dev.local/',
  ])('keeps http as typed for the local address %s', (address) => {
    expect(parseList(address).entries).toEqual([{ kind: 'url', url: address, line: 0 }]);
  });

  it('takes only the target of a Markdown item that Copy writes', () => {
    const entries = parseList(
      '- [See https://evil.example/ \\[x\\]](https://good.example/a%28b%29)'
    ).entries;
    expect(entries.map((e) => (e.kind === 'url' ? e.url : e.term))).toEqual([
      'https://good.example/a%28b%29',
    ]);
  });

  it('takes only the target of a BBCode item that Copy writes', () => {
    const entries = parseList(
      '[url=https://good.example/]See https://evil.example/ (x)[/url]'
    ).entries;
    expect(entries.map((e) => (e.kind === 'url' ? e.url : e.term))).toEqual([
      'https://good.example/',
    ]);
  });

  it('keeps several addresses on one line, in order', () => {
    const urls = parseList('see https://a.com and https://b.com/x.').entries.map((e) =>
      e.kind === 'url' ? e.url : e.term
    );
    expect(urls).toEqual(['https://a.com/', 'https://b.com/x']);
  });

  it('turns a line with a blocked protocol into a search, never a URL', () => {
    expect(parseList('javascript:alert(1)').entries).toEqual([
      { kind: 'search', term: 'javascript:alert(1)', line: 0 },
    ]);
  });

  it('skips an address that cannot be parsed', () => {
    expect(parseList('https://').entries).toEqual([]);
  });

  it('skips an address that does not parse inside a line', () => {
    expect(parseList('see https://%zz now').entries).toEqual([]);
  });

  it('skips a site-like line that does not parse', () => {
    expect(parseList('ftp://').entries).toEqual([]);
  });

  it('keeps repeated search terms', () => {
    expect(parseList('pizza\npizza').entries).toHaveLength(2);
  });
});

describe('parseList: formats that Copy writes', () => {
  it('reads JSON', () => {
    const parsed = parseList(
      '[{"title":"A","url":"https://a.com"},{"title":"B","url":"https://b.com"}]'
    );
    expect(parsed.structured).toBe(true);
    expect(parsed.entries).toEqual([
      { kind: 'url', url: 'https://a.com/', line: -1 },
      { kind: 'url', url: 'https://b.com/', line: -1 },
    ]);
    expect(parsed.groups).toHaveLength(1);
  });

  it('reads nested JSON in document order and skips non-URL url values', () => {
    const text = JSON.stringify({
      tabs: [{ url: 'https://a.com' }, { url: 'not a url' }, { url: 42 }, { x: { url: 'b.com' } }],
    });
    expect(parseList(text).entries.map((e) => (e.kind === 'url' ? e.url : ''))).toEqual([
      'https://a.com/',
      'https://b.com/',
    ]);
  });

  it('falls back to lines when JSON holds no URL', () => {
    const parsed = parseList('[1, 2]');
    expect(parsed.structured).toBe(false);
    expect(parsed.entries).toEqual([{ kind: 'search', term: '[1, 2]', line: 0 }]);
  });

  it('falls back to lines when bracket text is not JSON', () => {
    const parsed = parseList('[not json');
    expect(parsed.structured).toBe(false);
    expect(parsed.entries).toEqual([{ kind: 'search', term: '[not json', line: 0 }]);
  });

  it('reads CSV with the Copy header', () => {
    const parsed = parseList(
      'title,url,window,index,pinned,active\n"A","https://a.com",1,0,false,true'
    );
    expect(parsed.structured).toBe(true);
    expect(parsed.entries).toEqual([{ kind: 'url', url: 'https://a.com/', line: -1 }]);
  });

  it('reads CSV with quoted commas, doubled quotes, newlines, and Windows endings', () => {
    const text = [
      'title,url,window,index,pinned,active',
      '"a, ""b""\nc","https://a.com",1,0,false,true',
      '"D","https://d.com",1,1,false,false',
      '"short"',
      '',
    ].join('\r\n');
    expect(parseList(text).entries.map((e) => (e.kind === 'url' ? e.url : ''))).toEqual([
      'https://a.com/',
      'https://d.com/',
    ]);
  });

  it('reads CSV that ends inside a quoted field', () => {
    const text = 'title,url,window,index,pinned,active\n"A","https://a.com",1,0,false,true\n"B';
    expect(parseList(text).entries).toHaveLength(1);
  });

  it('gives an empty structured list for a CSV header alone', () => {
    expect(parseList('title,url,window,index,pinned,active')).toEqual({
      entries: [],
      groups: [],
      structured: true,
    });
  });

  it('reads HTML hrefs and decodes entities', () => {
    const parsed = parseList('<ul><li><a href="https://a.com/x?y=1&amp;z=2">A</a></li></ul>');
    expect(parsed.structured).toBe(true);
    expect(parsed.entries).toEqual([{ kind: 'url', url: 'https://a.com/x?y=1&z=2', line: -1 }]);
  });

  it('reads HTML with single quotes and every decoded entity', () => {
    const parsed = parseList(
      '<a href=\'https://a.com/?q=&quot;x&quot;&#39;&lt;&gt;\'>A</a><a href="mailto:a@b.c">M</a>'
    );
    expect(parsed.entries).toEqual([
      { kind: 'url', url: 'https://a.com/?q=%22x%22%27%3C%3E', line: -1 },
    ]);
  });

  it('decodes &amp;amp; once', () => {
    const parsed = parseList('<a href="https://a.com/?a=1&amp;amp;b=2">A</a>');
    expect(parsed.entries[0]).toEqual({ kind: 'url', url: 'https://a.com/?a=1&amp;b=2', line: -1 });
  });

  it('falls back to lines when HTML holds no link', () => {
    const parsed = parseList('<b>hello</b>');
    expect(parsed.structured).toBe(false);
    expect(parsed.entries).toEqual([{ kind: 'search', term: '<b>hello</b>', line: 0 }]);
  });

  it('reads Markdown with an escaped parenthesis', () => {
    const [entry] = parseList('- [A](https://a.com/p_%28q%29)').entries;
    expect(entry?.kind === 'url' && urlKey(entry.url)).toBe(urlKey('https://a.com/p_(q)'));
  });

  it('reads BBCode', () => {
    expect(parseList('[url=https://a.com/x]A[/url]').entries).toEqual([
      { kind: 'url', url: 'https://a.com/x', line: 0 },
    ]);
  });

  it('reads the plain Link format with balanced parentheses', () => {
    expect(parseList('A (https://a.com/p_(q))').entries).toEqual([
      { kind: 'url', url: 'https://a.com/p_(q)', line: 0 },
    ]);
  });

  it('strips trailing punctuation from an address', () => {
    expect(parseList('Go to https://a.com/x?!.,;:').entries).toEqual([
      { kind: 'url', url: 'https://a.com/x', line: 0 },
    ]);
  });

  it('reads Title and URL lines', () => {
    expect(
      parseList('Example Domain - https://example.com/\nB - https://b.com/').entries
    ).toHaveLength(2);
  });
});

describe('parseList: size', () => {
  it('parses 5,000 URLs in under 200 ms', () => {
    const text = Array.from({ length: 5000 }, (_, i) => `https://x.com/${i}`).join('\n');
    const start = performance.now();
    const parsed = parseList(text);
    const elapsed = performance.now() - start;
    expect(parsed.entries).toHaveLength(5000);
    expect(elapsed).toBeLessThan(200);
  });
});
