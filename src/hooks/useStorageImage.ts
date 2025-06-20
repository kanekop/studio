import { useState, useEffect, useCallback, useRef } from 'react';
import { ref as storageRefStandard, getDownloadURL } from 'firebase/storage';
import { storage as appFirebaseStorage } from '@/lib/firebase';

interface UseStorageImageResult {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

interface CacheEntry {
  url: string;
  timestamp: number;
}

// Simple in-memory cache for image URLs
const imageUrlCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000]; // Retry delays in milliseconds

export const useStorageImage = (
  storagePath: string | null,
  retryDelays: number[] = DEFAULT_RETRY_DELAYS
): UseStorageImageResult => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  const getCachedUrl = useCallback((path: string): string | null => {
    const cached = imageUrlCache.get(path);
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
      if (!isExpired) {
        return cached.url;
      } else {
        imageUrlCache.delete(path);
      }
    }
    return null;
  }, []);

  const setCachedUrl = useCallback((path: string, url: string) => {
    imageUrlCache.set(path, {
      url,
      timestamp: Date.now(),
    });
  }, []);

  const fetchImageUrl = useCallback(async (path: string): Promise<string> => {
    if (!appFirebaseStorage) {
      throw new Error('Firebase Storage is not initialized');
    }

    // Check cache first
    const cachedUrl = getCachedUrl(path);
    if (cachedUrl) {
      return cachedUrl;
    }

    try {
      const fileRef = storageRefStandard(appFirebaseStorage, path);
      const url = await getDownloadURL(fileRef);
      
      // Verify the image URL is accessible
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Image not accessible: ${response.status} ${response.statusText}`);
      }

      // Cache the URL
      setCachedUrl(path, url);
      return url;
    } catch (error) {
      if (error instanceof Error) {
        // Enhance error with more context
        if (error.message.includes('object-not-found')) {
          throw new Error(`Image not found at path: ${path}`);
        } else if (error.message.includes('unauthorized')) {
          throw new Error(`Permission denied for image: ${path}`);
        }
      }
      throw error;
    }
  }, [getCachedUrl, setCachedUrl]);

  const loadImage = useCallback(async (path: string, attempt: number = 0) => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = await fetchImageUrl(path);
      if (mountedRef.current) {
        setImageUrl(url);
        setRetryCount(0);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (mountedRef.current) {
        if (attempt < retryDelays.length) {
          // Schedule retry
          const delay = retryDelays[attempt];
          timeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setRetryCount(attempt + 1);
              loadImage(path, attempt + 1);
            }
          }, delay);
        } else {
          // All retries exhausted
          setError(error);
          setImageUrl(null);
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchImageUrl, retryDelays]);

  const retry = useCallback(() => {
    if (storagePath) {
      setRetryCount(0);
      loadImage(storagePath, 0);
    }
  }, [storagePath, loadImage]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (storagePath) {
      // Check cache first for immediate response
      const cachedUrl = getCachedUrl(storagePath);
      if (cachedUrl) {
        setImageUrl(cachedUrl);
        setError(null);
        setIsLoading(false);
      } else {
        loadImage(storagePath, 0);
      }
    } else {
      setImageUrl(null);
      setError(null);
      setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [storagePath, loadImage, getCachedUrl]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    imageUrl,
    isLoading,
    error,
    retry,
  };
};