// Unit tests for utils/text.ts

import { counted } from '@/utils/text';
import { describe, expect, it } from 'vitest';

describe('counted', () => {
  it('uses the singular for one', () => {
    expect(counted(1, 'URL')).toBe('1 URL');
  });

  it('uses the plural for zero and for many', () => {
    expect(counted(0, 'tab')).toBe('0 tabs');
    expect(counted(2, 'search term')).toBe('2 search terms');
  });
});
