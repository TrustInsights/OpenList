// Zod schemas for URL validation results

import { z } from 'zod';

export const UrlValidationResultSchema = z.object({
  isValid: z.boolean(),
  sanitized: z.string().nullable(),
  original: z.string(),
});

/** Protocols blocked for security reasons */
export const BLOCKED_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'about:',
  'blob:',
] as const;
