// Unit tests for utils/open-plan.ts: the open plan, the button label, and the remaining text

import { parseList, urlKey } from '@/utils/extract-urls';
import {
  type OpenPlan,
  allOpen,
  entryUrl,
  openLabel,
  planOpen as planEntries,
  remainingText,
} from '@/utils/open-plan';
import { describe, expect, it } from 'vitest';

const CAP = 20;

/** Plans an Open click from the list text, as the popup does: parse once, then plan. */
function planOpen(text: string, openKeys: ReadonlySet<string>, cap: number): OpenPlan {
  return planEntries(parseList(text).entries, openKeys, cap);
}

/** Builds a list text of `count` distinct URLs, one per line. */
function manyUrls(count: number): string {
  return Array.from({ length: count }, (_, i) => `https://site${i}.com/page`).join('\n');
}

describe('entryUrl', () => {
  it('gives the url of a url entry', () => {
    expect(entryUrl({ kind: 'url', url: 'https://a.com/x?y=1', line: 0 })).toBe(
      'https://a.com/x?y=1'
    );
  });

  it('builds a Google search address for a search entry, with spaces and symbols encoded', () => {
    expect(entryUrl({ kind: 'search', term: 'best pizza & pasta?', line: 0 })).toBe(
      'https://www.google.com/search?q=best%20pizza%20%26%20pasta%3F'
    );
  });
});

describe('planOpen', () => {
  it('fills the batch up to the cap and leaves the rest waiting', () => {
    const plan = planOpen(manyUrls(45), new Set(), CAP);
    expect(plan.batch).toHaveLength(20);
    expect(plan.waiting).toHaveLength(25);
    expect(plan.skipped).toHaveLength(0);
  });

  it('skips open URLs and does not count them toward the cap', () => {
    const open = new Set(['https://site0.com/page', 'https://site1.com/page']);
    const plan = planOpen(manyUrls(45), open, CAP);
    expect(plan.skipped).toHaveLength(2);
    expect(plan.batch).toHaveLength(20);
    expect(plan.waiting).toHaveLength(23);
    expect(plan.batch[0]).toMatchObject({ url: 'https://site2.com/page' });
  });

  it('matches open keys the way urlKey writes them', () => {
    const plan = planOpen('https://a.com', new Set(['https://a.com/']), CAP);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.batch).toHaveLength(0);
  });

  it('counts an open http tab of a website as the https entry that the parser gives', () => {
    const plan = planOpen('http://a.com/x', new Set([urlKey('http://a.com/x')]), CAP);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.batch).toHaveLength(0);
  });

  it('counts an open local http tab as the same http entry', () => {
    const plan = planOpen(
      'http://127.0.0.1:8080/a.html',
      new Set([urlKey('http://127.0.0.1:8080/a.html')]),
      CAP
    );
    expect(plan.skipped).toHaveLength(1);
    expect(plan.batch).toHaveLength(0);
  });

  it('does not count an open local https tab as the http entry', () => {
    const plan = planOpen(
      'http://localhost:3000/a',
      new Set([urlKey('https://localhost:3000/a')]),
      CAP
    );
    expect(plan.skipped).toHaveLength(0);
    expect(plan.batch).toEqual([{ kind: 'url', url: 'http://localhost:3000/a', line: 0 }]);
  });

  it('never calls a search term open', () => {
    const plan = planOpen('best pizza', new Set(['best pizza']), CAP);
    expect(plan.skipped).toHaveLength(0);
    expect(plan.batch).toEqual([{ kind: 'search', term: 'best pizza', line: 0 }]);
  });

  it('plans 5,000 URLs in under 200 ms (Review Focus 1)', () => {
    const text = manyUrls(5000);
    const start = performance.now();
    const plan = planOpen(text, new Set(), CAP);
    const elapsed = performance.now() - start;
    expect(plan.batch).toHaveLength(20);
    expect(plan.waiting).toHaveLength(4980);
    expect(elapsed).toBeLessThan(200);
  });
});

describe('openLabel', () => {
  const plan = (text: string, open: string[] = []): OpenPlan => planOpen(text, new Set(open), CAP);

  it('counts URLs and uses the singular for one', () => {
    expect(openLabel(plan(manyUrls(3)), CAP, false)).toBe('Open 3 URLs');
    expect(openLabel(plan(manyUrls(1)), CAP, false)).toBe('Open 1 URL');
  });

  it('says first 20 of 45 for a long list', () => {
    expect(openLabel(plan(manyUrls(45)), CAP, false)).toBe('Open first 20 of 45');
  });

  it('says next 20 of 25 when it continues', () => {
    expect(openLabel(plan(manyUrls(25)), CAP, true)).toBe('Open next 20 of 25');
  });

  it('uses the plain count when a continuing list fits in one batch', () => {
    expect(openLabel(plan(manyUrls(5)), CAP, true)).toBe('Open 5 URLs');
  });

  it('excludes open URLs from the count and reads All open when every URL is open', () => {
    const six = manyUrls(6);
    const all = Array.from({ length: 6 }, (_, i) => `https://site${i}.com/page`);
    expect(openLabel(plan(six, all), CAP, false)).toBe('All open');
    expect(allOpen(plan(six, all))).toBe(true);
    expect(allOpen(plan(six, all.slice(0, 2)))).toBe(false);
    expect(openLabel(plan(six, all.slice(0, 2)), CAP, false)).toBe('Open 4 URLs');
  });
});

describe('allOpen', () => {
  it('is false for an empty list, which still reads Open 0 URLs', () => {
    expect(allOpen(planOpen('', new Set(), CAP))).toBe(false);
    expect(openLabel(planOpen('', new Set(), CAP), CAP, false)).toBe('Open 0 URLs');
  });
});

describe('remainingText', () => {
  const TEXT = 'https://a.com\nhttps://b.com\nnote\nhttps://c.com';

  it('splits the sample into batch and waiting as the spec says', () => {
    const plan = planOpen(TEXT, new Set(), 2);
    expect(plan.batch.map((e) => e.line)).toEqual([0, 1]);
    expect(plan.waiting.map((e) => e.line)).toEqual([2, 3]);
  });

  it('removes the opened lines and keeps the rest', () => {
    const plan = planOpen(TEXT, new Set(), 2);
    expect(remainingText(TEXT, plan, plan.batch)).toBe('note\nhttps://c.com');
  });

  it('returns the text unchanged when nothing opened', () => {
    const plan = planOpen(TEXT, new Set(['https://a.com/']), 2);
    expect(remainingText(TEXT, plan, [])).toBe(TEXT);
  });

  it('removes a skipped line once at least one tab opened', () => {
    const plan = planOpen(TEXT, new Set(['https://a.com/']), 2);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.batch.map((e) => e.line)).toEqual([1, 2]);
    expect(remainingText(TEXT, plan, plan.batch)).toBe('https://c.com');
  });

  it('keeps a line that has an entry still waiting', () => {
    const text = 'https://a.com https://b.com https://c.com\nhttps://d.com';
    const plan = planOpen(text, new Set(), 2);
    expect(plan.waiting).toHaveLength(2);
    expect(remainingText(text, plan, plan.batch)).toBe(text);
  });

  it('keeps a line whose batch entry did not open (a failed URL)', () => {
    const plan = planOpen(TEXT, new Set(), 2);
    const [first] = plan.batch;
    expect(remainingText(TEXT, plan, first ? [first] : [])).toBe(
      'https://b.com\nnote\nhttps://c.com'
    );
  });

  it('removes a line that repeats an opened URL', () => {
    const text = 'https://a.com/\nhttps://a.com/\nhttps://b.com/';
    const plan = planOpen(text, new Set(), CAP);
    expect(remainingText(text, plan, plan.batch)).toBe('');
  });

  it('removes a line that repeats a skipped URL once a tab opened', () => {
    const text = 'https://a.com/\nhttps://b.com/\nhttp://a.com/';
    const plan = planOpen(text, new Set(['https://a.com/']), CAP);
    expect(remainingText(text, plan, plan.batch)).toBe('');
  });

  it('keeps a line that repeats a URL still waiting', () => {
    const text = `${manyUrls(21)}\nhttps://site20.com/page`;
    const plan = planOpen(text, new Set(), CAP);
    expect(remainingText(text, plan, plan.batch)).toBe(
      'https://site20.com/page\nhttps://site20.com/page'
    );
  });

  it('keeps blank lines and ignored lines that have no entry at all', () => {
    const text = 'https://a.com\n\nhttps://b.com';
    const plan = planOpen(text, new Set(), 1);
    expect(remainingText(text, plan, plan.batch)).toBe('\nhttps://b.com');
  });

  it('removes a search line when the search opened', () => {
    const plan = planOpen('best pizza\nhttps://a.com', new Set(), 5);
    expect(remainingText('best pizza\nhttps://a.com', plan, plan.batch)).toBe('');
  });

  it('normalizes Windows line endings and a BOM in the rest', () => {
    const text = '\uFEFFhttps://a.com\r\nhttps://b.com';
    const plan = planOpen(text, new Set(), 1);
    expect(remainingText(text, plan, plan.batch)).toBe('https://b.com');
  });

  it('returns the remaining URL on its own line for structured text', () => {
    const text = '[{"url":"https://a.com"},{"url":"https://b.com"},{"url":"https://c.com"}]';
    const plan = planOpen(text, new Set(), 2);
    expect(remainingText(text, plan, plan.batch)).toBe('https://c.com/');
  });

  it('writes a search term as its own line when a plan without lines holds one', () => {
    const plan: OpenPlan = {
      batch: [{ kind: 'url', url: 'https://a.com/', line: -1 }],
      skipped: [],
      waiting: [{ kind: 'search', term: 'best pizza', line: -1 }],
    };
    expect(remainingText('ignored', plan, plan.batch)).toBe('best pizza');
  });

  it('returns the remaining URLs of structured text in list order', () => {
    const text = '[{"url":"https://a.com"},{"url":"https://b.com"},{"url":"https://c.com"}]';
    const plan = planOpen(text, new Set(), 3);
    expect(
      remainingText(
        text,
        plan,
        [plan.batch[0]].filter((e) => e !== undefined)
      )
    ).toBe('https://b.com/\nhttps://c.com/');
  });
});
