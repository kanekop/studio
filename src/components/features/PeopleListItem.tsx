
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
  onEdit: () => void; 
  disableActions?: boolean;
  onInitiateConnection: (sourcePersonId: string, targetPersonId: string) => void;
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
  onInitiateConnection,
}) => {
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(true);
  const [isBeingDraggedOver, setIsBeingDraggedOver] = useState(false);
  const [isBeingDragged, setIsBeingDragged] = useState(false);

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
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (disableActions && !isDeleteSelectionMode && !isMergeSelectionMode) return;

    if (isDeleteSelectionMode && onToggleDeleteSelection) {
      onToggleDeleteSelection(person.id);
    } else if (isMergeSelectionMode && onToggleMergeSelection && !isDisabledForMergeSelection) {
      onToggleMergeSelection(person.id);
    } else if (!isDeleteSelectionMode && !isMergeSelectionMode && !disableActions) {
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (disableActions || isDeleteSelectionMode || isMergeSelectionMode) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("sourcePersonId", person.id);
    e.dataTransfer.effectAllowed = "move";
    setIsBeingDragged(true);
    document.body.classList.add('dragging-person-card');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    if (disableActions || isDeleteSelectionMode || isMergeSelectionMode) {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
     if (disableActions || isDeleteSelectionMode || isMergeSelectionMode) return;
    const sourcePersonIdDragged = e.dataTransfer.types.includes("sourcepersonid") ? e.dataTransfer.getData("sourcePersonId") : null;
    if (sourcePersonIdDragged && sourcePersonIdDragged !== person.id) {
        setIsBeingDraggedOver(true);
    }
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsBeingDraggedOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsBeingDraggedOver(false);
    if (disableActions || isDeleteSelectionMode || isMergeSelectionMode) return;

    const sourcePersonId = e.dataTransfer.getData("sourcePersonId");
    const targetPersonId = person.id;

    if (sourcePersonId && targetPersonId && sourcePersonId !== targetPersonId) {
      onInitiateConnection(sourcePersonId, targetPersonId);
    }
  };
  
  const handleDragEnd = () => {
    setIsBeingDragged(false);
    setIsBeingDraggedOver(false);
    document.body.classList.remove('dragging-person-card');
  };


  return (
    <Card 
      draggable={!disableActions && !isDeleteSelectionMode && !isMergeSelectionMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={cn(
        "flex flex-col h-full shadow-md hover:shadow-lg transition-all duration-200 rounded-lg overflow-hidden relative group",
        ((isMergeSelectionMode || isDeleteSelectionMode) && !disableActions) && "cursor-pointer",
        (isSelectedForMerge && isMergeSelectionMode) && "ring-2 ring-offset-2 ring-blue-500 border-blue-500",
        (isSelectedForDelete && isDeleteSelectionMode) && "ring-2 ring-offset-2 ring-destructive border-destructive",
        (disableActions || effectiveDisabledForMergeSelection) && !isDeleteSelectionMode && !isMergeSelectionMode && "opacity-70", 
        (effectiveDisabledForMergeSelection && !isChecked) && "opacity-60 cursor-not-allowed",
        isBeingDragged && "opacity-50 border-2 border-dashed border-primary scale-95 shadow-xl z-50",
        isBeingDraggedOver && !isBeingDragged && "ring-2 ring-offset-2 ring-green-500 border-green-500 scale-105 bg-green-500/10"
      )}
      onClick={handleCardClick}
      role={showCheckbox ? "button" : "listitem"}
      aria-pressed={showCheckbox ? isChecked : undefined}
      tabIndex={0}
      onKeyDown={(e) => { 
        if ((e.key === ' ' || e.key === 'Enter') && !((e.target as HTMLElement).closest('button')) ) {
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
            aria-label={`Select ${person.name}`}
            className={cn("h-5 w-5", 
                isDeleteSelectionMode && isChecked && "border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive",
                isMergeSelectionMode && isChecked && "border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            )}
          />
        </div>
      )}
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
          <div className="aspect-square w-full relative bg-muted pointer-events-none">
            <Image
              src={displayImageUrl || "https://placehold.co/300x300.png?text=Placeholder"}
              alt={`Face of ${person.name}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              data-ai-hint="person portrait"
              draggable="false" 
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 flex-grow pointer-events-none">
        <CardTitle className="text-lg font-semibold truncate" title={person.name}>
          {person.name}
        </CardTitle>
        {person.company && (
          <p className="text-xs text-muted-foreground truncate" title={person.company}>{person.company}</p>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/30 pointer-events-none">
        <div className="flex items-center text-xs text-muted-foreground">
          <Layers className="h-3.5 w-3.5 mr-1.5" />
          Appears in {rosterCount} roster{rosterCount === 1 ? '' : 's'}
        </div>
      </CardFooter>
    </Card>
  );
};

export default PeopleListItem;
