// Zod schemas for all Chrome runtime messages

import { z } from 'zod';

export const OpenListMessageSchema = z.object({
  action: z.literal('openList'),
  urls: z.string().min(1),
});

export const GetMetricsMessageSchema = z.object({
  action: z.literal('getMetrics'),
});

export const GetCurrentTabUrlsMessageSchema = z.object({
  action: z.literal('getCurrentTabUrls'),
});

export const IncomingMessageSchema = z.discriminatedUnion('action', [
  OpenListMessageSchema,
  GetMetricsMessageSchema,
  GetCurrentTabUrlsMessageSchema,
]);

/** Response schema for the openList background action. */
export const OpenListResponseSchema = z.object({
  status: z.literal('complete'),
  results: z.object({
    successful: z.number().int().min(0),
    failed: z.number().int().min(0),
    skipped: z.number().int().min(0),
    totalTime: z.number().min(0),
    errors: z.array(z.string()),
  }),
});
