// Unit tests for utils/formatters.ts: escaping, awkward titles, and the round trip through the extractor

import { FORMATS, type Format } from '@/schemas/settings';
import type { TabRecord } from '@/schemas/tab';
import { parseList, urlKey } from '@/utils/extract-urls';
import { formatTabs } from '@/utils/formatters';
import { TAB as t, TAB_TWO as t2 } from '@tests/helpers/tabs';
import { describe, expect, it } from 'vitest';

/** Formats one tab and returns the text. */
function textOf(format: Format, tab: TabRecord = t): string {
  return formatTabs(format, [[tab]]).text;
}

describe('formatTabs: escaping', () => {
  it('prefixes a formula title in CSV', () => {
    const row = textOf('CSV', { ...t, title: '=SUM(A1)' }).split('\n')[1];
    expect(row).toContain('"\'=SUM(A1)"');
  });

  it.each(['+1', '-1', '@a', '\tx'])('guards the CSV title %j', (title) => {
    const row = textOf('CSV', { ...t, title })
      .split('\n')
      .slice(1)
      .join('\n');
    expect(row.startsWith(`"'${title}"`)).toBe(true);
  });

  it('doubles quotes in CSV', () => {
    expect(textOf('CSV', { ...t, title: 'a "b"' })).toContain('"a ""b"""');
  });

  it('writes an empty window field for a tab the lookup did not match', () => {
    const lost = { ...t, windowId: 0 };
    expect(textOf('CSV', lost).split('\n')[1]).toBe(`"${t.title}","${t.url}",,0,false,true`);
    expect(textOf('HTML table', lost)).toContain('</a></td><td></td></tr>');
  });

  it('escapes the five dangerous characters in HTML', () => {
    const tab = { ...t, title: '<b>"x" & y</b>', url: 'https://example.com/?q="1"&r=<2>' };
    const text = textOf('HTML', tab);
    expect(text).toContain('href="https://example.com/?q=&quot;1&quot;&amp;r=&lt;2&gt;"');
    expect(text).toContain('&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
  });
});

describe('formatTabs: awkward titles (Review Focus 2)', () => {
  const awkward = { ...t, title: 'line1\nline2 🙂 \u202Eabc' };

  it.each(['URL', 'Title', 'Title & URL', 'Markdown', 'BBCode', 'Link'] as const)(
    '%s keeps one record on one line',
    (format) => {
      expect(textOf(format, awkward).split('\n')).toHaveLength(1);
    }
  );

  it('turns CR, LF, and CRLF into one space each in text formats', () => {
    const tab = { ...t, title: 'a\rb\r\nc\nd' };
    expect(textOf('Title', tab)).toBe('a b c d');
    expect(textOf('HTML', tab)).toContain('>a b c d</a>');
    expect(textOf('HTML table', tab)).toContain('<td>a b c d</td>');
  });

  it('keeps the newline in CSV and JSON and still gives one record', () => {
    const csv = textOf('CSV', awkward);
    expect(csv).toContain('"line1\nline2 🙂 \u202Eabc"');
    expect(parseList(csv).entries).toHaveLength(1);
    const [record] = JSON.parse(textOf('JSON', awkward));
    expect(record.title).toBe(awkward.title);
  });

  it('escapes the title in an HTML li', () => {
    expect(textOf('HTML', awkward)).toContain('<li><a href=');
    expect(textOf('HTML', awkward)).toContain('line1 line2 🙂 \u202Eabc</a></li>');
  });

  it('does not cut a 10,000-character title', () => {
    const long = 'x'.repeat(10_000);
    expect(textOf('Title', { ...t, title: long })).toHaveLength(10_000);
    expect(textOf('Markdown', { ...t, title: long })).toContain(long);
  });
});

describe('formatTabs: round trip', () => {
  const carriers = FORMATS.filter((format) => format !== 'Title');

  it.each(carriers)('%s reads back as the same page', (format) => {
    const entries = parseList(textOf(format)).entries;
    expect(entries.map((entry) => (entry.kind === 'url' ? urlKey(entry.url) : entry.term))).toEqual(
      [urlKey(t.url)]
    );
  });

  it.each(carriers)('%s reads back two groups of two pages', (format) => {
    const parsed = parseList(
      formatTabs(format, [[t, t2], [{ ...t2, url: 'https://example.net/' }]]).text
    );
    expect(parsed.entries).toHaveLength(3);
  });

  it.each(carriers)('%s keeps only the tab URL when the title holds an address', (format) => {
    const hostile = { ...t, title: 'See https://evil.example/x [y] for more' };
    const entries = parseList(textOf(format, hostile)).entries;
    expect(entries.map((entry) => (entry.kind === 'url' ? urlKey(entry.url) : entry.term))).toEqual(
      [urlKey(t.url)]
    );
  });

  it.each(carriers)('%s survives an awkward title', (format) => {
    const awkward = { ...t, title: 'line1\nline2 🙂 \u202Eabc [x] (y) "z" <w>' };
    const entries = parseList(textOf(format, awkward)).entries;
    expect(entries).toHaveLength(1);
  });
});
