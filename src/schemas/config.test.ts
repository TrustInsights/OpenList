import { describe, expect, it } from 'vitest';
import { CONFIG, ConfigSchema } from './config';

describe('CONFIG', () => {
  it('passes ConfigSchema.safeParse() without errors', () => {
    const result = ConfigSchema.safeParse(CONFIG);
    expect(result.success).toBe(true);
  });

  it('has MAX_TABS of 20', () => {
    expect(CONFIG.MAX_TABS).toBe(20);
  });

  it('has DELAY_BETWEEN_TABS of 100', () => {
    expect(CONFIG.DELAY_BETWEEN_TABS).toBe(100);
  });

  it('has CONTEXT_MENU_ID of OpenList-ContextMenuOpen', () => {
    expect(CONFIG.CONTEXT_MENU_ID).toBe('OpenList-ContextMenuOpen');
  });

  it('has METRICS_RETENTION_HOURS of 24', () => {
    expect(CONFIG.METRICS_RETENTION_HOURS).toBe(24);
  });
});

describe('ConfigSchema', () => {
  const validConfig = {
    MAX_TABS: 20,
    DELAY_BETWEEN_TABS: 100,
    METRICS_RETENTION_HOURS: 24,
    CONTEXT_MENU_ID: 'OpenList-ContextMenuOpen',
  };

  it('accepts a valid config', () => {
    const result = ConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('accepts MAX_TABS of 1 (minimum)', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, MAX_TABS: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts MAX_TABS of 100 (maximum)', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, MAX_TABS: 100 });
    expect(result.success).toBe(true);
  });

  it('rejects MAX_TABS less than 1', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, MAX_TABS: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects MAX_TABS greater than 100', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, MAX_TABS: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer MAX_TABS', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, MAX_TABS: 5.5 });
    expect(result.success).toBe(false);
  });

  it('rejects DELAY_BETWEEN_TABS below 0', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, DELAY_BETWEEN_TABS: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer DELAY_BETWEEN_TABS', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, DELAY_BETWEEN_TABS: 50.5 });
    expect(result.success).toBe(false);
  });

  it('rejects METRICS_RETENTION_HOURS below 1', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, METRICS_RETENTION_HOURS: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer METRICS_RETENTION_HOURS', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, METRICS_RETENTION_HOURS: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects empty CONTEXT_MENU_ID', () => {
    const result = ConfigSchema.safeParse({ ...validConfig, CONTEXT_MENU_ID: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing MAX_TABS', () => {
    const { MAX_TABS: _, ...rest } = validConfig;
    const result = ConfigSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing DELAY_BETWEEN_TABS', () => {
    const { DELAY_BETWEEN_TABS: _, ...rest } = validConfig;
    const result = ConfigSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing METRICS_RETENTION_HOURS', () => {
    const { METRICS_RETENTION_HOURS: _, ...rest } = validConfig;
    const result = ConfigSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing CONTEXT_MENU_ID', () => {
    const { CONTEXT_MENU_ID: _, ...rest } = validConfig;
    const result = ConfigSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
