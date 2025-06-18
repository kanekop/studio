
"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Person } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/firebase'; 
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PeopleListItemProps {
  person: Person;
  isMergeSelectionMode?: boolean;
  isSelectedForMerge?: boolean;
  onToggleMergeSelection?: (personId: string) => void;
  isDisabledForMergeSelection?: boolean;
  isDeleteSelectionMode?: boolean;
  isSelectedForDelete?: boolean;
  onToggleDeleteSelection?: (personId: string) => void;
  onEdit: () => void; // New prop for edit action
  disableActions?: boolean; // To disable edit/selection
}

const PeopleListItem: React.FC<PeopleListItemProps> = ({ 
  person, 
  isMergeSelectionMode = false,
  isSelectedForMerge = false,
  onToggleMergeSelection = () => {},
  isDisabledForMergeSelection = false,
  isDeleteSelectionMode = false,
  isSelectedForDelete = false,
  onToggleDeleteSelection = () => {},
  onEdit,
  disableActions = false,
}) => {
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingImage(true);

    const fetchImage = async () => {
      const firstAppearance = person.faceAppearances?.[0];
      if (firstAppearance?.faceImageStoragePath && storage) {
        try {
          const imageFileRef = storageRef(storage, firstAppearance.faceImageStoragePath);
          const url = await getDownloadURL(imageFileRef);
          if (isMounted) {
            setDisplayImageUrl(url);
          }
        } catch (error) {
          console.error(`Error fetching image for ${person.name} (${firstAppearance.faceImageStoragePath}):`, error);
          if (isMounted) {
            setDisplayImageUrl("https://placehold.co/150x150.png?text=Error");
          }
        }
      } else {
        if (isMounted) {
          setDisplayImageUrl("https://placehold.co/150x150.png?text=No+Image");
        }
      }
      if (isMounted) {
        setIsLoadingImage(false);
      }
    };

    fetchImage();
    return () => { isMounted = false; };
  }, [person]);

  const rosterCount = person.rosterIds?.length || 0;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent card click from toggling selection if an action button inside was clicked
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (disableActions && !isDeleteSelectionMode && !isMergeSelectionMode) return; // If actions disabled and not in selection mode, do nothing

    if (isDeleteSelectionMode && onToggleDeleteSelection) {
      onToggleDeleteSelection(person.id);
    } else if (isMergeSelectionMode && onToggleMergeSelection && !isDisabledForMergeSelection) {
      onToggleMergeSelection(person.id);
    } else if (!isDeleteSelectionMode && !isMergeSelectionMode && !disableActions) {
      // Default action if not in selection mode and not disabled: open edit
      onEdit();
    }
  };

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (disableActions) return;
    if (isDeleteSelectionMode && onToggleDeleteSelection) {
      onToggleDeleteSelection(person.id);
    } else if (isMergeSelectionMode && onToggleMergeSelection && !isDisabledForMergeSelection) {
        onToggleMergeSelection(person.id);
    }
  };
  
  const showCheckbox = (isDeleteSelectionMode || isMergeSelectionMode) && !disableActions;
  const isChecked = isDeleteSelectionMode ? isSelectedForDelete : (isMergeSelectionMode ? isSelectedForMerge : false);
  const effectiveDisabledForMergeSelection = isMergeSelectionMode && isDisabledForMergeSelection;

  return (
    <Card 
      className={cn(
        "flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg overflow-hidden relative group",
        ((isMergeSelectionMode || isDeleteSelectionMode) && !disableActions) && "cursor-pointer",
        (isSelectedForMerge && isMergeSelectionMode) && "ring-2 ring-blue-500 border-blue-500",
        (isSelectedForDelete && isDeleteSelectionMode) && "ring-2 ring-destructive border-destructive",
        (disableActions || effectiveDisabledForMergeSelection) && !isDeleteSelectionMode && !isMergeSelectionMode && "opacity-70", // General disable visual
        (effectiveDisabledForMergeSelection && !isChecked) && "opacity-60 cursor-not-allowed" // Specific for merge mode selection limit
      )}
      onClick={handleCardClick}
      role={showCheckbox ? "button" : "listitem"}
      aria-pressed={showCheckbox ? isChecked : undefined}
      tabIndex={0}
      onKeyDown={(e) => { 
        if ((e.key === ' ' || e.key === 'Enter') && !((e.target as HTMLElement).closest('button')) ) {
          e.preventDefault(); // Prevent space bar scrolling
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
            aria-label={`Select ${person.name}`}
            className={cn("h-5 w-5", 
                isDeleteSelectionMode && isChecked && "border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive",
                isMergeSelectionMode && isChecked && "border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            )}
          />
        </div>
      )}
      { /* Edit button shown when not in any selection mode */ }
      {!isMergeSelectionMode && !isDeleteSelectionMode && (
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 z-10 h-7 w-7 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            disabled={disableActions}
            aria-label={`Edit ${person.name}`}
            title={`Edit ${person.name}`}
          >
            <Pencil className="h-4 w-4" />
        </Button>
      )}

      <CardHeader className="p-0">
        {isLoadingImage ? (
          <Skeleton className="w-full aspect-square bg-muted" />
        ) : (
          <div className="aspect-square w-full relative bg-muted">
            <Image
              src={displayImageUrl || "https://placehold.co/300x300.png?text=Placeholder"}
              alt={`Face of ${person.name}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              data-ai-hint="person portrait"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        <CardTitle className="text-lg font-semibold truncate" title={person.name}>
          {person.name}
        </CardTitle>
        {person.company && (
          <p className="text-xs text-muted-foreground truncate" title={person.company}>{person.company}</p>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/30">
        <div className="flex items-center text-xs text-muted-foreground">
          <Layers className="h-3.5 w-3.5 mr-1.5" />
          Appears in {rosterCount} roster{rosterCount === 1 ? '' : 's'}
        </div>
      </CardFooter>
    </Card>
  );
};

export default PeopleListItem;
