import { MetricsResponseSchema } from '@/schemas/metrics';
import { formatDuration } from '@/utils/format';
import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 5000;

interface MetricsState {
  successRate: string;
  tabsOpened: number;
  tabsFailed: number;
  uptime: string;
  error: boolean;
}

const DEFAULT_STATE: MetricsState = {
  successRate: '100',
  tabsOpened: 0,
  tabsFailed: 0,
  uptime: '0s',
  error: false,
};

/**
 * Polls the service worker for metrics every 5 seconds.
 * @returns Current metrics state for display
 */
export function useMetrics(): MetricsState {
  const [state, setState] = useState<MetricsState>(DEFAULT_STATE);

  useEffect(() => {
    async function fetchMetrics(): Promise<void> {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getMetrics' });
        const parsed = MetricsResponseSchema.safeParse(response);

        if (!parsed.success) {
          setState((s) => ({ ...s, error: true }));
          return;
        }

        const { metrics } = parsed.data;
        const successRate = metrics.urlsProcessed
          ? ((metrics.tabsOpened / metrics.urlsProcessed) * 100).toFixed(1)
          : '100';

        setState({
          successRate,
          tabsOpened: metrics.tabsOpened,
          tabsFailed: metrics.tabsFailed,
          uptime: formatDuration(parsed.data.uptime),
          error: false,
        });
      } catch {
        setState((s) => ({ ...s, error: true }));
      }
    }

    void fetchMetrics();
    const interval = setInterval(() => void fetchMetrics(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return state;
}
