// Metrics persistence via chrome.storage.session

import {
  DEFAULT_METRICS,
  DEFAULT_SW_STATE,
  ExtensionMetricsSchema,
  ServiceWorkerStateSchema,
} from '@/schemas/metrics';
import type { ExtensionMetrics, ServiceWorkerState } from '@/types';

const METRICS_KEY = 'metrics';
const SW_STATE_KEY = 'swState';

/**
 * Reads extension metrics from session storage.
 * @returns Current metrics, or defaults if none stored
 */
export async function getMetrics(): Promise<ExtensionMetrics> {
  const result = await chrome.storage.session.get(METRICS_KEY);
  const raw = result[METRICS_KEY];
  if (!raw) return { ...DEFAULT_METRICS, startTime: Date.now() };
  const parsed = ExtensionMetricsSchema.safeParse(raw);
  return parsed.success ? parsed.data : { ...DEFAULT_METRICS, startTime: Date.now() };
}

/**
 * Writes extension metrics to session storage.
 * @param metrics - Metrics to persist
 */
export async function setMetrics(metrics: ExtensionMetrics): Promise<void> {
  await chrome.storage.session.set({ [METRICS_KEY]: metrics });
}

/**
 * Increments a numeric counter in session storage atomically.
 * @param field - The metrics field to increment
 * @param amount - How much to increment by (default 1)
 */
export async function incrementMetric(
  field: 'tabsOpened' | 'tabsFailed' | 'urlsProcessed',
  amount = 1
): Promise<void> {
  const metrics = await getMetrics();
  await setMetrics({ ...metrics, [field]: metrics[field] + amount });
}

/**
 * Records the last error message in metrics.
 * @param message - Error message to record
 */
export async function recordError(message: string): Promise<void> {
  const metrics = await getMetrics();
  await setMetrics({ ...metrics, lastError: message });
}

/**
 * Reads service worker lifecycle state from session storage.
 * @returns Current SW state, or defaults
 */
export async function getSwState(): Promise<ServiceWorkerState> {
  const result = await chrome.storage.session.get(SW_STATE_KEY);
  const raw = result[SW_STATE_KEY];
  if (!raw) return { ...DEFAULT_SW_STATE };
  const parsed = ServiceWorkerStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : { ...DEFAULT_SW_STATE };
}

/**
 * Writes service worker lifecycle state to session storage.
 * @param state - SW state to persist
 */
export async function setSwState(state: ServiceWorkerState): Promise<void> {
  await chrome.storage.session.set({ [SW_STATE_KEY]: state });
}
