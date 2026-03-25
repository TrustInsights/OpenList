import * as useMetricsModule from '@/hooks/useMetrics';
import * as useOpenUrlsModule from '@/hooks/useOpenUrls';
// Unit tests for popup/App.tsx
import { App } from '@/popup/App';
import type { OpenListResult } from '@/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// Default hook return values matching actual hook types
const defaultOpenUrls = {
  isLoading: false as boolean,
  result: null as OpenListResult | null,
  error: null as string | null,
  openUrls: vi.fn().mockResolvedValue(undefined),
};

const defaultMetrics = {
  tabsOpened: 5,
  tabsFailed: 1,
  uptime: '1h',
  successRate: '83.3',
  error: false,
};

function mockHooks(
  openUrlsOverrides: Partial<typeof defaultOpenUrls> = {},
  metricsOverrides: Partial<typeof defaultMetrics> = {}
) {
  vi.spyOn(useOpenUrlsModule, 'useOpenUrls').mockReturnValue({
    ...defaultOpenUrls,
    ...openUrlsOverrides,
  });
  vi.spyOn(useMetricsModule, 'useMetrics').mockReturnValue({
    ...defaultMetrics,
    ...metricsOverrides,
  });
}

describe('App', () => {
  it('renders the textarea and Open URLs button', () => {
    mockHooks();
    render(<App />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open urls/i })).toBeInTheDocument();
  });

  it('pre-populates textarea when chrome.runtime.sendMessage returns tab URLs', async () => {
    mockHooks();
    chrome.runtime.sendMessage = vi
      .fn()
      .mockResolvedValue(['https://example.com', 'https://test.com']);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('https://example.com\nhttps://test.com');
    });
  });

  it('leaves textarea empty when chrome.runtime.sendMessage returns empty array', async () => {
    mockHooks();
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  it('leaves textarea empty when chrome.runtime.sendMessage rejects', async () => {
    mockHooks();
    chrome.runtime.sendMessage = vi.fn().mockRejectedValue(new Error('no response'));

    render(<App />);

    // Give time for rejection to settle
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  it('calls openUrls when Open URLs button is clicked', async () => {
    const openUrls = vi.fn().mockResolvedValue(undefined);
    mockHooks({ openUrls });
    const user = userEvent.setup();

    render(<App />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'https://example.com');
    await user.click(screen.getByRole('button', { name: /open urls/i }));

    expect(openUrls).toHaveBeenCalledWith('https://example.com');
  });

  it('calls openUrls on Ctrl+Enter in textarea', async () => {
    const openUrls = vi.fn().mockResolvedValue(undefined);
    mockHooks({ openUrls });
    const user = userEvent.setup();

    render(<App />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'https://example.com');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(openUrls).toHaveBeenCalledWith('https://example.com');
  });

  it('disables button when isLoading is true', () => {
    mockHooks({ isLoading: true });
    render(<App />);

    expect(screen.getByRole('button', { name: /open urls/i })).toBeDisabled();
  });

  it('shows result status message after successful open', () => {
    mockHooks({
      result: {
        successful: 3,
        failed: 0,
        skipped: 1,
        totalTime: 2500,
        errors: [],
      },
    });
    render(<App />);

    expect(screen.getByText(/opened 3 tabs/i)).toBeInTheDocument();
  });

  it('shows singular "tab" when 1 URL opened', () => {
    mockHooks({
      result: {
        successful: 1,
        failed: 0,
        skipped: 0,
        totalTime: 500,
        errors: [],
      },
    });
    render(<App />);

    expect(screen.getByText(/opened 1 tab\b/i)).toBeInTheDocument();
  });

  it('shows ErrorDisplay when error is set', () => {
    mockHooks({ error: 'Something went wrong' });
    render(<App />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('shows ErrorDisplay for partial URL failures', () => {
    mockHooks({
      result: {
        successful: 2,
        failed: 1,
        skipped: 0,
        totalTime: 1000,
        errors: ['https://bad.com failed'],
      },
    });
    render(<App />);

    expect(screen.getByText(/some urls failed to open/i)).toBeInTheDocument();
  });

  it('renders metrics grid when metrics has no error', () => {
    mockHooks();
    render(<App />);

    // MetricsGrid should be rendered — check for a metrics value
    expect(screen.getByText('5')).toBeInTheDocument(); // tabsOpened
  });

  it('shows metrics error message when metrics.error is set', () => {
    mockHooks({}, { error: true });
    render(<App />);

    expect(screen.getByText(/unable to load metrics/i)).toBeInTheDocument();
  });

  it('renders inside ErrorBoundary (catches errors from children)', () => {
    mockHooks();
    // Simulate a rendering error in a child by mocking useOpenUrls to throw
    vi.spyOn(useOpenUrlsModule, 'useOpenUrls').mockImplementation(() => {
      throw new Error('render crash');
    });

    // ErrorBoundary should catch and show error UI
    render(<App />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
