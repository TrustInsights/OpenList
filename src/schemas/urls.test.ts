import { describe, expect, it } from 'vitest';
import { BLOCKED_PROTOCOLS, UrlValidationResultSchema } from './urls';

describe('UrlValidationResultSchema', () => {
  it('parses a valid result with isValid true and a sanitized URL', () => {
    const result = UrlValidationResultSchema.safeParse({
      isValid: true,
      sanitized: 'https://example.com',
      original: 'https://example.com',
    });
    expect(result.success).toBe(true);
  });

  it('parses a valid result with null sanitized', () => {
    const result = UrlValidationResultSchema.safeParse({
      isValid: false,
      sanitized: null,
      original: 'javascript:alert(1)',
    });
    expect(result.success).toBe(true);
  });

  it('parses a valid result with isValid false and sanitized string', () => {
    const result = UrlValidationResultSchema.safeParse({
      isValid: false,
      sanitized: 'https://example.com',
      original: 'https://example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing isValid', () => {
    const result = UrlValidationResultSchema.safeParse({
      sanitized: 'https://example.com',
      original: 'https://example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing sanitized field', () => {
    const result = UrlValidationResultSchema.safeParse({
      isValid: true,
      original: 'https://example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing original', () => {
    const result = UrlValidationResultSchema.safeParse({
      isValid: true,
      sanitized: 'https://example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean isValid', () => {
    const result = UrlValidationResultSchema.safeParse({
      isValid: 'true',
      sanitized: 'https://example.com',
      original: 'https://example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string original', () => {
    const result = UrlValidationResultSchema.safeParse({
      isValid: true,
      sanitized: null,
      original: 123,
    });
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = UrlValidationResultSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

describe('BLOCKED_PROTOCOLS', () => {
  it('includes javascript:', () => {
    expect(BLOCKED_PROTOCOLS).toContain('javascript:');
  });

  it('includes data:', () => {
    expect(BLOCKED_PROTOCOLS).toContain('data:');
  });

  it('includes vbscript:', () => {
    expect(BLOCKED_PROTOCOLS).toContain('vbscript:');
  });

  it('includes file:', () => {
    expect(BLOCKED_PROTOCOLS).toContain('file:');
  });

  it('includes about:', () => {
    expect(BLOCKED_PROTOCOLS).toContain('about:');
  });

  it('includes blob:', () => {
    expect(BLOCKED_PROTOCOLS).toContain('blob:');
  });

  it('has exactly 6 entries', () => {
    expect(BLOCKED_PROTOCOLS).toHaveLength(6);
  });
});
