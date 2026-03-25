import { describe, expect, it } from 'vitest';
import {
  DEFAULT_METRICS,
  DEFAULT_SW_STATE,
  ExtensionMetricsSchema,
  MetricsResponseSchema,
  ServiceWorkerStateSchema,
} from './metrics';

describe('ExtensionMetricsSchema', () => {
  const validMetrics = {
    tabsOpened: 5,
    tabsFailed: 1,
    urlsProcessed: 10,
    lastError: null,
    startTime: 1000,
    lastOperation: null,
  };

  describe('valid cases', () => {
    it('parses valid metrics with null lastError and lastOperation', () => {
      const result = ExtensionMetricsSchema.safeParse(validMetrics);
      expect(result.success).toBe(true);
    });

    it('parses metrics with string lastError', () => {
      const result = ExtensionMetricsSchema.safeParse({
        ...validMetrics,
        lastError: 'some error',
      });
      expect(result.success).toBe(true);
    });

    it('parses metrics with string lastOperation', () => {
      const result = ExtensionMetricsSchema.safeParse({
        ...validMetrics,
        lastOperation: 'openList',
      });
      expect(result.success).toBe(true);
    });

    it('parses metrics with zero values', () => {
      const result = ExtensionMetricsSchema.safeParse({
        tabsOpened: 0,
        tabsFailed: 0,
        urlsProcessed: 0,
        lastError: null,
        startTime: 0,
        lastOperation: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid cases', () => {
    it('rejects negative tabsOpened', () => {
      const result = ExtensionMetricsSchema.safeParse({ ...validMetrics, tabsOpened: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer tabsOpened', () => {
      const result = ExtensionMetricsSchema.safeParse({ ...validMetrics, tabsOpened: 1.5 });
      expect(result.success).toBe(false);
    });

    it('rejects negative tabsFailed', () => {
      const result = ExtensionMetricsSchema.safeParse({ ...validMetrics, tabsFailed: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer tabsFailed', () => {
      const result = ExtensionMetricsSchema.safeParse({ ...validMetrics, tabsFailed: 2.7 });
      expect(result.success).toBe(false);
    });

    it('rejects negative urlsProcessed', () => {
      const result = ExtensionMetricsSchema.safeParse({ ...validMetrics, urlsProcessed: -5 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer urlsProcessed', () => {
      const result = ExtensionMetricsSchema.safeParse({ ...validMetrics, urlsProcessed: 3.14 });
      expect(result.success).toBe(false);
    });

    it('rejects missing tabsOpened', () => {
      const { tabsOpened: _, ...rest } = validMetrics;
      const result = ExtensionMetricsSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing tabsFailed', () => {
      const { tabsFailed: _, ...rest } = validMetrics;
      const result = ExtensionMetricsSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing urlsProcessed', () => {
      const { urlsProcessed: _, ...rest } = validMetrics;
      const result = ExtensionMetricsSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing startTime', () => {
      const { startTime: _, ...rest } = validMetrics;
      const result = ExtensionMetricsSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });
});

describe('ServiceWorkerStateSchema', () => {
  const validState = {
    installTime: null,
    activationTime: null,
    restarts: 0,
    lastContextMenuCreation: null,
  };

  describe('valid cases', () => {
    it('parses valid state with all nulls', () => {
      const result = ServiceWorkerStateSchema.safeParse(validState);
      expect(result.success).toBe(true);
    });

    it('parses state with numeric timestamps', () => {
      const result = ServiceWorkerStateSchema.safeParse({
        installTime: 1000,
        activationTime: 2000,
        restarts: 3,
        lastContextMenuCreation: 3000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid cases', () => {
    it('rejects negative restarts', () => {
      const result = ServiceWorkerStateSchema.safeParse({ ...validState, restarts: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer restarts', () => {
      const result = ServiceWorkerStateSchema.safeParse({ ...validState, restarts: 1.5 });
      expect(result.success).toBe(false);
    });

    it('rejects missing restarts', () => {
      const { restarts: _, ...rest } = validState;
      const result = ServiceWorkerStateSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });
});

describe('MetricsResponseSchema', () => {
  const validResponse = {
    metrics: {
      tabsOpened: 0,
      tabsFailed: 0,
      urlsProcessed: 0,
      lastError: null,
      startTime: 0,
      lastOperation: null,
    },
    serviceWorkerState: {
      installTime: null,
      activationTime: null,
      restarts: 0,
      lastContextMenuCreation: null,
    },
    uptime: 500,
  };

  it('parses a valid metrics response', () => {
    const result = MetricsResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('rejects negative uptime', () => {
    const result = MetricsResponseSchema.safeParse({ ...validResponse, uptime: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects missing metrics', () => {
    const { metrics: _, ...rest } = validResponse;
    const result = MetricsResponseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing serviceWorkerState', () => {
    const { serviceWorkerState: _, ...rest } = validResponse;
    const result = MetricsResponseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing uptime', () => {
    const { uptime: _, ...rest } = validResponse;
    const result = MetricsResponseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('DEFAULT_METRICS', () => {
  it('has all required fields', () => {
    const result = ExtensionMetricsSchema.safeParse(DEFAULT_METRICS);
    expect(result.success).toBe(true);
  });

  it('has tabsOpened of 0', () => {
    expect(DEFAULT_METRICS.tabsOpened).toBe(0);
  });

  it('has tabsFailed of 0', () => {
    expect(DEFAULT_METRICS.tabsFailed).toBe(0);
  });

  it('has urlsProcessed of 0', () => {
    expect(DEFAULT_METRICS.urlsProcessed).toBe(0);
  });

  it('has startTime of 0 (not Date.now())', () => {
    expect(DEFAULT_METRICS.startTime).toBe(0);
  });

  it('has lastError of null', () => {
    expect(DEFAULT_METRICS.lastError).toBeNull();
  });

  it('has lastOperation of null', () => {
    expect(DEFAULT_METRICS.lastOperation).toBeNull();
  });
});

describe('DEFAULT_SW_STATE', () => {
  it('passes ServiceWorkerStateSchema validation', () => {
    const result = ServiceWorkerStateSchema.safeParse(DEFAULT_SW_STATE);
    expect(result.success).toBe(true);
  });

  it('has installTime of null', () => {
    expect(DEFAULT_SW_STATE.installTime).toBeNull();
  });

  it('has activationTime of null', () => {
    expect(DEFAULT_SW_STATE.activationTime).toBeNull();
  });

  it('has restarts of 0', () => {
    expect(DEFAULT_SW_STATE.restarts).toBe(0);
  });

  it('has lastContextMenuCreation of null', () => {
    expect(DEFAULT_SW_STATE.lastContextMenuCreation).toBeNull();
  });
});
