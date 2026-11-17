// Unit tests for schemas/metrics.ts

import { DEFAULT_TOTALS, TotalsSchema } from '@/schemas/metrics';
import { describe, expect, it } from 'vitest';

describe('TotalsSchema', () => {
  const valid = { tabsOpened: 5, tabsFailed: 1, urlsProcessed: 10 };

  it('parses valid totals', () => {
    expect(TotalsSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['tabsOpened', 'tabsFailed', 'urlsProcessed'] as const)(
    'rejects a negative, fractional, or missing %s',
    (key) => {
      expect(TotalsSchema.safeParse({ ...valid, [key]: -1 }).success).toBe(false);
      expect(TotalsSchema.safeParse({ ...valid, [key]: 1.5 }).success).toBe(false);
      const { [key]: _omitted, ...rest } = valid;
      expect(TotalsSchema.safeParse(rest).success).toBe(false);
    }
  );

  it('drops a lastError field from older stored totals', () => {
    const result = TotalsSchema.safeParse({ ...valid, lastError: 'old' });
    expect(result.success && 'lastError' in result.data).toBe(false);
  });

  it('drops a startTime field because Totals hold counters only', () => {
    const result = TotalsSchema.safeParse({ ...valid, startTime: 1000 });
    expect(result.success && 'startTime' in result.data).toBe(false);
  });
});

describe('DEFAULT_TOTALS', () => {
  it('is zeros and passes the schema', () => {
    expect(DEFAULT_TOTALS).toEqual({
      tabsOpened: 0,
      tabsFailed: 0,
      urlsProcessed: 0,
    });
    expect(TotalsSchema.safeParse(DEFAULT_TOTALS).success).toBe(true);
  });
});
