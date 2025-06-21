"use client";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { useImage } from '@/contexts/ImageContext';
import type { DisplayRegion, Region } from '@/types';

interface ImageCanvasProps {
  onRegionDrawn: (region: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ onRegionDrawn }) => {
  const { imageDataUrl, originalImageSize, drawnRegions: existingOriginalRegions, getScaledRegionForDisplay } = useImage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<DisplayRegion | null>(null);
  const [imageDisplaySize, setImageDisplaySize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !imageRef.current || !originalImageSize) {
      console.log('Draw skipped - missing requirements:', {
        ctx: !!ctx,
        canvas: !!canvas,
        image: !!imageRef.current,
        originalSize: !!originalImageSize
      });
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate display size maintaining aspect ratio
    const containerWidth = canvas.parentElement?.clientWidth || canvas.width;
    const aspectRatio = originalImageSize.width / originalImageSize.height;
    let displayWidth = containerWidth;
    let displayHeight = containerWidth / aspectRatio;

    if (displayHeight > (window.innerHeight * 0.7)) { // Max height constraint
        displayHeight = window.innerHeight * 0.7;
        displayWidth = displayHeight * aspectRatio;
    }
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    console.log('Canvas dimensions:', { width: canvas.width, height: canvas.height });
    
    if (imageDisplaySize.width !== displayWidth || imageDisplaySize.height !== displayHeight) {
      setImageDisplaySize({ width: displayWidth, height: displayHeight });
    }
    
    // Draw image
    ctx.drawImage(imageRef.current, 0, 0, displayWidth, displayHeight);

    // Draw existing regions (converted to display coordinates)
    existingOriginalRegions.forEach(originalRegion => {
      const displayRegion = getScaledRegionForDisplay(originalRegion, {width: displayWidth, height: displayHeight});
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)'; // Yellow for saved regions
      ctx.lineWidth = 2;
      ctx.strokeRect(displayRegion.x, displayRegion.y, displayRegion.width, displayRegion.height);
    });
    
    // Draw current drawing rectangle
    if (currentRect) {
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.9)'; // Green for current drawing
      ctx.lineWidth = 2;
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      console.log('Drawing rect:', currentRect);
    }
  }, [originalImageSize, currentRect, existingOriginalRegions, getScaledRegionForDisplay, imageDisplaySize]);

  useEffect(() => {
    if (imageDataUrl) {
      console.log('Loading image from:', imageDataUrl.substring(0, 50) + '...');
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully');
        imageRef.current = img;
        draw(); // Initial draw
      };
      img.onerror = (e) => {
        console.error('Image failed to load:', e);
      };
      img.src = imageDataUrl;
    }
  }, [imageDataUrl, draw]);

  useEffect(() => {
    // Redraw when existing regions change or display size changes
    if(imageRef.current) draw();
  }, [existingOriginalRegions, imageDisplaySize, draw]);

  useEffect(() => {
    const handleResize = () => {
      if(imageRef.current) draw(); // Redraw on window resize
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    console.log('Mouse position:', pos);
    return pos;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('Mouse down');
    if (e.button !== 0) return; // Only left click
    const pos = getMousePos(e);
    setStartPoint(pos);
    setCurrentRect({ id: 'current', ...pos, width: 0, height: 0 });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const pos = getMousePos(e);
    const width = pos.x - startPoint.x;
    const height = pos.y - startPoint.y;
    const newRect = {
      id: 'current',
      x: width > 0 ? startPoint.x : pos.x,
      y: height > 0 ? startPoint.y : pos.y,
      width: Math.abs(width),
      height: Math.abs(height),
    };
    console.log('Drawing rect:', newRect);
    setCurrentRect(newRect);
    if(imageRef.current) draw(); // Redraw while dragging
  };

  const handleMouseUp = () => {
    console.log('Mouse up');
    if (!isDrawing || !currentRect || !startPoint) return;
    setIsDrawing(false);
    if (currentRect.width > 5 && currentRect.height > 5) { // Minimum size for a region
      console.log('Region drawn:', currentRect);
      onRegionDrawn(currentRect, imageDisplaySize);
    }
    setStartPoint(null);
    setCurrentRect(null);
    if(imageRef.current) draw(); // Final draw to clear currentRect display
  };
  
  const handleMouseLeave = () => {
    // Optional: if you want to cancel drawing if mouse leaves canvas
    // if (isDrawing) {
    //   setIsDrawing(false);
    //   setStartPoint(null);
    //   setCurrentRect(null);
    //   if(imageRef.current) draw();
    // }
  };

  if (!imageDataUrl) return <p className="text-center text-muted-foreground">No image loaded.</p>;

  return (
    <div className="w-full h-auto relative touch-none select-none border border-border rounded-md shadow-sm overflow-hidden bg-muted/20" style={{aspectRatio: originalImageSize ? `${originalImageSize.width}/${originalImageSize.height}` : '16/9'}}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair w-full h-full block"
        aria-label="Image canvas for drawing face regions"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
};

export default ImageCanvas;