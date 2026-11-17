// Zod schema for one tab record used by the copy formats

import { z } from '@/schemas/zod';

/** One tab as the copy formats read it. */
export const TabRecordSchema = z.object({
  title: z.string(),
  url: z.string(),
  favIconUrl: z.string().optional(),
  windowId: z.number().int(),
  index: z.number().int(),
  pinned: z.boolean(),
  active: z.boolean(),
  groupId: z.number().int(),
  lastAccessed: z.number().optional(),
});

/** The type of one tab record. */
export type TabRecord = z.infer<typeof TabRecordSchema>;
