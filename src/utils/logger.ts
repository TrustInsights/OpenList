// Structured logger for the extension

type LogLevel = 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

/** Writes one JSON line (timestamp, level, message, and data when given) to the console in a dev build only. */
function emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (isDev) {
    console[level](JSON.stringify({ timestamp: new Date().toISOString(), level, message, data }));
  }
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
