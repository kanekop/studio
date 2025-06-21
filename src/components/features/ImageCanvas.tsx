"use client";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRoster } from '@/contexts';
import type { DisplayRegion, Region } from '@/types';

interface ImageCanvasProps {
  onRegionDrawn: (region: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ onRegionDrawn }) => {
  const { imageDataUrl, originalImageSize, drawnRegions: existingOriginalRegions, getScaledRegionForDisplay } = useRoster();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<DisplayRegion | null>(null);
  const [imageDisplaySize, setImageDisplaySize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !imageRef.current || !originalImageSize) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate display size maintaining aspect ratio
    const containerWidth = canvas.parentElement?.clientWidth || canvas.width;
    const aspectRatio = originalImageSize.width / originalImageSize.height;
    
    let displayWidth = containerWidth;
    let displayHeight = displayWidth / aspectRatio;
    
    if (displayHeight > 600) {
      displayHeight = 600;
      displayWidth = displayHeight * aspectRatio;
    }

    // Set canvas size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    setImageDisplaySize({ width: displayWidth, height: displayHeight });

    // Draw image
    ctx.drawImage(imageRef.current, 0, 0, displayWidth, displayHeight);

    // Draw existing regions
    existingOriginalRegions.forEach((region) => {
      const scaledRegion = getScaledRegionForDisplay(region, { width: displayWidth, height: displayHeight });
      ctx.strokeStyle = '#A855BA';
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledRegion.x, scaledRegion.y, scaledRegion.width, scaledRegion.height);
    });

    // Draw current drawing rectangle
    if (currentRect && isDrawing) {
      ctx.strokeStyle = '#5EEAD4';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.setLineDash([]);
    }
  }, [imageRef, originalImageSize, existingOriginalRegions, currentRect, isDrawing, getScaledRegionForDisplay]);

  // Load image when imageDataUrl changes
  useEffect(() => {
    if (!imageDataUrl) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      draw();
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, draw]);

  // Redraw when regions change
  useEffect(() => {
    draw();
  }, [existingOriginalRegions, draw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPoint({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const newRect: DisplayRegion = {
      id: 'drawing',
      x: Math.min(startPoint.x, currentX),
      y: Math.min(startPoint.y, currentY),
      width: Math.abs(currentX - startPoint.x),
      height: Math.abs(currentY - startPoint.y),
    };

    setCurrentRect(newRect);
    draw();
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect || !imageDisplaySize) return;

    if (currentRect.width > 10 && currentRect.height > 10) {
      onRegionDrawn(
        {
          x: currentRect.x,
          y: currentRect.y,
          width: currentRect.width,
          height: currentRect.height,
        },
        imageDisplaySize
      );
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
    draw();
  };

  if (!imageDataUrl) {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No image loaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className="border rounded-lg cursor-crosshair max-w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default ImageCanvas;