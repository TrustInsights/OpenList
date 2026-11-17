// Unit tests for utils/logger.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The logger reads import.meta.env.DEV when it loads. Each test resets the modules, stubs DEV,
// and imports the logger again.

describe('logger (DEV=true)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(['info', 'warn', 'error'] as const)(
    'logger.%s calls the console method of the same name when DEV is true',
    async (level) => {
      const spy = vi.spyOn(console, level).mockImplementation(() => {});
      const { logger } = await import('@/utils/logger');
      logger[level]('a message');
      expect(spy).toHaveBeenCalledTimes(1);
    }
  );

  it('log entry includes timestamp, level, and message', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');
    logger.info('test message');
    const raw = spy.mock.calls[0][0] as string;
    const entry = JSON.parse(raw);
    expect(entry).toMatchObject({
      level: 'info',
      message: 'test message',
    });
    expect(typeof entry.timestamp).toBe('string');
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('data parameter is included in log entry when provided', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');
    logger.info('with data', { key: 'value' });
    const raw = spy.mock.calls[0][0] as string;
    const entry = JSON.parse(raw);
    expect(entry.data).toEqual({ key: 'value' });
  });

  it('data parameter is omitted from log entry when not provided', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');
    logger.info('no data');
    const raw = spy.mock.calls[0][0] as string;
    const entry = JSON.parse(raw);
    expect(entry).not.toHaveProperty('data');
  });
});

describe('logger (DEV=false)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(['info', 'warn', 'error'] as const)(
    'logger.%s does not call the console when DEV is false',
    async (level) => {
      const spy = vi.spyOn(console, level).mockImplementation(() => {});
      const { logger } = await import('@/utils/logger');
      logger[level]('should be silent');
      expect(spy).not.toHaveBeenCalled();
    }
  );
});
