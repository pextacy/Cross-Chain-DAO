import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className=\"min-h-screen bg-gray-950 flex items-center justify-center px-4\">
          <div className=\"text-center max-w-md\">
            <div className=\"w-16 h-16 bg-danger-600/20 rounded-full flex items-center justify-center mx-auto mb-6\">
              <ExclamationTriangleIcon className=\"w-8 h-8 text-danger-400\" />
            </div>

            <h1 className=\"text-2xl font-bold text-gray-100 mb-2\">
              Something went wrong
            </h1>

            <p className=\"text-gray-400 mb-6\">
              An unexpected error occurred while loading the treasury dashboard.
              Please try refreshing the page or contact support if the problem persists.
            </p>

            <div className=\"space-y-3\">
              <button
                onClick={() => window.location.reload()}
                className=\"btn-primary w-full\"
              >
                Refresh Page
              </button>

              <button
                onClick={() => this.setState({ hasError: false })}
                className=\"btn-secondary w-full\"
              >
                Try Again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className=\"mt-6 text-left\">
                <summary className=\"text-sm text-gray-400 cursor-pointer hover:text-gray-300\">
                  Error Details (Development)
                </summary>
                <pre className=\"mt-2 text-xs text-danger-400 bg-gray-900 p-3 rounded border border-gray-700 overflow-auto\">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;