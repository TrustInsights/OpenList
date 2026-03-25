// URL validation and sanitization utilities

import { BLOCKED_PROTOCOLS } from '@/schemas/urls';
import { logger } from '@/utils/logger';

/** Protocols accepted as valid URL prefixes (non-exhaustive; bare domains are also accepted). */
const ALLOWED_PROTOCOLS = ['https:', 'http:', 'ftp:', 'chrome:'] as const;

/**
 * Determines whether a string is likely a URL.
 * @param input - The string to test
 * @returns true if the string looks like a URL
 */
export function isProbablyUrl(input: unknown): boolean {
  if (!input || typeof input !== 'string') return false;

  const lower = input.trim().toLowerCase();

  if (BLOCKED_PROTOCOLS.some((p) => lower.startsWith(p))) return false;

  if (ALLOWED_PROTOCOLS.some((p) => lower.startsWith(p)) || lower.startsWith('www.')) {
    return true;
  }

  // Bare domain pattern: e.g. "example.com"
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(lower);
}

/**
 * Sanitizes a URL string: normalizes, upgrades HTTP to HTTPS, blocks dangerous protocols.
 * @param url - Raw URL string
 * @returns Sanitized URL string, or null if the URL is invalid/dangerous
 */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed);
  } catch {
    logger.warn('Invalid URL format', { url: trimmed });
    return null;
  }

  if (BLOCKED_PROTOCOLS.includes(parsed.protocol as (typeof BLOCKED_PROTOCOLS)[number])) {
    logger.warn('Blocked dangerous protocol', { url: trimmed });
    return null;
  }

  if (parsed.protocol === 'http:') {
    parsed.protocol = 'https:';
  }

  return parsed.href;
}
