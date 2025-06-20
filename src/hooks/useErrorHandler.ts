import { useCallback, createElement } from 'react';
import { useToast } from './use-toast';
import { AppError, ErrorType } from '@/types/errors';

interface ErrorHandlerOptions {
  showToast?: boolean;
  customMessages?: Partial<Record<ErrorType, string>>;
  onError?: (error: AppError) => void;
}

interface RetryButtonProps {
  onRetry: () => void;
}

const createRetryButton = (onRetry: () => void) => {
  return createElement(
    'button',
    {
      onClick: onRetry,
      className: "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
    },
    '再試行'
  );
};

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const { toast } = useToast();
  const { 
    showToast = true, 
    customMessages = {},
    onError 
  } = options;

  const getErrorMessage = useCallback((error: AppError): string => {
    if (customMessages[error.type]) {
      return customMessages[error.type]!;
    }

    switch (error.type) {
      case ErrorType.NETWORK:
        return "ネットワークエラーが発生しました。インターネット接続を確認してください。";
      case ErrorType.PERMISSION:
        return "この操作を実行する権限がありません。";
      case ErrorType.NOT_FOUND:
        return "要求されたリソースが見つかりません。";
      case ErrorType.VALIDATION:
        return "入力内容に問題があります。";
      case ErrorType.AUTHENTICATION:
        return "認証が必要です。再度ログインしてください。";
      case ErrorType.STORAGE:
        return "ファイルの処理中にエラーが発生しました。";
      case ErrorType.FIRESTORE:
        return "データベースエラーが発生しました。";
      case ErrorType.UNKNOWN:
      default:
        return error.message || "予期しないエラーが発生しました。";
    }
  }, [customMessages]);

  const getErrorTitle = useCallback((error: AppError): string => {
    switch (error.type) {
      case ErrorType.NETWORK:
        return "ネットワークエラー";
      case ErrorType.PERMISSION:
        return "アクセス権限エラー";
      case ErrorType.NOT_FOUND:
        return "リソースが見つかりません";
      case ErrorType.VALIDATION:
        return "入力エラー";
      case ErrorType.AUTHENTICATION:
        return "認証エラー";
      case ErrorType.STORAGE:
        return "ストレージエラー";
      case ErrorType.FIRESTORE:
        return "データベースエラー";
      case ErrorType.UNKNOWN:
      default:
        return "エラー";
    }
  }, []);

  const handleError = useCallback((
    error: Error | AppError, 
    retryCallback?: () => void
  ) => {
    const appError = error instanceof AppError 
      ? error 
      : AppError.fromFirebaseError(error);

    // Call custom error handler if provided
    if (onError) {
      onError(appError);
    }

    // Log error for debugging
    console.error('Error handled:', {
      type: appError.type,
      message: appError.message,
      code: appError.code,
      originalError: appError.originalError,
    });

    if (showToast) {
      const title = getErrorTitle(appError);
      const description = getErrorMessage(appError);

      const toastProps: any = {
        title,
        description,
        variant: "destructive",
      };

      // Add retry button for certain error types
      if (retryCallback && (
        appError.type === ErrorType.NETWORK || 
        appError.type === ErrorType.UNKNOWN
      )) {
        toastProps.action = createRetryButton(retryCallback);
        toastProps.duration = 10000; // Longer duration for retry option
      }

      toast(toastProps);
    }

    return appError;
  }, [showToast, getErrorTitle, getErrorMessage, onError, toast]);

  const handleAsyncError = useCallback(async (
    asyncOperation: () => Promise<any>,
    retryCallback?: () => void
  ): Promise<any> => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), retryCallback);
      throw error;
    }
  }, [handleError]);

  const createErrorHandler = useCallback((
    retryCallback?: () => void
  ) => {
    return (error: Error | AppError) => handleError(error, retryCallback);
  }, [handleError]);

  const clearError = useCallback(() => {
    // This can be used to clear error states if needed
    // Implementation depends on specific use case
  }, []);

  return {
    handleError,
    handleAsyncError,
    createErrorHandler,
    clearError,
  };
};