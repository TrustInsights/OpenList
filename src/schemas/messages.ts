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

export type OpenListMessage = z.infer<typeof OpenListMessageSchema>;
export type GetMetricsMessage = z.infer<typeof GetMetricsMessageSchema>;
export type GetCurrentTabUrlsMessage = z.infer<typeof GetCurrentTabUrlsMessageSchema>;
export type IncomingMessage = z.infer<typeof IncomingMessageSchema>;
