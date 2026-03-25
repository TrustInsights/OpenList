import { isProbablyUrl, sanitizeUrl } from '@/utils/urls';
import { describe, expect, it } from 'vitest';

describe('isProbablyUrl', () => {
  describe('returns false for non-string inputs', () => {
    it('returns false for null', () => {
      expect(isProbablyUrl(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isProbablyUrl(undefined)).toBe(false);
    });

    it('returns false for a number', () => {
      expect(isProbablyUrl(42)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isProbablyUrl('')).toBe(false);
    });
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

    it('returns true for ftp:// URLs', () => {
      expect(isProbablyUrl('ftp://files.example.com')).toBe(true);
    });

    it('returns true for chrome:// URLs', () => {
      expect(isProbablyUrl('chrome://settings')).toBe(true);
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

describe('sanitizeUrl', () => {
  it('returns null for malformed URLs', () => {
    expect(sanitizeUrl('not a url at all')).toBeNull();
  });

  it('upgrades http:// to https://', () => {
    const result = sanitizeUrl('http://example.com');
    expect(result).toBe('https://example.com/');
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
