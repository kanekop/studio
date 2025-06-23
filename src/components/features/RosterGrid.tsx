import React from 'react';
import { RosterCard } from './RosterCard';
import { RosterListItem } from './RosterListItem';
import { ImageSet } from '@/shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface RosterGridProps {
  rosters: ImageSet[];
  isLoading?: boolean;
  viewMode?: 'grid' | 'list';
  onEditRoster?: (roster: ImageSet) => void;
  onDeleteRoster?: (roster: ImageSet) => void;
  onSelectRoster?: (roster: ImageSet) => void;
}

export const RosterGrid: React.FC<RosterGridProps> = ({
  rosters,
  isLoading = false,
  viewMode = 'grid',
  onEditRoster,
  onDeleteRoster,
  onSelectRoster,
}) => {
  if (isLoading) {
    if (viewMode === 'list') {
      return (
        <div className="space-y-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <Skeleton className="aspect-video" />
            <div className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!rosters || rosters.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-24 w-24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            名簿がありません
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            「新規作成」ボタンから最初の名簿を作成してください
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {rosters.map((roster) => (
          <RosterListItem
            key={roster.id}
            roster={roster}
            onEdit={onEditRoster}
            onDelete={onDeleteRoster}
            onClick={onSelectRoster}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {rosters.map((roster) => (
        <RosterCard
          key={roster.id}
          roster={roster}
          onEdit={onEditRoster}
          onDelete={onDeleteRoster}
          onClick={onSelectRoster}
        />
      ))}
    </div>
  );
};