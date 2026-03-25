// Structured logger — calls are no-ops in production builds

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

function buildEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
  const entry: LogEntry = { timestamp: new Date().toISOString(), level, message };
  if (data !== undefined) entry.data = data;
  return entry;
}

const isDev = import.meta.env.DEV;

type ConsoleFn = typeof console.info;
const CONSOLE_FN: Record<LogLevel, ConsoleFn> = {
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (isDev) CONSOLE_FN[level](JSON.stringify(buildEntry(level, message, data)));
}

/**
 * Structured logger that is stripped in production builds.
 * Use instead of console.* calls.
 */
export const logger = {
  /**
   * @param message - Informational message
   * @param data - Optional structured data
   */
  info: (message: string, data?: Record<string, unknown>): void => emit('info', message, data),
  /**
   * @param message - Warning message
   * @param data - Optional structured data
   */
  warn: (message: string, data?: Record<string, unknown>): void => emit('warn', message, data),
  /**
   * @param message - Error message
   * @param data - Optional structured data
   */
  error: (message: string, data?: Record<string, unknown>): void => emit('error', message, data),
};
