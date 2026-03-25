// Configuration constants and schema

import { z } from 'zod';

export const ConfigSchema = z.object({
  MAX_TABS: z.number().int().min(1).max(100),
  DELAY_BETWEEN_TABS: z.number().int().min(0),
  METRICS_RETENTION_HOURS: z.number().int().min(1),
  CONTEXT_MENU_ID: z.string().min(1),
});

export const CONFIG: z.infer<typeof ConfigSchema> = {
  MAX_TABS: 20,
  DELAY_BETWEEN_TABS: 100,
  METRICS_RETENTION_HOURS: 24,
  CONTEXT_MENU_ID: 'OpenList-ContextMenuOpen',
};
