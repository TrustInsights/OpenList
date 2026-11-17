// React error boundary that logs render errors and shows a fallback

import { logger } from '@/utils/logger';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches errors that child components throw while they render.
 * Logs the error and renders a fixed error message in place of the children.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('ErrorBoundary caught', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <p className="error-message">Something went wrong. Please close and reopen the popup.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
