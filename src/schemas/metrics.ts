// Zod schema for the Details totals kept in local storage

import { z } from '@/schemas/zod';

/** Counters only. The totals never hold URLs or titles. */
export const TotalsSchema = z.object({
  tabsOpened: z.number().int().min(0),
  tabsFailed: z.number().int().min(0),
  urlsProcessed: z.number().int().min(0),
});

/** Zero totals that a missing or corrupt store reads as. */
export const DEFAULT_TOTALS: z.infer<typeof TotalsSchema> = {
  tabsOpened: 0,
  tabsFailed: 0,
  urlsProcessed: 0,
};
