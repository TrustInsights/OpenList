// Unit tests for utils/formatters.ts: exact output, groups, and examples

import { FORMATS, type Format } from '@/schemas/settings';
import type { TabRecord } from '@/schemas/tab';
import { formatExample, formatTabs } from '@/utils/formatters';
import { TAB as t, TAB_TWO as t2 } from '@tests/helpers/tabs';
import { describe, expect, it } from 'vitest';

const ESCAPED_URL = 'https://example.com/a_(b)?x=1&amp;y=2';
const ESCAPED_TITLE = 'Fish &amp; Chips [v2]';

/** Formats one tab and returns the text. */
function textOf(format: Format, tab: TabRecord = t): string {
  return formatTabs(format, [[tab]]).text;
}

describe('formatTabs: one tab, exact text', () => {
  it('URL', () => {
    expect(textOf('URL')).toBe(t.url);
  });

  it('Title', () => {
    expect(textOf('Title')).toBe(t.title);
  });

  it('Title & URL', () => {
    expect(textOf('Title & URL')).toBe(`Fish & Chips [v2]: ${t.url}`);
  });

  it('Markdown escapes the title and encodes the URL', () => {
    expect(textOf('Markdown')).toBe(
      '- [Fish & Chips \\[v2\\]](https://example.com/a_%28b%29?x=1&y=2)'
    );
  });

  it('Markdown escapes a backslash and encodes spaces', () => {
    const tab = { ...t, title: 'a\\b', url: 'https://example.com/a b' };
    expect(textOf('Markdown', tab)).toBe('- [a\\\\b](https://example.com/a%20b)');
  });

  it('BBCode swaps brackets in the title for parentheses', () => {
    expect(textOf('BBCode')).toBe(`[url=${t.url}]Fish & Chips (v2)[/url]`);
  });

  it('HTML wraps one ul and has no html part', () => {
    const payload = formatTabs('HTML', [[t]]);
    expect(payload.text).toBe(
      `<ul>\n  <li><a href="${ESCAPED_URL}">${ESCAPED_TITLE}</a></li>\n</ul>`
    );
    expect(payload.html).toBeUndefined();
  });

  it('Link gives Title (URL) text and an anchor as html', () => {
    const payload = formatTabs('Link', [[t]]);
    expect(payload.text).toBe(`Fish & Chips [v2] (${t.url})`);
    expect(payload.html).toBe(`<a href="${ESCAPED_URL}">${ESCAPED_TITLE}</a>`);
  });

  it('CSV has a header and one quoted row', () => {
    expect(textOf('CSV')).toBe(
      `title,url,window,index,pinned,active\n"Fish & Chips [v2]","${t.url}",1,0,false,true`
    );
  });

  it('JSON is a two-space array without empty optional keys', () => {
    const text = textOf('JSON');
    expect(JSON.parse(text)).toEqual([
      {
        title: 'Fish & Chips [v2]',
        url: t.url,
        windowId: 1,
        index: 0,
        pinned: false,
        active: true,
        groupId: -1,
      },
    ]);
    expect(text).toBe(JSON.stringify(JSON.parse(text), null, 2));
    expect(text).not.toContain('favIconUrl');
    expect(text).not.toContain('lastAccessed');
  });

  it('JSON keeps favIconUrl and writes lastAccessed as an ISO date', () => {
    const tab = { ...t, favIconUrl: 'https://example.com/i.png', lastAccessed: 1_700_000_000_000 };
    const [record] = JSON.parse(textOf('JSON', tab));
    expect(record.favIconUrl).toBe('https://example.com/i.png');
    expect(record.lastAccessed).toBe('2023-11-14T22:13:20.000Z');
  });

  it('JSON omits a lastAccessed value that is not a date', () => {
    const [record] = JSON.parse(textOf('JSON', { ...t, lastAccessed: Number.NaN }));
    expect(record).not.toHaveProperty('lastAccessed');
  });

  it('HTML table has a header row, a rendered row, and equal text and html', () => {
    const payload = formatTabs('HTML table', [[t]]);
    expect(payload.text).toBe(
      `<table>\n  <tr><th>Title</th><th>URL</th><th>Window</th></tr>\n  <tr><td>${ESCAPED_TITLE}</td><td><a href="${ESCAPED_URL}">${ESCAPED_URL}</a></td><td>1</td></tr>\n</table>`
    );
    expect(payload.html).toBe(payload.text);
  });
});

describe('formatTabs: groups', () => {
  it('joins text-format groups with a blank line', () => {
    expect(formatTabs('URL', [[t], [t2]]).text).toBe(`${t.url}\n\n${t2.url}`);
    expect(formatTabs('URL', [[t, t2]]).text).toBe(`${t.url}\n${t2.url}`);
  });

  it('gives HTML one ul per group', () => {
    const text = formatTabs('HTML', [[t], [t2]]).text;
    expect(text.match(/<ul>/g)).toHaveLength(2);
    expect(text).toContain('</ul>\n\n<ul>');
  });

  it('joins Link groups with a blank line in text and a double break in html', () => {
    const payload = formatTabs('Link', [[t, t2], [t]]);
    expect(payload.text.split('\n')).toHaveLength(4);
    expect(payload.html?.split('<br>')).toHaveLength(4);
    expect(payload.html).toContain('<br><br>');
  });

  it('keeps CSV, JSON, and HTML table flat with one header', () => {
    const csv = formatTabs('CSV', [[t], [t2]]).text.split('\n');
    expect(csv).toHaveLength(3);
    expect(csv[0]).toBe('title,url,window,index,pinned,active');
    expect(JSON.parse(formatTabs('JSON', [[t], [t2]]).text)).toHaveLength(2);
    const table = formatTabs('HTML table', [[t], [t2]]).text;
    expect(table.match(/<table>/g)).toHaveLength(1);
    expect(table.match(/<th>Title<\/th>/g)).toHaveLength(1);
    expect(table.match(/<tr><td>/g)).toHaveLength(2);
  });

  it.each(FORMATS)('%s gives empty text for no tabs and ignores empty groups', (format) => {
    expect(formatTabs(format, [])).toEqual({ text: '' });
    expect(formatTabs(format, [[], []])).toEqual({ text: '' });
    expect(formatTabs(format, [[], [t]])).toEqual(formatTabs(format, [[t]]));
  });
});

describe('formatExample', () => {
  it('Markdown gives the first item', () => {
    expect(formatExample('Markdown', t)).toBe(
      '- [Fish & Chips \\[v2\\]](https://example.com/a_%28b%29?x=1&y=2)'
    );
  });

  it('CSV gives the data row only', () => {
    expect(formatExample('CSV', t)).toBe(`"Fish & Chips [v2]","${t.url}",1,0,false,true`);
  });

  it('gives one line with no wrapper for every format', () => {
    for (const format of FORMATS) {
      const example = formatExample(format, t);
      expect(example).not.toContain('\n');
      expect(example).not.toMatch(/^<(ul|table)>/);
      if (format !== 'JSON') expect(formatTabs(format, [[t]]).text).toContain(example);
    }
  });

  it('HTML gives the li, JSON the compact object, HTML table the row', () => {
    expect(formatExample('HTML', t)).toBe(`<li><a href="${ESCAPED_URL}">${ESCAPED_TITLE}</a></li>`);
    expect(JSON.parse(formatExample('JSON', t)).url).toBe(t.url);
    expect(formatExample('HTML table', t)).toMatch(/^<tr><td>/);
  });
});
