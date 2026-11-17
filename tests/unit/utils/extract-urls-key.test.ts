// Unit tests for urlKey in utils/extract-urls.ts: the "same page" key

import { parseList, urlKey } from '@/utils/extract-urls';
import { describe, expect, it } from 'vitest';

describe('urlKey', () => {
  it('treats %28 and %29 as parentheses', () => {
    expect(urlKey('https://a.com/p_%28q%29')).toBe(urlKey('https://a.com/p_(q)'));
  });

  it('adds the trailing slash to a bare host', () => {
    expect(urlKey('https://a.com')).toBe('https://a.com/');
  });

  it('returns the input unchanged when it does not parse', () => {
    expect(urlKey('not a url')).toBe('not a url');
  });

  it('treats an http address and its https twin as the same page for a website', () => {
    expect(urlKey('http://a.com/x?n=1')).toBe(urlKey('https://a.com/x?n=1'));
    expect(urlKey('http://a.com/x')).not.toBe(urlKey('https://a.com/y'));
  });

  it.each([
    'http://localhost:3000/a',
    'http://127.0.0.1:8080/a.html?n=1',
    'http://[::1]:3000/',
    'http://dev.local/',
  ])('keeps http and https apart for the local address %s', (address) => {
    expect(urlKey(address)).toBe(new URL(address).href);
    expect(urlKey(address)).not.toBe(urlKey(address.replace('http://', 'https://')));
  });

  it('keeps an extension page address as a URL entry', () => {
    expect(parseList('chrome-extension://abcdefgh/popup/index.html').entries).toEqual([
      { kind: 'url', url: 'chrome-extension://abcdefgh/popup/index.html', line: 0 },
    ]);
  });
});
