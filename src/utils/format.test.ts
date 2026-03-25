import { formatDuration } from '@/utils/format';
import { describe, expect, it } from 'vitest';

describe('formatDuration', () => {
  it('formats 0ms as "0s"', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('formats 999ms as "0s"', () => {
    expect(formatDuration(999)).toBe('0s');
  });

  it('formats 1000ms as "1s"', () => {
    expect(formatDuration(1000)).toBe('1s');
  });

  it('formats 59999ms as "59s"', () => {
    expect(formatDuration(59999)).toBe('59s');
  });

  it('formats 60000ms as "1m 0s"', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
  });

  it('formats 90000ms as "1m 30s"', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
  });

  it('formats 3600000ms as "1h 0m"', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
  });

  it('formats 5400000ms as "1h 30m"', () => {
    expect(formatDuration(5400000)).toBe('1h 30m');
  });
});
