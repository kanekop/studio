import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { AppError } from '@/shared/errors';

interface AsyncOperationState<T> {
  data: T | null;
  isLoading: boolean;
  error: AppError | null;
  isSuccess: boolean;
}

interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: AppError) => void;
  retryCount?: number;
  retryDelay?: (attemptNumber: number) => number;
  onRetry?: (attemptNumber: number, error: AppError) => void;
}

interface UseAsyncOperationResult<T, Args extends any[]> extends AsyncOperationState<T> {
  execute: (...args: Args) => Promise<T>;
  reset: () => void;
  cancel: () => void;
  isRetrying: boolean;
  currentRetryCount: number;
}

const defaultRetryDelay = (attemptNumber: number) => Math.pow(2, attemptNumber - 1) * 1000; // 指数バックオフ

export function useAsyncOperation<T, Args extends any[]>(
  operation: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
): UseAsyncOperationResult<T, Args> {
  const {
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = defaultRetryDelay,
    onRetry,
  } = options;

  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const [isRetrying, setIsRetrying] = useState(false);
  const [currentRetryCount, setCurrentRetryCount] = useState(0);

  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentOperationRef = useRef<Promise<T> | null>(null);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null, isSuccess: false });
    setIsRetrying(false);
    setCurrentRetryCount(0);
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    setIsRetrying(false);
    
    if (state.isLoading) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading]);

  const executeWithRetry = useCallback(
    async (args: Args, attempt: number = 0): Promise<T> => {
      if (!isMountedRef.current) {
        throw new Error('Component unmounted');
      }

      try {
        if (attempt === 0) {
          setState({ data: null, isLoading: true, error: null, isSuccess: false });
          setCurrentRetryCount(0);
          setIsRetrying(false);
        } else {
          setIsRetrying(true);
          setCurrentRetryCount(attempt);
        }

        const operationPromise = operation(...args);
        currentOperationRef.current = operationPromise;
        
        const result = await operationPromise;

        if (!isMountedRef.current) {
          throw new Error('Component unmounted');
        }

        setState({ data: result, isLoading: false, error: null, isSuccess: true });
        setIsRetrying(false);
        setCurrentRetryCount(0);
        
        onSuccess?.(result);
        return result;

      } catch (error) {
        if (!isMountedRef.current) {
          throw error;
        }

        const appError = error instanceof AppError ? error : new AppError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR' as any,
          error,
          true
        );

        // リトライ可能で、リトライ回数が残っている場合
        if (AppError.isRetryable(appError) && attempt < retryCount) {
          const nextAttempt = attempt + 1;
          onRetry?.(nextAttempt, appError);

          return new Promise<T>((resolve, reject) => {
            const delay = retryDelay(nextAttempt);
            retryTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                executeWithRetry(args, nextAttempt)
                  .then(resolve)
                  .catch(reject);
              } else {
                reject(new Error('Component unmounted'));
              }
            }, delay);
          });
        }

        // リトライ不可能またはリトライ上限に達した場合
        setState({ data: null, isLoading: false, error: appError, isSuccess: false });
        setIsRetrying(false);
        setCurrentRetryCount(0);
        
        onError?.(appError);
        throw appError;
      }
    },
    [operation, onSuccess, onError, retryCount, retryDelay, onRetry]
  );

  const execute = useCallback(
    (...args: Args): Promise<T> => {
      // 前の実行をキャンセル
      cancel();
      
      return executeWithRetry(args);
    },
    [executeWithRetry, cancel]
  );

  // コンポーネントのアンマウント時のクリーンアップ
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    cancel,
    isRetrying,
    currentRetryCount,
  };
}

// 複数の非同期操作を並列実行するためのヘルパーフック
export function useParallelAsyncOperations<T extends Record<string, any>>(
  operations: { [K in keyof T]: (...args: any[]) => Promise<T[K]> },
  options: UseAsyncOperationOptions<T> = {}
) {
  const [state, setState] = useState<AsyncOperationState<Partial<T>>>({
    data: {},
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const execute = useCallback(
    async (operationArgs: { [K in keyof T]?: any[] }) => {
      setState({ data: {}, isLoading: true, error: null, isSuccess: false });

      try {
        const promises = Object.entries(operations).map(async ([key, operation]) => {
          const args = operationArgs[key as keyof T] || [];
          const result = await (operation as any)(...args);
          return [key, result] as const;
        });

        const results = await Promise.all(promises);
        const data = Object.fromEntries(results) as T;

        setState({ data, isLoading: false, error: null, isSuccess: true });
        options.onSuccess?.(data);
        return data;

      } catch (error) {
        const appError = error instanceof AppError ? error : new AppError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR' as any,
          error
        );

        setState({ data: {}, isLoading: false, error: appError, isSuccess: false });
        options.onError?.(appError);
        throw appError;
      }
    },
    [operations, options]
  );

  const reset = useCallback(() => {
    setState({ data: {}, isLoading: false, error: null, isSuccess: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}