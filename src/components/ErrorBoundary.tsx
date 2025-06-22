import React from 'react';
import { debugLog } from '@/shared/utils/debug-logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    debugLog.error('ErrorBoundary', error);
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }
    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded">
    <h2 className="text-red-700 font-semibold mb-2">エラーが発生しました</h2>
    <p className="text-red-600 mb-2">{error.message}</p>
    <details className="text-sm text-red-500">
      <summary className="cursor-pointer">詳細を表示</summary>
      <pre className="mt-2 overflow-auto max-h-40 bg-red-100 p-2 rounded">
        {error.stack}
      </pre>
    </details>
    <button 
      onClick={() => window.location.reload()} 
      className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      ページを再読み込み
    </button>
  </div>
);

export default ErrorBoundary;