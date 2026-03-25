// Zod schema for extension metrics

import { z } from 'zod';

export const ExtensionMetricsSchema = z.object({
  tabsOpened: z.number().int().min(0),
  tabsFailed: z.number().int().min(0),
  urlsProcessed: z.number().int().min(0),
  lastError: z.string().nullable(),
  startTime: z.number(),
  lastOperation: z.string().nullable(),
});

export const ServiceWorkerStateSchema = z.object({
  installTime: z.number().nullable(),
  activationTime: z.number().nullable(),
  restarts: z.number().int().min(0),
  lastContextMenuCreation: z.number().nullable(),
});

export const MetricsResponseSchema = z.object({
  metrics: ExtensionMetricsSchema,
  serviceWorkerState: ServiceWorkerStateSchema,
  uptime: z.number().min(0),
});

export const DEFAULT_METRICS: z.infer<typeof ExtensionMetricsSchema> = {
  tabsOpened: 0,
  tabsFailed: 0,
  urlsProcessed: 0,
  lastError: null,
  startTime: Date.now(),
  lastOperation: null,
};

export const DEFAULT_SW_STATE: z.infer<typeof ServiceWorkerStateSchema> = {
  installTime: null,
  activationTime: null,
  restarts: 0,
  lastContextMenuCreation: null,
};
