"use client";
import React, { useState, useMemo, useCallback } from 'react';
import type { Person, Connection } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Pencil, Users, Home, Briefcase, Heart } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { usePersonImage } from '@/hooks/usePersonImage';
import { useDragHandlers } from '@/hooks/useDragHandlers';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import OptimizedImage from '@/components/ui/optimized-image';
import MobileLongPressMenu from './MobileLongPressMenu';

interface PeopleListItemProps {
  person: Person;
  onEditClick: () => void;
  onInitiateConnection: (sourcePersonId: string, targetPersonId: string) => void;
  selectionMode?: 'merge' | 'delete' | 'none';
  isSelectedForMerge?: boolean;
  onToggleMergeSelection?: () => void;
  isSelectedForDeletion?: boolean;
  onToggleDeleteSelection?: () => void;
  generalActionDisabled?: boolean;
  allUserPeople?: Person[];
  allUserConnections?: Connection[];
}

const GENERAL_CONNECTION_TYPES = ['colleague', 'friend', 'club_member', 'acquaintance', 'fellow_member', 'group_member'];
const FAMILY_CONNECTION_TYPES = ['parent', 'child', 'father', 'mother', 'family_member'];
const PROFESSIONAL_CONNECTION_TYPES = ['manager', 'reports_to', 'subordinate', 'mentor', 'mentee'];
const PARTNER_CONNECTION_TYPES = ['spouse', 'partner'];

const PeopleListItem: React.FC<PeopleListItemProps> = React.memo(({
  person,
  onEditClick,
  onInitiateConnection,
  selectionMode = 'none',
  isSelectedForMerge = false,
  onToggleMergeSelection,
  isSelectedForDeletion = false,
  onToggleDeleteSelection,
  generalActionDisabled = false,
  allUserPeople = [],
  allUserConnections = [],
}) => {
  const { handleError } = useErrorHandler();
  const [clickStartTime, setClickStartTime] = useState<number | null>(null);

  // Safe image loading with error handling
  const { imageUrl, isLoading: isLoadingImage, error: imageError, retry: retryImage } = usePersonImage(person);

  // Connection counts calculation
  const connectionCounts = useMemo(() => {
    let general = 0;
    let family = 0;
    let professional = 0;
    let partner = 0;

    const relevantConnections = (allUserConnections || []).filter(
      conn => conn?.fromPersonId === person?.id || conn?.toPersonId === person?.id
    );

    relevantConnections.forEach(conn => {
      let countedGeneral = false;
      let countedFamily = false;
      let countedProfessional = false;
      let countedPartner = false;

      (conn?.types || []).forEach(type => {
        if (GENERAL_CONNECTION_TYPES.includes(type) && !countedGeneral) {
          general++;
          countedGeneral = true;
        }
        if (FAMILY_CONNECTION_TYPES.includes(type) && !countedFamily) {
          family++;
          countedFamily = true;
        }
        if (PROFESSIONAL_CONNECTION_TYPES.includes(type) && !countedProfessional) {
          professional++;
          countedProfessional = true;
        }
        if (PARTNER_CONNECTION_TYPES.includes(type) && !countedPartner) {
          partner++;
          countedPartner = true;
        }
      });
    });
    return { general, family, professional, partner };
  }, [person?.id, allUserConnections]);

  const rosterCount = person.rosterIds?.length || 0;

  // Drag and drop handlers
  const { isDragging, isDraggedOver, dragHandlers } = useDragHandlers({
    disabled: generalActionDisabled || selectionMode !== 'none',
    data: { sourcePersonId: person?.id || '' },
    onDragStart: () => {
      // Additional drag start logic if needed
    },
    onDrop: (e) => {
      const sourcePersonId = e.dataTransfer.getData("sourcePersonId");
      const targetPersonId = person?.id;

      if (sourcePersonId && targetPersonId && sourcePersonId !== targetPersonId) {
        try {
          onInitiateConnection(sourcePersonId, targetPersonId);
        } catch (error) {
          handleError(error instanceof Error ? error : new Error('Connection failed'));
        }
      }
    },
  });

  // Safe click handling with drag detection
  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent click if it's from an interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="checkbox"], input, select, textarea')) {
      return;
    }

    // Prevent action if this was part of a drag operation
    if (clickStartTime && Date.now() - clickStartTime > 200) {
      return;
    }

    // Prevent action if disabled
    if (generalActionDisabled && selectionMode === 'none') {
      return;
    }

    try {
      if (selectionMode === 'delete' && onToggleDeleteSelection) {
        onToggleDeleteSelection();
      } else if (selectionMode === 'merge' && onToggleMergeSelection) {
        onToggleMergeSelection();
      } else if (selectionMode === 'none' && !generalActionDisabled) {
        onEditClick();
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Action failed'));
    }
  }, [
    clickStartTime,
    generalActionDisabled,
    selectionMode,
    onToggleDeleteSelection,
    onToggleMergeSelection,
    onEditClick,
    handleError
  ]);

  const handleMouseDown = useCallback(() => {
    setClickStartTime(Date.now());
  }, []);

  const handleMouseUp = useCallback(() => {
    // Reset click start time after a delay to allow for click detection
    setTimeout(() => setClickStartTime(null), 250);
  }, []);

  const handleCheckboxChange = useCallback((checked: boolean | 'indeterminate') => {
    if (generalActionDisabled) return;
    
    try {
      if (selectionMode === 'delete' && onToggleDeleteSelection) {
        onToggleDeleteSelection();
      } else if (selectionMode === 'merge' && onToggleMergeSelection) {
        onToggleMergeSelection();
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Selection failed'));
    }
  }, [generalActionDisabled, selectionMode, onToggleDeleteSelection, onToggleMergeSelection, handleError]);

  const showCheckbox = selectionMode !== 'none' && !generalActionDisabled;
  const isChecked = selectionMode === 'delete' ? isSelectedForDeletion : (selectionMode === 'merge' ? isSelectedForMerge : false);
  const effectiveDisabledForMergeSelection = selectionMode === 'merge' && generalActionDisabled;

  const renderImage = () => {
    if (isLoadingImage) {
      return <Skeleton className="w-full h-full rounded-t-lg" />;
    }

    if (imageError) {
      return (
        <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground rounded-t-lg">
          <div className="text-xs text-center p-2">
            <p>画像読み込みエラー</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                retryImage();
              }}
              className="text-xs mt-1"
            >
              再試行
            </Button>
          </div>
        </div>
      );
    }

    return (
      <OptimizedImage
        src={imageUrl || "/placeholder-face.png"}
        alt={`Face of ${person?.name || 'Unknown'}`}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        objectFit="cover"
        priority={false}
        placeholder="blur"
        loading="lazy"
        fallbackSrc="/placeholder-face.png"
        className="rounded-t-lg"
      />
    );
  };

  return (
    <Card
      {...dragHandlers}
      className={cn(
        "flex flex-col h-full shadow-md hover:shadow-lg transition-all duration-200 rounded-lg overflow-hidden relative group",
        (selectionMode !== 'none' && !generalActionDisabled) && "cursor-pointer",
        (isSelectedForMerge && selectionMode === 'merge') && "ring-2 ring-offset-2 ring-blue-500 border-blue-500",
        (isSelectedForDeletion && selectionMode === 'delete') && "ring-2 ring-offset-2 ring-destructive border-destructive",
        (generalActionDisabled || effectiveDisabledForMergeSelection) && selectionMode === 'none' && "opacity-70",
        (effectiveDisabledForMergeSelection && !isChecked) && "opacity-60 cursor-not-allowed",
        isDragging && "opacity-50 border-2 border-dashed border-primary scale-95 shadow-xl z-50",
        isDraggedOver && !isDragging && "ring-2 ring-offset-2 ring-green-500 border-green-500 scale-105 bg-green-500/10"
      )}
      onClick={handleCardClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      role={showCheckbox ? "button" : "listitem"}
      aria-pressed={showCheckbox ? isChecked : undefined}
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !((e.target as HTMLElement).closest('button, [role="checkbox"]'))) {
          e.preventDefault();
          handleCardClick(e as any);
        }
      }}
    >
      {showCheckbox && (
        <div className="absolute top-2 right-2 z-10 bg-background/80 p-1 rounded-full">
          <Checkbox
            checked={isChecked}
            onCheckedChange={handleCheckboxChange}
            disabled={effectiveDisabledForMergeSelection && !isChecked}
            aria-label={`Select ${person?.name || 'Unknown'}`}
            className={cn("h-5 w-5",
              selectionMode === 'delete' && isChecked && "border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive",
              selectionMode === 'merge' && isChecked && "border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            )}
          />
        </div>
      )}

      {/* Mobile Long Press Menu / Desktop Edit button */}
      <MobileLongPressMenu
        person={person}
        allPeople={allUserPeople}
        onEditClick={onEditClick}
        onInitiateConnection={onInitiateConnection}
        onToggleMergeSelection={onToggleMergeSelection}
        onToggleDeleteSelection={onToggleDeleteSelection}
        isSelectedForMerge={isSelectedForMerge}
        isSelectedForDeletion={isSelectedForDeletion}
        selectionMode={selectionMode}
        disabled={generalActionDisabled}
      />

      <CardHeader className="p-0">
        <div className="aspect-square w-full relative bg-muted">
          {renderImage()}
        </div>
      </CardHeader>

      <CardContent className="p-3 flex-grow">
        <CardTitle className="text-lg font-semibold truncate" title={person?.name || 'Unknown'}>
          {person?.name || 'Unknown'}
        </CardTitle>
        
        {person?.company && (
          <p className="text-sm text-muted-foreground truncate mt-1" title={person.company}>
            <Briefcase className="inline h-3 w-3 mr-1" />
            {person.company}
          </p>
        )}
        
        {person?.hobbies && (
          <p className="text-sm text-muted-foreground truncate mt-1" title={person.hobbies}>
            <Heart className="inline h-3 w-3 mr-1" />
            {person.hobbies}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-3 pt-0 space-y-2">
        <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Layers className="h-3 w-3" />
            <span>{rosterCount}</span>
          </div>
          <div className="flex items-center space-x-3">
            {connectionCounts.general > 0 && (
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{connectionCounts.general}</span>
              </div>
            )}
            {connectionCounts.family > 0 && (
              <div className="flex items-center space-x-1">
                <Home className="h-3 w-3" />
                <span>{connectionCounts.family}</span>
              </div>
            )}
            {connectionCounts.professional > 0 && (
              <div className="flex items-center space-x-1">
                <Briefcase className="h-3 w-3" />
                <span>{connectionCounts.professional}</span>
              </div>
            )}
            {connectionCounts.partner > 0 && (
              <div className="flex items-center space-x-1">
                <Heart className="h-3 w-3" />
                <span>{connectionCounts.partner}</span>
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
});

PeopleListItem.displayName = 'PeopleListItem';

export default PeopleListItem;