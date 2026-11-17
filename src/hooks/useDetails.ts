// Hook that reads the Details totals and the session start once, and again on request

import { DEFAULT_TOTALS } from '@/schemas/metrics';
import type { Totals } from '@/types';
import { getOpenSince, getTotals } from '@/utils/metrics-store';
import { useCallback, useEffect, useState } from 'react';

/**
 * Reads the Details numbers when the popup opens. A refresh reads them again. No timer runs.
 * A failed read keeps the last values.
 * @returns The totals, the session start time, and the refresh function.
 */
export function useDetails(): { totals: Totals; openSince: number; refresh: () => Promise<void> } {
  const [totals, setTotals] = useState<Totals>({ ...DEFAULT_TOTALS });
  const [openSince, setOpenSince] = useState(0);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [nextTotals, nextOpenSince] = await Promise.all([getTotals(), getOpenSince()]);
      setTotals(nextTotals);
      setOpenSince(nextOpenSince);
    } catch {
      // Keep the last values. The Refresh button tries again.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { totals, openSince, refresh };
}
