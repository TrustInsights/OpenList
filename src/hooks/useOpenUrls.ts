import { OpenListMessageSchema, OpenListResponseSchema } from '@/schemas/messages';
import type { OpenListResult } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import { useCallback, useState } from 'react';

interface OpenUrlsState {
  isLoading: boolean;
  result: OpenListResult | null;
  error: string | null;
}

/**
 * Provides the openUrls action and its loading/result state.
 * @returns State and the openUrls function
 */
export function useOpenUrls(): OpenUrlsState & { openUrls: (text: string) => Promise<void> } {
  const [state, setState] = useState<OpenUrlsState>({
    isLoading: false,
    result: null,
    error: null,
  });

  const openUrls = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) {
      setState({
        isLoading: false,
        result: null,
        error: 'Please enter some URLs or text to search',
      });
      return;
    }

    setState({ isLoading: true, result: null, error: null });

    try {
      const raw = await chrome.runtime.sendMessage(
        OpenListMessageSchema.parse({ action: 'openList', urls: text })
      );
      const parsed = OpenListResponseSchema.safeParse(raw);

      if (!parsed.success) {
        const msg = (raw as { message?: string })?.message ?? 'Failed to open tabs';
        setState({ isLoading: false, result: null, error: msg });
        return;
      }

      setState({ isLoading: false, result: parsed.data.results, error: null });
    } catch (err) {
      setState({ isLoading: false, result: null, error: toErrorMessage(err) });
    }
  }, []);

  return { ...state, openUrls };
}
