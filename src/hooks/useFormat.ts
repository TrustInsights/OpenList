// Hook that holds the remembered copy format

import { DEFAULT_FORMAT, type Format } from '@/schemas/settings';
import { getFormat, setFormat } from '@/utils/settings-store';
import { useEffect, useRef, useState } from 'react';

/**
 * Reads the remembered copy format on mount and saves each change.
 * A choice made before the stored format arrives wins. A failed read keeps the default.
 * @returns The current format and the function that changes it.
 */
export function useFormat(): { format: Format; changeFormat: (format: Format) => void } {
  const [format, setFormatState] = useState<Format>(DEFAULT_FORMAT);
  const chosen = useRef(false);

  useEffect(() => {
    (async (): Promise<void> => {
      try {
        const stored = await getFormat();
        if (!chosen.current) setFormatState(stored);
      } catch {
        // Keep the default format. The next change saves a new one.
      }
    })();
  }, []);

  return {
    format,
    changeFormat: (next: Format): void => {
      chosen.current = true;
      setFormatState(next);
      setFormat(next).catch(() => undefined);
    },
  };
}
