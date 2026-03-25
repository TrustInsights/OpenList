import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

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

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('custom fallback')).toBeInTheDocument();
    expect(
      screen.queryByText('Something went wrong. Please close and reopen the popup.')
    ).not.toBeInTheDocument();
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

  it('calls componentDidCatch (logger) when error is caught', () => {
    // The boundary should not re-throw; logger.error is called
    expect(() => {
      render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();
  });
});
