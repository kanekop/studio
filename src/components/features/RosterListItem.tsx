import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapPin, MoreVertical, Edit, Trash2, Users, Calendar, Tag, Camera } from 'lucide-react';
import { ImageSet } from '@/shared/types';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/shared/utils/utils';
import { useStorageImage } from '@/hooks/useStorageImage';

interface RosterListItemProps {
  roster: ImageSet;
  onEdit?: (roster: ImageSet) => void;
  onDelete?: (roster: ImageSet) => void;
  onClick?: (roster: ImageSet) => void;
}

export const RosterListItem: React.FC<RosterListItemProps> = ({
  roster,
  onEdit,
  onDelete,
  onClick,
}) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const { imageUrl: thumbnailUrl, isLoading: isThumbnailLoading } = useStorageImage(
    roster.thumbnailUrl || roster.originalImageStoragePath
  );

  const handleClick = () => {
    if (onClick) {
      onClick(roster);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(roster);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(roster);
    }
  };

  const formatDate = () => {
    if (!roster.createdAt) return '不明';
    try {
      const date = roster.createdAt.toDate ? roster.createdAt.toDate() : new Date(roster.createdAt);
      return formatDistanceToNow(date, { locale: ja, addSuffix: true });
    } catch {
      return '不明';
    }
  };

  const peopleCount = roster.peopleIds?.length || 0;

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 rounded-lg border",
        "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer",
        "border-gray-200 dark:border-gray-700"
      )}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        {isThumbnailLoading ? (
          <Skeleton className="absolute inset-0" />
        ) : imageLoadError || !thumbnailUrl ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Camera className="h-8 w-8" />
          </div>
        ) : (
          <img
            src={thumbnailUrl}
            alt={roster.rosterName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageLoadError(true)}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-lg truncate pr-2">
            {roster.rosterName}
          </h3>
          
          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  編集
                </DropdownMenuItem>
              )}
              {onEdit && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {roster.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
            {roster.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            <span>{peopleCount}人</span>
          </div>
          
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate()}
          </div>
          
          {roster.imageMetadata?.location && (
            <div className="flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="truncate max-w-[150px]">
                {roster.imageMetadata.location.placeName || '位置情報あり'}
              </span>
            </div>
          )}

          {roster.tags && roster.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>{roster.tags.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};