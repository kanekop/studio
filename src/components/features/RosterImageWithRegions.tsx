"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Region } from '@/shared/types';
import { cn } from '@/shared/utils/utils';

interface RosterImageWithRegionsProps {
  imageUrl: string;
  imageAlt?: string;
  regions?: Region[];
  className?: string;
  onClick?: () => void;
  onRegionClick?: (region: Region, index: number) => void;
}

export const RosterImageWithRegions: React.FC<RosterImageWithRegionsProps> = ({
  imageUrl,
  imageAlt = 'Roster Image',
  regions = [],
  className,
  onClick,
  onRegionClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [hoveredRegionIndex, setHoveredRegionIndex] = useState<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setOriginalSize({ width: img.width, height: img.height });
      imageRef.current = img;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const calculateDisplaySize = () => {
      if (!originalSize.width || !containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const aspectRatio = originalSize.width / originalSize.height;
      let displayWidth = containerWidth;
      let displayHeight = containerWidth / aspectRatio;

      setDisplaySize({ width: displayWidth, height: displayHeight });
    };

    calculateDisplaySize();
    window.addEventListener('resize', calculateDisplaySize);
    return () => window.removeEventListener('resize', calculateDisplaySize);
  }, [originalSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !imageRef.current || displaySize.width === 0) return;

    // Set canvas dimensions
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(imageRef.current, 0, 0, displaySize.width, displaySize.height);

    // Draw regions
    if (regions && regions.length > 0) {
      const scale = displaySize.width / originalSize.width;
      
      regions.forEach((region, index) => {
        // Scale region coordinates
        const scaledRegion = {
          x: region.x * scale,
          y: region.y * scale,
          width: region.width * scale,
          height: region.height * scale
        };

        // Draw rectangle with hover effect
        const isHovered = hoveredRegionIndex === index;
        ctx.strokeStyle = isHovered ? '#2563eb' : '#3b82f6'; // Darker blue on hover
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeRect(scaledRegion.x, scaledRegion.y, scaledRegion.width, scaledRegion.height);
        
        // Fill with transparent color on hover
        if (isHovered) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
          ctx.fillRect(scaledRegion.x, scaledRegion.y, scaledRegion.width, scaledRegion.height);
        }
        
        // Draw label
        ctx.fillStyle = isHovered ? '#2563eb' : '#3b82f6';
        ctx.fillRect(scaledRegion.x, scaledRegion.y - 24, 50, 24);
        ctx.fillStyle = 'white';
        ctx.font = '14px sans-serif';
        ctx.fillText(`顔 ${index + 1}`, scaledRegion.x + 8, scaledRegion.y - 6);
      });
    }
  }, [displaySize, originalSize, regions, hoveredRegionIndex]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!regions || regions.length === 0 || !onRegionClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check which region was clicked
    const scale = displaySize.width / originalSize.width;
    
    regions.forEach((region, index) => {
      const scaledRegion = {
        x: region.x * scale,
        y: region.y * scale,
        width: region.width * scale,
        height: region.height * scale
      };
      
      // Check if click is inside this region
      if (
        x >= scaledRegion.x &&
        x <= scaledRegion.x + scaledRegion.width &&
        y >= scaledRegion.y &&
        y <= scaledRegion.y + scaledRegion.height
      ) {
        e.stopPropagation();
        onRegionClick(region, index);
      }
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!regions || regions.length === 0 || !onRegionClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check which region is hovered
    const scale = displaySize.width / originalSize.width;
    let hoveredIndex: number | null = null;
    
    regions.forEach((region, index) => {
      const scaledRegion = {
        x: region.x * scale,
        y: region.y * scale,
        width: region.width * scale,
        height: region.height * scale
      };
      
      // Check if mouse is inside this region
      if (
        x >= scaledRegion.x &&
        x <= scaledRegion.x + scaledRegion.width &&
        y >= scaledRegion.y &&
        y <= scaledRegion.y + scaledRegion.height
      ) {
        hoveredIndex = index;
      }
    });
    
    setHoveredRegionIndex(hoveredIndex);
  };

  const handleCanvasMouseLeave = () => {
    setHoveredRegionIndex(null);
  };

  return (
    <div 
      ref={containerRef} 
      className={cn("relative w-full", className)}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{ 
          display: 'block', 
          cursor: onRegionClick && hoveredRegionIndex !== null ? 'pointer' : 'default' 
        }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
      />
    </div>
  );
};