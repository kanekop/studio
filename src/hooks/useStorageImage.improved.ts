import { useState, useEffect, useRef } from 'react';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { handleStorageError, AppError } from '@/lib/errors';

interface UseStorageImageOptions {
  fallbackUrl?: string;
  enableCache?: boolean;
  retryCount?: number;
  timeout?: number;
}

interface UseStorageImageResult {
  url: string | null;
  isLoading: boolean;
  error: AppError | null;
  retry: () => void;
}

// グローバルキャッシュ（メモリリーク防止のため、最大1000エントリ）
class ImageCache {
  private cache = new Map<string, { url: string; timestamp: number }>();
  private readonly maxSize = 1000;
  private readonly maxAge = 15 * 60 * 1000; // 15分

  set(key: string, url: string) {
    // キャッシュサイズ制限
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { url, timestamp: Date.now() });
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // 期限切れチェック
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.url;
  }

  clear() {
    this.cache.clear();
  }
}

const imageCache = new ImageCache();

export function useStorageImage(
  storagePath: string | null | undefined,
  options: UseStorageImageOptions = {}
): UseStorageImageResult {
  const {
    fallbackUrl = "https://placehold.co/150x150.png?text=No+Image",
    enableCache = true,
    retryCount = 2,
    timeout = 10000, // 10秒タイムアウト
  } = options;

  const [state, setState] = useState<{
    url: string | null;
    isLoading: boolean;
    error: AppError | null;
  }>({
    url: null,
    isLoading: true,
    error: null,
  });

  const isMountedRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const fetchImage = async (path: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // キャッシュチェック
      if (enableCache) {
        const cached = imageCache.get(path);
        if (cached && isMountedRef.current) {
          setState({ url: cached, isLoading: false, error: null });
          return;
        }
      }

      // 前のリクエストをキャンセル
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      controllerRef.current = new AbortController();
      const { signal } = controllerRef.current;

      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        controllerRef.current?.abort();
      }, timeout);

      try {
        if (!storage) {
          throw new Error('Firebase Storage is not initialized');
        }

        const imageRef = storageRef(storage, path);
        const url = await getDownloadURL(imageRef);

        // レスポンス検証
        const response = await fetch(url, { 
          method: 'HEAD', 
          signal,
          cache: 'no-cache'
        });

        if (!response.ok) {
          throw new Error(`Image validation failed: ${response.status}`);
        }

        clearTimeout(timeoutId);

        // キャッシュに保存
        if (enableCache) {
          imageCache.set(path, url);
        }

        if (isMountedRef.current) {
          setState({ url, isLoading: false, error: null });
        }

        retryCountRef.current = 0; // 成功時はリトライカウントをリセット

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (signal.aborted) {
          // アボートされた場合は何もしない
          return;
        }

        throw fetchError;
      }

    } catch (error) {
      console.error(`Failed to load image: ${path}`, error);
      
      const appError = handleStorageError(error);
      
      // リトライ可能で、リトライ回数が残っている場合
      if (AppError.isRetryable(appError) && retryCountRef.current < retryCount) {
        retryCountRef.current++;
        console.log(`Retrying image load (${retryCountRef.current}/${retryCount}): ${path}`);
        
        // 指数バックオフ（1秒、2秒、4秒...)
        const delay = Math.pow(2, retryCountRef.current - 1) * 1000;
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchImage(path);
          }
        }, delay);
        return;
      }

      // リトライ上限に達した、またはリトライ不可能な場合はフォールバックURL使用
      if (isMountedRef.current) {
        setState({ 
          url: fallbackUrl, 
          isLoading: false, 
          error: appError 
        });
      }
    }
  };

  const retry = () => {
    if (storagePath) {
      retryCountRef.current = 0;
      fetchImage(storagePath);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!storagePath) {
      setState({ url: fallbackUrl, isLoading: false, error: null });
      return;
    }

    fetchImage(storagePath);

    return () => {
      isMountedRef.current = false;
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
    };
  }, [storagePath, fallbackUrl, enableCache, retryCount, timeout]);

  // コンポーネントのアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    retry,
  };
}

// キャッシュクリア用のユーティリティ関数
export const clearImageCache = () => {
  imageCache.clear();
};