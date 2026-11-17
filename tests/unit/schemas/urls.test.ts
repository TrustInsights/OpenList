// Unit tests for schemas/urls.ts

import { BLOCKED_PROTOCOLS } from '@/schemas/urls';
import { describe, expect, it } from 'vitest';

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
