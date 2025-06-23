import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapPin, MoreVertical, Edit, Trash2, Users, Calendar, Tag, Check, X } from 'lucide-react';
import { ImageSet } from '@/shared/types';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/shared/utils/utils';
import { useStorageImage } from '@/hooks/useStorageImage';
import { FirebaseRosterRepository } from '@/infrastructure/firebase/repositories/FirebaseRosterRepository';
import { useToast } from '@/hooks/use-toast';

interface RosterCardProps {
  roster: ImageSet;
  onEdit?: (roster: ImageSet) => void;
  onDelete?: (roster: ImageSet) => void;
  onClick?: (roster: ImageSet) => void;
}

export const RosterCard: React.FC<RosterCardProps> = ({
  roster,
  onEdit,
  onDelete,
  onClick,
}) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(roster.rosterName);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const repository = new FirebaseRosterRepository();
  
  const { imageUrl: thumbnailUrl, isLoading: isThumbnailLoading } = useStorageImage(
    roster.thumbnailUrl || roster.originalImageStoragePath
  );

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleCardClick = () => {
    if (!isEditingTitle && onClick) {
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

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() === roster.rosterName) {
      setIsEditingTitle(false);
      return;
    }

    if (!editedTitle.trim()) {
      setEditedTitle(roster.rosterName);
      setIsEditingTitle(false);
      return;
    }

    setIsSaving(true);
    try {
      await repository.updateRoster(roster.id, { rosterName: editedTitle.trim() });
      roster.rosterName = editedTitle.trim();
      toast({
        title: '更新完了',
        description: '名簿名を更新しました',
      });
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Failed to update roster name:', error);
      toast({
        title: 'エラー',
        description: '名簿名の更新に失敗しました',
        variant: 'destructive',
      });
      setEditedTitle(roster.rosterName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(roster.rosterName);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
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
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.02] cursor-pointer",
        "border-gray-200 dark:border-gray-700"
      )}
      onClick={handleCardClick}
    >
      {/* Thumbnail Image */}
      <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-gray-800">
        {isThumbnailLoading ? (
          <Skeleton className="absolute inset-0" />
        ) : imageLoadError || !thumbnailUrl ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">画像なし</p>
            </div>
          </div>
        ) : (
          <img
            src={thumbnailUrl}
            alt={roster.rosterName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageLoadError(true)}
          />
        )}
        
        {/* Overlay with people count */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <div className="flex items-center text-white text-sm">
            <Users className="h-4 w-4 mr-1" />
            <span>{peopleCount}人</span>
          </div>
        </div>

        {/* Action Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 hover:bg-white"
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
      </div>

      {/* Card Content */}
      <CardContent className="p-4">
        {isEditingTitle ? (
          <div className="flex items-center gap-2 mb-1">
            <Input
              ref={inputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveTitle}
              className="h-8 text-lg font-semibold"
              disabled={isSaving}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSaveTitle}
              disabled={isSaving}
              className="h-8 w-8"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <h3 
            className="font-semibold text-lg mb-1 line-clamp-1 group/title flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={handleTitleClick}
          >
            {roster.rosterName}
            <Edit className="h-4 w-4 opacity-0 group-hover/title:opacity-100 transition-opacity" />
          </h3>
        )}
        
        {roster.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {roster.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate()}
          </div>
          
          {/* Location from EXIF */}
          {roster.imageMetadata?.location && (
            <div className="flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              <span>{roster.imageMetadata.location.placeName || '位置情報あり'}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {roster.tags && roster.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {roster.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                <Tag className="h-3 w-3 mr-0.5" />
                {tag}
              </span>
            ))}
            {roster.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{roster.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};