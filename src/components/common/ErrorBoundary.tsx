import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[280px] p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400 font-medium mb-1">Something went wrong</p>
          <pre className="text-sm text-gray-600 dark:text-gray-400 max-w-full overflow-auto p-3 bg-white dark:bg-gray-900 rounded mb-4">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try again
          </button>
          <a
            href="/"
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go to dashboard
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
