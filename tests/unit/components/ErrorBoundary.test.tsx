// Unit tests for components/ErrorBoundary.tsx

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A component that unconditionally throws
const ThrowComponent = (): never => {
  throw new Error('test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React's console.error output for caught errors during tests
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('catches thrown error and renders default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );
    expect(
      screen.getByText('Something went wrong. Please close and reopen the popup.')
    ).toBeInTheDocument();
  });

  it('does not render children after error is caught', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );
    // The ThrowComponent should not produce any output — only fallback
    expect(container.querySelector('.error-container')).toBeInTheDocument();
  });

  it('logs the caught error through logger.error without re-throwing', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    expect(() => {
      render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught',
      expect.objectContaining({ message: 'test error' })
    );
  });
});
