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

describe('a Copy shape whose address does not parse', () => {
  it('falls back to the address scan, which gives nothing for an invalid address', () => {
    expect(read('Note: https://%')).toEqual([]);
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

describe('Link shape with spaces in typed text', () => {
  it('keeps both addresses of "Links (https://a.example/, https://b.example/)"', () => {
    expect(read('Links (https://a.example/, https://b.example/)')).toEqual([
      'https://a.example/',
      'https://b.example/',
    ]);
  });

  it('never makes one false address out of two with words between', () => {
    expect(read('Sources (https://a.example/1 and https://b.example/2)')).toEqual([
      'https://a.example/1',
      'https://b.example/2',
    ]);
  });
});

describe('Unicode line separators in a title', () => {
  it.each(['\u2028', '\u2029'])(
    'a title with %j still gives only the last address',
    (separator) => {
      expect(read(`See https://evil.example/x${separator}more: https://good.example/a`)).toEqual([
        'https://good.example/a',
      ]);
      expect(read(`See https://evil.example/x${separator}more (https://good.example/a)`)).toEqual([
        'https://good.example/a',
      ]);
    }
  );
});

describe('hostile text does not take quadratic time', () => {
  it('reads 220 kB of repeated " (https://a" in well under a second', () => {
    const started = performance.now();
    parseList(' (https://a'.repeat(20_000));
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('reads 220 kB of repeated ": https://a" in well under a second', () => {
    const started = performance.now();
    parseList(': https://a'.repeat(22_000));
    expect(performance.now() - started).toBeLessThan(500);
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

  it('skips a bare domain inside JSON, and keeps the explicit address', () => {
    expect(webAddresses('[{"url":"example.com"},{"url":"https://b.example/"}]')).toEqual([
      'https://b.example/',
    ]);
  });

  it('skips a bare domain inside a CSV row', () => {
    expect(
      webAddresses('title,url,window,index,pinned,active\n"A","example.com",1,0,false,true')
    ).toEqual([]);
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
