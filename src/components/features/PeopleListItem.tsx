
"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Person } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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

  const handleCardClick = () => {
    if (isDeleteSelectionMode && onToggleDeleteSelection) {
      onToggleDeleteSelection(person.id);
    } else if (isMergeSelectionMode && onToggleMergeSelection && !isDisabledForMergeSelection) {
      onToggleMergeSelection(person.id);
    }
    // Future: if not in any selection mode, navigate to a person detail page
  };

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (isDeleteSelectionMode && onToggleDeleteSelection) {
      onToggleDeleteSelection(person.id);
    } else if (isMergeSelectionMode && onToggleMergeSelection && !isDisabledForMergeSelection) {
        onToggleMergeSelection(person.id);
    }
  };
  
  const showCheckbox = isDeleteSelectionMode || isMergeSelectionMode;
  const isChecked = isDeleteSelectionMode ? isSelectedForDelete : (isMergeSelectionMode ? isSelectedForMerge : false);
  const isDisabled = isMergeSelectionMode && isDisabledForMergeSelection;

  return (
    <Card 
      className={cn(
        "flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg overflow-hidden relative",
        (isMergeSelectionMode || isDeleteSelectionMode) && "cursor-pointer",
        (isSelectedForMerge && isMergeSelectionMode) && "ring-2 ring-blue-500 border-blue-500",
        (isSelectedForDelete && isDeleteSelectionMode) && "ring-2 ring-destructive border-destructive",
        isDisabled && "opacity-60 cursor-not-allowed"
      )}
      onClick={handleCardClick}
      role={showCheckbox ? "button" : undefined}
      aria-pressed={showCheckbox ? isChecked : undefined}
      tabIndex={showCheckbox ? 0 : -1}
      onKeyDown={showCheckbox ? (e) => { if (e.key === ' ' || e.key === 'Enter') handleCardClick(); } : undefined}
    >
      {showCheckbox && (
        <div className="absolute top-2 right-2 z-10 bg-background/80 p-1 rounded-full">
          <Checkbox
            checked={isChecked}
            onCheckedChange={handleCheckboxChange}
            disabled={isDisabled}
            aria-label={`Select ${person.name}`}
            className={cn("h-5 w-5", 
                isDeleteSelectionMode && isChecked && "border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive",
                isMergeSelectionMode && isChecked && "border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            )}
          />
        </div>
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

