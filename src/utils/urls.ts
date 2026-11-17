// URL validation and sanitization utilities

import { BLOCKED_PROTOCOLS } from '@/schemas/urls';
import { logger } from '@/utils/logger';

/** Protocols accepted as valid URL prefixes (non-exhaustive; bare domains are also accepted). */
const ALLOWED_PROTOCOLS = ['https:', 'http:', 'ftp:', 'chrome:', 'chrome-extension:'] as const;

/** Site-like text: optional www., dotted host with a TLD, optional port, then path, query, or fragment. */
const SITE_PATTERN =
  /^(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;

/** Text that starts with a scheme and "//", such as "https://". */
const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Determines whether a string is likely a URL.
 * @param input - The string to test
 * @returns true if the string looks like a URL
 */
export function isProbablyUrl(input: unknown): boolean {
  if (!input || typeof input !== 'string') return false;

  const lower = input.trim().toLowerCase();

  if (BLOCKED_PROTOCOLS.some((p) => lower.startsWith(p))) return false;

  if (ALLOWED_PROTOCOLS.some((p) => lower.startsWith(p))) return true;

  return SITE_PATTERN.test(lower);
}

/**
 * Tells whether a host is a local address: localhost, 127.0.0.1, [::1], or a name that ends in .local.
 * Open leaves http as typed for these hosts, because a local server seldom speaks https.
 * @param hostname - The hostname of a parsed URL (an IPv6 address keeps its brackets).
 * @returns true for a local host
 */
export function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local')
  );
}

/**
 * Sanitizes a URL string: normalizes, upgrades HTTP to HTTPS (except for local hosts), blocks dangerous protocols.
 * @param url - Raw URL string
 * @returns Sanitized URL string, or null if the URL is invalid/dangerous
 */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (BLOCKED_PROTOCOLS.some((p) => lower.startsWith(p))) {
    logger.warn('Blocked dangerous protocol', { url: trimmed });
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(SCHEME_PREFIX.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    logger.warn('Invalid URL format', { url: trimmed });
    return null;
  }

  if (parsed.protocol === 'http:' && !isLocalHost(parsed.hostname)) {
    parsed.protocol = 'https:';
  }

  return parsed.href;
}
