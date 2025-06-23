"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Users, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/shared/utils/utils';
import type { Region } from '@/shared/types';

interface FaceRegion extends Region {
  id: string;
  personId?: string;
  personName?: string;
}

interface FaceRegionSelectorProps {
  imageFile: File;
  onRegionsChange: (regions: FaceRegion[]) => void;
  className?: string;
}

export const FaceRegionSelector: React.FC<FaceRegionSelectorProps> = ({
  imageFile,
  onRegionsChange,
  className
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [regions, setRegions] = useState<FaceRegion[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<Region | null>(null);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image when file changes
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        imageRef.current = img;
      };
      img.src = url;
      
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  // Calculate display size based on container
  useEffect(() => {
    const calculateDisplaySize = () => {
      if (!imageSize.width || !containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const aspectRatio = imageSize.width / imageSize.height;
      let displayWidth = containerWidth;
      let displayHeight = containerWidth / aspectRatio;

      if (displayHeight > 500) { // Max height constraint
        displayHeight = 500;
        displayWidth = displayHeight * aspectRatio;
      }
      
      setDisplaySize({ width: displayWidth, height: displayHeight });
    };

    calculateDisplaySize();
    window.addEventListener('resize', calculateDisplaySize);
    return () => window.removeEventListener('resize', calculateDisplaySize);
  }, [imageSize]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !imageRef.current || displaySize.width === 0) return;

    // Apply zoom
    const zoomFactor = zoom / 100;
    canvas.width = displaySize.width * zoomFactor;
    canvas.height = displaySize.height * zoomFactor;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    
    // Apply pan
    ctx.translate(pan.x, pan.y);
    
    // Draw image with zoom
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw existing regions
    regions.forEach(region => {
      const scaledRegion = scaleRegionToDisplay(region);
      ctx.strokeStyle = '#3b82f6'; // Blue for saved regions
      ctx.lineWidth = 2;
      ctx.strokeRect(
        scaledRegion.x * zoomFactor,
        scaledRegion.y * zoomFactor,
        scaledRegion.width * zoomFactor,
        scaledRegion.height * zoomFactor
      );
      
      // Draw label
      if (region.personName) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(
          scaledRegion.x * zoomFactor,
          scaledRegion.y * zoomFactor - 20,
          region.personName.length * 8 + 10,
          20
        );
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.fillText(
          region.personName,
          scaledRegion.x * zoomFactor + 5,
          scaledRegion.y * zoomFactor - 5
        );
      }
    });
    
    // Draw current drawing rectangle
    if (currentRect) {
      const scaledRect = scaleRegionToDisplay(currentRect);
      ctx.strokeStyle = '#10b981'; // Green for current drawing
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        scaledRect.x * zoomFactor,
        scaledRect.y * zoomFactor,
        scaledRect.width * zoomFactor,
        scaledRect.height * zoomFactor
      );
      ctx.setLineDash([]);
    }
    
    // Restore context state
    ctx.restore();
  }, [displaySize, regions, currentRect, zoom, pan]);

  // Scale region from original to display coordinates
  const scaleRegionToDisplay = (region: Region): Region => {
    if (!imageSize.width || !displaySize.width) return region;
    const scale = displaySize.width / imageSize.width;
    return {
      x: region.x * scale,
      y: region.y * scale,
      width: region.width * scale,
      height: region.height * scale
    };
  };

  // Scale region from display to original coordinates
  const scaleRegionToOriginal = (region: Region): Region => {
    if (!imageSize.width || !displaySize.width) return region;
    const scale = imageSize.width / displaySize.width;
    const zoomFactor = zoom / 100;
    return {
      x: (region.x / zoomFactor - pan.x) * scale,
      y: (region.y / zoomFactor - pan.y) * scale,
      width: (region.width / zoomFactor) * scale,
      height: (region.height / zoomFactor) * scale
    };
  };

  // Redraw when dependencies change
  useEffect(() => {
    draw();
  }, [draw]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click
    const pos = getMousePos(e);
    setStartPoint(pos);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const pos = getMousePos(e);
    const width = pos.x - startPoint.x;
    const height = pos.y - startPoint.y;
    setCurrentRect({
      x: width > 0 ? startPoint.x : pos.x,
      y: height > 0 ? startPoint.y : pos.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect || !startPoint) return;
    setIsDrawing(false);
    
    if (currentRect.width > 10 && currentRect.height > 10) { // Minimum size
      const originalRegion = scaleRegionToOriginal(currentRect);
      const newRegion: FaceRegion = {
        id: `region-${Date.now()}`,
        ...originalRegion
      };
      const updatedRegions = [...regions, newRegion];
      setRegions(updatedRegions);
      onRegionsChange(updatedRegions);
    }
    
    setStartPoint(null);
    setCurrentRect(null);
  };

  const handleDeleteRegion = (regionId: string) => {
    const updatedRegions = regions.filter(r => r.id !== regionId);
    setRegions(updatedRegions);
    onRegionsChange(updatedRegions);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleReset = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label className="text-base font-semibold mb-2 block">顔領域の選択</Label>
        <p className="text-sm text-muted-foreground mb-4">
          画像内の顔をドラッグして選択してください。複数の顔を選択できます。
        </p>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="relative bg-muted/20 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair max-w-full mx-auto"
          style={{ display: 'block' }}
        />
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="w-32">
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={50}
              max={200}
              step={25}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12">{zoom}%</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
        >
          <RotateCw className="h-4 w-4 mr-2" />
          リセット
        </Button>
      </div>

      {/* Selected Regions */}
      {regions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">選択された顔領域 ({regions.length})</Label>
          <div className="grid grid-cols-1 gap-2">
            {regions.map((region, index) => (
              <Card key={region.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">顔領域 {index + 1}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRegion(region.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};