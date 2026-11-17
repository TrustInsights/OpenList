// Unit tests for utils/urls.ts

import { isProbablyUrl, sanitizeUrl, upgradeHttp } from '@/utils/urls';
import { describe, expect, it } from 'vitest';

describe('isProbablyUrl', () => {
  it('returns false for an empty string', () => {
    expect(isProbablyUrl('')).toBe(false);
  });

  it('returns false for ftp://, because Chrome 95 and later cannot load it', () => {
    expect(isProbablyUrl('ftp://files.example.com')).toBe(false);
  });

  describe('returns false for blocked protocols', () => {
    it('returns false for javascript:', () => {
      expect(isProbablyUrl('javascript:alert(1)')).toBe(false);
    });

    it('returns false for data:', () => {
      expect(isProbablyUrl('data:text/html,<h1>hi</h1>')).toBe(false);
    });

    it('returns false for vbscript:', () => {
      expect(isProbablyUrl('vbscript:MsgBox("hi")')).toBe(false);
    });

    it('returns false for file:', () => {
      expect(isProbablyUrl('file:///etc/passwd')).toBe(false);
    });

    it('returns false for about:', () => {
      expect(isProbablyUrl('about:blank')).toBe(false);
    });

    it('returns false for blob:', () => {
      expect(isProbablyUrl('blob:https://example.com/uuid')).toBe(false);
    });
  });

  describe('returns true for valid URLs', () => {
    it('returns true for https:// URLs', () => {
      expect(isProbablyUrl('https://example.com')).toBe(true);
    });

    it('returns true for http:// URLs', () => {
      expect(isProbablyUrl('http://example.com')).toBe(true);
    });

    it('returns true for chrome:// URLs', () => {
      expect(isProbablyUrl('chrome://settings')).toBe(true);
    });

    it('returns true for chrome-extension:// URLs, so an extension tab is not a search term', () => {
      expect(isProbablyUrl('chrome-extension://abcdefgh/popup/index.html')).toBe(true);
    });

    it('returns true for www. prefix', () => {
      expect(isProbablyUrl('www.example.com')).toBe(true);
    });

    it('returns true for bare domains like example.com', () => {
      expect(isProbablyUrl('example.com')).toBe(true);
    });
  });

  describe('returns false for non-URL strings', () => {
    it('returns false for random text like "hello world"', () => {
      expect(isProbablyUrl('hello world')).toBe(false);
    });
  });
});

describe('bare domains and site-like strings', () => {
  it.each([
    ['example.com', 'https://example.com/'],
    ['x.com', 'https://x.com/'],
    ['news.ycombinator.com', 'https://news.ycombinator.com/'],
    ['example.com/path', 'https://example.com/path'],
    ['WWW.example.com', 'https://www.example.com/'],
    ['example.com:8080/a?b=1#c', 'https://example.com:8080/a?b=1#c'],
    ['http://example.com', 'https://example.com/'],
  ])('accepts %s and sanitizes it to %s', (input, expected) => {
    expect(isProbablyUrl(input)).toBe(true);
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it.each(['best pizza', 'localhost', 'javascript:alert(1)'])('rejects %s as a URL', (input) => {
    expect(isProbablyUrl(input)).toBe(false);
  });

  it('blocks javascript: in sanitizeUrl', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('trims a leading space and a trailing carriage return', () => {
    expect(sanitizeUrl(' example.com\r')).toBe('https://example.com/');
  });

  it('trims a byte-order mark and tabs', () => {
    expect(sanitizeUrl('\uFEFF\texample.com\t')).toBe('https://example.com/');
    expect(isProbablyUrl('\uFEFFexample.com')).toBe(true);
  });
});

describe('upgradeHttp', () => {
  it.each(['localhost', '127.0.0.1', '[::1]', 'dev.local', 'a.b.local'])(
    'keeps http for the local host %s',
    (host) => {
      expect(upgradeHttp(new URL(`http://${host}/a`)).protocol).toBe('http:');
    }
  );

  it.each(['example.com', 'localhost.example.com', '127.0.0.2', 'local', 'mylocal'])(
    'upgrades http to https for the website %s',
    (host) => {
      expect(upgradeHttp(new URL(`http://${host}/a`)).protocol).toBe('https:');
    }
  );

  it('leaves an https address as it is and returns the same object', () => {
    const url = new URL('https://example.com/a');
    expect(upgradeHttp(url)).toBe(url);
    expect(url.href).toBe('https://example.com/a');
  });
});

describe('sanitizeUrl', () => {
  it('returns null for malformed URLs', () => {
    expect(sanitizeUrl('not a url at all')).toBeNull();
  });

  it('upgrades http:// to https:// for a website', () => {
    const result = sanitizeUrl('http://example.com');
    expect(result).toBe('https://example.com/');
  });

  it.each([
    ['http://localhost:3000/a', 'http://localhost:3000/a'],
    ['http://localhost', 'http://localhost/'],
    ['http://LOCALHOST:3000/a', 'http://localhost:3000/a'],
    ['http://127.0.0.1:8080/', 'http://127.0.0.1:8080/'],
    ['http://[::1]:3000/', 'http://[::1]:3000/'],
    ['http://dev.local/', 'http://dev.local/'],
    ['http://printer.office.local:631/x', 'http://printer.office.local:631/x'],
  ])('leaves http as typed for the local address %s', (input, expected) => {
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it.each([
    'http://notlocalhost.com/',
    'http://localhost.example.com/',
    'http://127.0.0.2/',
    'http://local.com/',
    'http://mylocal/',
  ])('still upgrades %s, which only looks local', (input) => {
    expect(sanitizeUrl(input)).toBe(input.replace('http://', 'https://'));
  });

  it('keeps https as typed for a local address', () => {
    expect(sanitizeUrl('https://localhost:3000/a')).toBe('https://localhost:3000/a');
  });

  it('handles www. prefix by adding https://', () => {
    const result = sanitizeUrl('www.example.com');
    expect(result).toBe('https://www.example.com/');
  });

  it('returns null for javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('returns null for data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<h1>hi</h1>')).toBeNull();
  });

  it('returns null for vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:MsgBox("x")')).toBeNull();
  });

  it('returns null for file: protocol', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
  });

  it('returns null for about: protocol', () => {
    expect(sanitizeUrl('about:blank')).toBeNull();
  });

  it('returns null for blob: protocol', () => {
    expect(sanitizeUrl('blob:https://example.com/uuid')).toBeNull();
  });

  it('returns the full href for a valid https URL', () => {
    const result = sanitizeUrl('https://example.com/path?q=1');
    expect(result).toBe('https://example.com/path?q=1');
  });

  it('returns null for an empty string', () => {
    expect(sanitizeUrl('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(sanitizeUrl('   ')).toBeNull();
  });
});
