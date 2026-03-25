// Structured logger — calls are no-ops in production builds

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data ? { data } : {}),
  };
}

const isDev = import.meta.env.DEV;

/**
 * Structured logger that is stripped in production builds.
 * Use instead of console.* calls.
 */
export const logger = {
  /** @param message - Log message @param data - Optional structured data */
  info: (message: string, data?: Record<string, unknown>): void => {
    if (isDev) console.info(JSON.stringify(createLogEntry('info', message, data)));
  },
  /** @param message - Warning message @param data - Optional structured data */
  warn: (message: string, data?: Record<string, unknown>): void => {
    if (isDev) console.warn(JSON.stringify(createLogEntry('warn', message, data)));
  },
  /** @param message - Error message @param data - Optional structured data */
  error: (message: string, data?: Record<string, unknown>): void => {
    if (isDev) console.error(JSON.stringify(createLogEntry('error', message, data)));
  },
};
