// Shared TypeScript types for OpenList Chrome Extension

import type { ExtensionMetricsSchema, ServiceWorkerStateSchema } from '@/schemas/metrics';
import type { z } from 'zod';

/** Result of processing a URL list */
export interface OpenListResult {
  successful: number;
  failed: number;
  skipped: number;
  totalTime: number;
  errors: string[];
}

// Derive metric types from Zod schemas — single source of truth
export type ExtensionMetrics = z.infer<typeof ExtensionMetricsSchema>;
export type ServiceWorkerState = z.infer<typeof ServiceWorkerStateSchema>;
