// Tests for the Title & URL and Link shapes and for webAddresses in the URL extractor

import { parseList, urlKey, webAddresses } from '@/utils/extract-urls';
import { describe, expect, it } from 'vitest';

/** Gives the address or search text of each entry. @param text - Text to read. @returns One string per entry. */
function read(text: string): string[] {
  return parseList(text).entries.map((entry) => (entry.kind === 'url' ? entry.url : entry.term));
}

describe('Title & URL item', () => {
  it('takes only the last address when the title holds an address', () => {
    expect(read('See https://evil.example/x for more: https://good.example/a')).toEqual([
      'https://good.example/a',
    ]);
  });

  it('keeps a plain item as it was', () => {
    expect(read('Quarterly report: https://docs.example.com/q3')).toEqual([
      'https://docs.example.com/q3',
    ]);
  });

  it('keeps every address of a line that does not end in a Title & URL shape', () => {
    expect(read('https://a.example/ https://b.example/')).toEqual([
      'https://a.example/',
      'https://b.example/',
    ]);
  });

  it('keeps the last address of a typed line with two labelled addresses (accepted, owner choice B)', () => {
    expect(read('Old: https://a.example/ New: https://b.example/')).toEqual(['https://b.example/']);
  });
});

describe('Link item', () => {
  it('takes only the address in the last parentheses when the title holds an address', () => {
    expect(read('See https://evil.example/x (https://good.example/a_(b)?x=1)')).toEqual([
      'https://good.example/a_(b)?x=1',
    ]);
  });

  it('keeps a plain item as it was', () => {
    expect(read('Quarterly report (https://docs.example.com/q3)')).toEqual([
      'https://docs.example.com/q3',
    ]);
  });
});

describe('address at the end of prose', () => {
  it('drops an unbalanced closing parenthesis after an address', () => {
    expect(read('(see https://a.example/x)')).toEqual(['https://a.example/x']);
  });

  it('keeps a balanced parenthesis inside an address', () => {
    expect(read('see https://a.example/p_(q) now')).toEqual(['https://a.example/p_(q)']);
  });
});

describe('webAddresses', () => {
  it('finds only explicit http and https addresses, once each, in order', () => {
    expect(
      webAddresses(
        'example.com\nhttps://a.example/x, https://b.example/\nhttps://a.example/x\nbest pizza'
      )
    ).toEqual(['https://a.example/x', 'https://b.example/']);
  });

  it('upgrades a website to https and keeps a local address as typed', () => {
    expect(webAddresses('http://a.example/ http://localhost:3000/a')).toEqual([
      'https://a.example/',
      'http://localhost:3000/a',
    ]);
  });

  it('reads the addresses of JSON text', () => {
    expect(webAddresses('[{"url":"https://a.example/"},{"url":"https://b.example/"}]')).toEqual([
      'https://a.example/',
      'https://b.example/',
    ]);
  });

  it('skips an address that does not parse', () => {
    expect(webAddresses('https://% https://a.example/')).toEqual(['https://a.example/']);
  });

  it('gives nothing for text without an address', () => {
    expect(webAddresses('nothing here')).toEqual([]);
  });

  it('gives the same pages as urlKey for a repeat with escaped parentheses', () => {
    expect(
      webAddresses('https://a.example/p_(q) https://a.example/p_%28q%29').map((u) => urlKey(u))
    ).toHaveLength(1);
  });
});
