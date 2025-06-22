"use client";
import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Person } from '@/shared/types';
import PeopleListItem from './PeopleListItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from "@/components/ui/card";

interface VirtualizedPeopleListProps {
  people: Person[];
  isLoading: boolean;
  onEditClick: (person: Person) => void;
  onInitiateConnection: (sourcePersonId: string, targetPersonId: string) => void;
  onDeleteClick?: (person: Person) => void;
  selectionMode?: 'merge' | 'delete' | 'none';
  selectedForMergeIds?: string[];
  onToggleMergeSelection?: (personId: string) => void;
  selectedForDeletionIds?: string[];
  onToggleDeleteSelection?: (personId: string) => void;
  generalActionDisabled?: boolean;
  containerHeight?: number;
  allUserPeople?: Person[];
}

const ITEMS_PER_ROW_CONFIG = {
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
  '2xl': 6
};

const ITEM_HEIGHT = 240; // カード高さ + gap
const ROW_GAP = 16;

export default function VirtualizedPeopleList({
  people,
  isLoading,
  onEditClick,
  onInitiateConnection,
  onDeleteClick,
  selectionMode = 'none',
  selectedForMergeIds = [],
  onToggleMergeSelection,
  selectedForDeletionIds = [],
  onToggleDeleteSelection,
  generalActionDisabled = false,
  containerHeight = 600,
  allUserPeople = []
}: VirtualizedPeopleListProps) {
  // Safe array access with fallback
  const safePeople = people || [];
  const safeSelectedForMergeIds = selectedForMergeIds || [];
  const safeSelectedForDeletionIds = selectedForDeletionIds || [];

  // 画面サイズに基づいて列数を動的に決定
  const itemsPerRow = useMemo(() => {
    if (typeof window === 'undefined') return ITEMS_PER_ROW_CONFIG.lg;
    
    const width = window.innerWidth;
    if (width >= 1536) return ITEMS_PER_ROW_CONFIG['2xl']; // 2xl
    if (width >= 1280) return ITEMS_PER_ROW_CONFIG.xl;     // xl
    if (width >= 1024) return ITEMS_PER_ROW_CONFIG.lg;     // lg
    if (width >= 768) return ITEMS_PER_ROW_CONFIG.md;      // md
    return ITEMS_PER_ROW_CONFIG.sm;                        // sm
  }, []);

  // 行データを作成（各行に複数のアイテム）
  const rows = useMemo(() => {
    const result: Person[][] = [];
    for (let i = 0; i < safePeople.length; i += itemsPerRow) {
      result.push(safePeople.slice(i, i + itemsPerRow));
    }
    return result;
  }, [safePeople, itemsPerRow]);

  // 親要素のref
  const parentRef = React.useRef<HTMLDivElement>(null);

  // バーチャライザーの設定
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT + ROW_GAP,
    overscan: 5, // 見えない部分のアイテムも少し余分にレンダリング
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton key={index} className="h-[220px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (safePeople.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p className="font-semibold">No people found.</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 少数のアイテムの場合は通常のグリッド表示にフォールバック
  if (safePeople.length <= 50) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {safePeople.map((person) => {
          if (!person?.id) {
            console.warn('Person object missing id:', person);
            return null;
          }
          
          return (
            <PeopleListItem
              key={person.id}
              person={person}
              onEditClick={() => onEditClick(person)}
              isSelected={selectedForMergeIds?.includes(person.id) || selectedForDeletionIds?.includes(person.id)}
              onSelectionChange={(isSelected) => {
                if (isSelected) {
                  if (selectionMode === 'merge') {
                    onToggleMergeSelection?.(person.id);
                  } else if (selectionMode === 'delete') {
                    onToggleDeleteSelection?.(person.id);
                  }
                } else {
                  if (selectionMode === 'merge') {
                    onToggleMergeSelection?.(person.id);
                  } else if (selectionMode === 'delete') {
                    onToggleDeleteSelection?.(person.id);
                  }
                }
              }}
              allUserPeople={allUserPeople}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div 
      ref={parentRef}
      className="w-full overflow-auto"
      style={{
        height: `${containerHeight}px`,
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 h-full">
                {row.map((person) => {
                  if (!person?.id) {
                    console.warn('Person object missing id:', person);
                    return null;
                  }
                  
                  return (
                    <PeopleListItem
                      key={person.id}
                      person={person}
                      onEditClick={() => onEditClick(person)}
                      onDeleteClick={onDeleteClick ? () => onDeleteClick(person) : undefined}
                      isSelected={selectedForMergeIds?.includes(person.id) || selectedForDeletionIds?.includes(person.id)}
                      onSelectionChange={(isSelected) => {
                        if (isSelected) {
                          if (selectionMode === 'merge') {
                            onToggleMergeSelection?.(person.id);
                          } else if (selectionMode === 'delete') {
                            onToggleDeleteSelection?.(person.id);
                          }
                        } else {
                          if (selectionMode === 'merge') {
                            onToggleMergeSelection?.(person.id);
                          } else if (selectionMode === 'delete') {
                            onToggleDeleteSelection?.(person.id);
                          }
                        }
                      }}
                      generalActionDisabled={generalActionDisabled}
                      allUserPeople={allUserPeople}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}