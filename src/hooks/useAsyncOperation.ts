import { useState, useCallback } from 'react';

interface AsyncOperationState<T> {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
}

interface UseAsyncOperationReturn<T> extends AsyncOperationState<T> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

export const useAsyncOperation = <T,>(
  operation: (...args: any[]) => Promise<T>
): UseAsyncOperationReturn<T> => {
  const [state, setState] = useState<AsyncOperationState<T>>({
    isLoading: false,
    error: null,
    data: null,
  });

  const execute = useCallback(async (...args: any[]): Promise<T> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await operation(...args);
      setState({ isLoading: false, error: null, data: result });
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, isLoading: false, error: errorObj }));
      throw errorObj;
    }
  }, [operation]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};