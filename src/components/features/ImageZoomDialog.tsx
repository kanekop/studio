import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';
import { cn } from '@/shared/utils/utils';

interface ImageZoomDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageAlt?: string;
}

export const ImageZoomDialog: React.FC<ImageZoomDialogProps> = ({
  isOpen,
  onOpenChange,
  imageUrl,
  imageAlt = '画像',
}) => {
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 400));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleZoomChange = (values: number[]) => {
    setZoom(values[0]);
  };

  const handleReset = () => {
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageRef.current && containerRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Get container and image dimensions
      const container = containerRef.current.getBoundingClientRect();
      const image = imageRef.current.getBoundingClientRect();

      // Calculate bounds
      const maxX = Math.max(0, (image.width - container.width) / 2);
      const maxY = Math.max(0, (image.height - container.height) / 2);

      // Constrain position within bounds
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 100 && e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1 && imageRef.current && containerRef.current) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;

      const container = containerRef.current.getBoundingClientRect();
      const image = imageRef.current.getBoundingClientRect();

      const maxX = Math.max(0, (image.width - container.width) / 2);
      const maxY = Math.max(0, (image.height - container.height) / 2);

      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Prevent default touch behavior
  const handleTouchPrevent = (e: React.TouchEvent) => {
    if (zoom > 100) {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center justify-between">
            画像ズーム
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 flex items-center gap-2">
              <Slider
                value={[zoom]}
                onValueChange={handleZoomChange}
                min={50}
                max={400}
                step={25}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12 text-right">
                {zoom}%
              </span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 400}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Container */}
          <div
            ref={containerRef}
            className={cn(
              "relative overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-lg",
              "h-[calc(90vh-200px)]",
              zoom > 100 && "cursor-move"
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div
              ref={imageRef}
              className="absolute inset-0 flex items-center justify-center select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              }}
              onDragStart={(e) => e.preventDefault()}
            >
              <img
                src={imageUrl}
                alt={imageAlt}
                className="max-w-full max-h-full"
                draggable={false}
                onTouchStart={handleTouchPrevent}
                onTouchMove={handleTouchPrevent}
              />
            </div>
          </div>

          {zoom > 100 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              ドラッグまたはスワイプで画像を移動できます
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};