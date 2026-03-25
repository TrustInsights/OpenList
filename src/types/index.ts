// Shared TypeScript types for OpenList Chrome Extension

/** Result of processing a URL list */
export interface OpenListResult {
  successful: number;
  failed: number;
  skipped: number;
  totalTime: number;
  errors: string[];
}

/** Extension metrics tracked across operations */
export interface ExtensionMetrics {
  tabsOpened: number;
  tabsFailed: number;
  urlsProcessed: number;
  lastError: string | null;
  startTime: number;
  lastOperation: string | null;
}

/** Service worker lifecycle state */
export interface ServiceWorkerState {
  installTime: number | null;
  activationTime: number | null;
  restarts: number;
  lastContextMenuCreation: number | null;
}

/** Combined metrics response from background */
export interface MetricsResponse {
  metrics: ExtensionMetrics;
  serviceWorkerState: ServiceWorkerState;
  uptime: number;
}
