import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The logger module captures console.info/warn/error references at load time
// via the CONSOLE_FN map. We must spy on console methods BEFORE importing the
// module (using vi.resetModules + dynamic import) so the spy intercepts them.

describe('logger (DEV=true)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('logger.info calls console.info when DEV is true', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');
    logger.info('hello');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('logger.warn calls console.warn when DEV is true', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');
    logger.warn('a warning');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('logger.error calls console.error when DEV is true', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');
    logger.error('an error');
    expect(spy).toHaveBeenCalledTimes(1);
  });

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

  it('logger.info does NOT call console.info when DEV is false', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');
    logger.info('should be silent');
    expect(spy).not.toHaveBeenCalled();
  });

  it('logger.warn does NOT call console.warn when DEV is false', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');
    logger.warn('should be silent');
    expect(spy).not.toHaveBeenCalled();
  });

  it('logger.error does NOT call console.error when DEV is false', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { logger } = await import('@/utils/logger');
    logger.error('should be silent');
    expect(spy).not.toHaveBeenCalled();
  });
});
