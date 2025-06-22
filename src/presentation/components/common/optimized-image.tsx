"use client";
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/utils/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  width = 150,
  height = 150,
  className,
  fallbackSrc = "https://placehold.co/150x150.png?text=No+Image",
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  fill = false,
  objectFit = 'cover',
  placeholder = 'empty',
  blurDataURL,
  loading = 'lazy',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority);

  // Intersection Observer for lazy loading
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    skip: priority || shouldLoad,
  });

  // 画像がビューポート内に入ったら読み込み開始
  useEffect(() => {
    if (inView && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [inView, shouldLoad]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
    onError?.();
  };

  // ベース64の小さなぼかし画像を生成
  const generateBlurDataURL = (width: number, height: number) => {
    if (blurDataURL) return blurDataURL;
    
    // シンプルなグレーのぼかし画像
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="#f3f4f6"/></svg>`
    ).toString('base64')}`;
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden",
        fill ? "w-full h-full" : "",
        className
      )}
      style={!fill ? { width, height } : undefined}
    >
      {isLoading && (
        <Skeleton
          className={cn(
            "absolute inset-0 z-10",
            fill ? "w-full h-full" : ""
          )}
          style={!fill ? { width, height } : undefined}
        />
      )}
      
      {shouldLoad ? (
        <Image
          src={imgSrc}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          sizes={sizes}
          priority={priority}
          loading={loading}
          placeholder={placeholder === 'blur' ? 'blur' : 'empty'}
          blurDataURL={placeholder === 'blur' ? generateBlurDataURL(width, height) : undefined}
          style={{
            objectFit: fill ? objectFit : undefined,
          }}
          className={cn(
            "transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
            !fill && objectFit ? `object-${objectFit}` : ""
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        // プレースホルダー（lazy loading待機中）
        <div
          className={cn(
            "flex items-center justify-center bg-muted text-muted-foreground text-xs",
            fill ? "w-full h-full" : ""
          )}
          style={!fill ? { width, height } : undefined}
        >
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
}