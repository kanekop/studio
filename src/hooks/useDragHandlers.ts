import { useState, useCallback, useRef } from 'react';

interface UseDragHandlersOptions {
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  disabled?: boolean;
  data?: Record<string, string>;
}

interface UseDragHandlersReturn {
  isDragging: boolean;
  isDraggedOver: boolean;
  dragHandlers: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  setDraggedOver: (dragged: boolean) => void;
}

export const useDragHandlers = (options: UseDragHandlersOptions = {}): UseDragHandlersReturn => {
  const { onDragStart, onDragEnd, onDrop, disabled = false, data = {} } = options;
  
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    // Set drag data
    Object.entries(data).forEach(([key, value]) => {
      e.dataTransfer.setData(key, value);
    });

    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    
    if (onDragStart) {
      onDragStart(e);
    }
  }, [disabled, data, onDragStart]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setIsDragging(false);
    setIsDraggedOver(false);
    dragCounter.current = 0;
    
    if (onDragEnd) {
      onDragEnd(e);
    }
  }, [onDragEnd]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.dataTransfer.dropEffect = "move";
  }, [disabled]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    dragCounter.current++;
    if (!isDraggedOver) {
      setIsDraggedOver(true);
    }
  }, [disabled, isDraggedOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    
    // Only set to false when we've left all child elements
    if (dragCounter.current === 0) {
      setIsDraggedOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOver(false);
    dragCounter.current = 0;
    
    if (disabled) return;
    
    if (onDrop) {
      onDrop(e);
    }
  }, [disabled, onDrop]);

  const setDraggedOver = useCallback((dragged: boolean) => {
    setIsDraggedOver(dragged);
    if (!dragged) {
      dragCounter.current = 0;
    }
  }, []);

  return {
    isDragging,
    isDraggedOver,
    dragHandlers: {
      draggable: !disabled,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    setDraggedOver,
  };
};