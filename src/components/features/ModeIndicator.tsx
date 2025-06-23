// src/components/features/ModeIndicator.tsx
"use client";
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ModeIndicatorProps {
  selectionMode: 'merge' | 'delete' | 'none';
}

export const ModeIndicator: React.FC<ModeIndicatorProps> = ({ selectionMode }) => {
  if (selectionMode === 'none') return null;

  const getModeConfig = () => {
    switch (selectionMode) {
      case 'merge':
        return {
          icon: '🔀',
          text: 'マージモード',
          variant: 'default' as const,
          className: 'bg-blue-500 hover:bg-blue-600 animate-in fade-in slide-in-from-top-2 duration-200',
        };
      case 'delete':
        return {
          icon: '🗑️',
          text: '削除モード',
          variant: 'destructive' as const,
          className: 'animate-in fade-in slide-in-from-top-2 duration-200',
        };
      default:
        return null;
    }
  };

  const config = getModeConfig();
  if (!config) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <Badge 
        variant={config.variant}
        className={`px-4 py-2 text-sm font-medium shadow-lg ${config.className}`}
      >
        <span className="mr-2">{config.icon}</span>
        {config.text}
      </Badge>
    </div>
  );
};