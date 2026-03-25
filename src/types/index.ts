import type { OpenListResponseSchema } from '@/schemas/messages';
import type { ExtensionMetricsSchema, ServiceWorkerStateSchema } from '@/schemas/metrics';
import type { z } from 'zod';

// Derive types from Zod schemas — single source of truth
export type OpenListResult = z.infer<typeof OpenListResponseSchema>['results'];
export type ExtensionMetrics = z.infer<typeof ExtensionMetricsSchema>;
export type ServiceWorkerState = z.infer<typeof ServiceWorkerStateSchema>;
