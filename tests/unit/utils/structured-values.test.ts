// Unit tests for utils/structured-values.ts

import { structuredValues } from '@/utils/structured-values';
import { describe, expect, it } from 'vitest';

describe('structuredValues', () => {
  it('returns null for plain lines', () => {
    expect(structuredValues('https://a.com\nexample.com')).toBeNull();
  });

  it('reads the url column of the CSV that Copy writes', () => {
    const text = 'title,url,window,index,pinned,active\n"A","https://a.com",1,0,false,true';
    expect(structuredValues(text)).toEqual(['https://a.com']);
  });

  it('reads a CSV header that has no newline', () => {
    expect(structuredValues('title,url,window,index,pinned,active')).toEqual([]);
  });

  it('reads url properties from JSON in document order', () => {
    expect(
      structuredValues('{"url":"https://a.com","tabs":[{"url":"https://b.com"},{"url":7}]}')
    ).toEqual(['https://a.com', 'https://b.com']);
  });

  it('returns null for JSON without a url property', () => {
    expect(structuredValues('{"a":[1,2,{"b":null}]}')).toBeNull();
  });

  it('returns null for text that looks like JSON and is not', () => {
    expect(structuredValues('[oops')).toBeNull();
  });

  it('reads hrefs from HTML and decodes entities', () => {
    expect(structuredValues('<a href="https://a.com/?x=1&amp;y=2">A</a>')).toEqual([
      'https://a.com/?x=1&y=2',
    ]);
  });

  it('decodes an escaped ampersand only once', () => {
    expect(structuredValues('<a href="https://a.com/?q=&amp;lt;">A</a>')).toEqual([
      'https://a.com/?q=&lt;',
    ]);
  });

  it('returns null for HTML without a link', () => {
    expect(structuredValues('<p>no link</p>')).toBeNull();
  });
});
