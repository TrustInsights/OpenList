// Zod schemas for all Chrome runtime messages

import { z } from 'zod';

/** Message that asks the background worker to open a list of URLs or search terms. */
export const OpenListMessageSchema = z.object({
  action: z.literal('openList'),
  urls: z.array(z.string()).min(1),
});

/** The text and the optional HTML flavor that the offscreen page puts on the clipboard. */
const ClipboardPayloadSchema = z.object({
  text: z.string(),
  html: z.string().optional(),
});

/** Message from the service worker that asks the offscreen page to write to the clipboard. */
export const OffscreenCopyMessageSchema = z.object({
  target: z.literal('offscreen'),
  type: z.literal('copy'),
  payload: ClipboardPayloadSchema,
});

/** The offscreen page answer: success, or the error text. */
export const OffscreenReplySchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

/** Response schema for the openList background action. */
export const OpenListResponseSchema = z.object({
  status: z.literal('complete'),
  results: z.object({
    successful: z.number().int().min(0),
    failed: z.number().int().min(0),
    totalTime: z.number().min(0),
    errors: z.array(z.string()),
    /** The URLs that opened a tab. */
    opened: z.array(z.string()),
  }),
});
