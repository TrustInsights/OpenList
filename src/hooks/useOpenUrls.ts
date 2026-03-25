// Hook for the URL-opening action

import type { OpenListResult } from '@/types';
import { useState } from 'react';

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

  async function openUrls(text: string): Promise<void> {
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
      const response = await chrome.runtime.sendMessage({ action: 'openList', urls: text });

      if (response.status === 'error') throw new Error(response.message as string);

      setState({ isLoading: false, result: response.results as OpenListResult, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open tabs';
      setState({ isLoading: false, result: null, error: message });
    }
  }

  return { ...state, openUrls };
}
