// Shared types derived from Zod schemas

import type { OpenListResponseSchema } from '@/schemas/messages';
import type { TotalsSchema } from '@/schemas/metrics';
import type { z } from 'zod';

/** Reply of openList: counts, error texts, and `opened` (the input lines that opened a tab). */
export type OpenListResult = z.infer<typeof OpenListResponseSchema>['results'];
/** Counter totals kept in local storage. Never holds URLs or titles. */
export type Totals = z.infer<typeof TotalsSchema>;
