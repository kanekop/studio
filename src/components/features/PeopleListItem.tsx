"use client";
import React, { useState, useEffect, useMemo } from 'react';
import type { Person, Connection } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Pencil, Users, Home, Briefcase, Heart } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/firebase';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { handleCardClick as handleCardClickUtil, setDraggingState, isEventFromInteractiveElement } from '@/lib/event-utils';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
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
}

const GENERAL_CONNECTION_TYPES = ['colleague', 'friend', 'club_member', 'acquaintance', 'fellow_member', 'group_member']; // Added acquaintance
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
}) => {
  const { allUserConnections } = useFaceRoster();
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [isBeingDraggedOver, setIsBeingDraggedOver] = useState(false);
  const [isBeingDragged, setIsBeingDragged] = useState(false);

  // 画像URLキャッシュ（メモリリーク防止のため）
  const imageUrlCache = useMemo(() => new Map<string, string>(), []);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      const imagePathToFetch = person.primaryFaceAppearancePath || person.faceAppearances?.[0]?.faceImageStoragePath;

      if (imagePathToFetch && storage) {
        // キャッシュをチェック
        if (imageUrlCache.has(imagePathToFetch)) {
          if (isMounted) {
            setDisplayImageUrl(imageUrlCache.get(imagePathToFetch)!);
          }
          return;
        }

        try {
          const imageFileRef = storageRef(storage, imagePathToFetch);
          const url = await getDownloadURL(imageFileRef);
          if (isMounted) {
            // キャッシュに保存
            imageUrlCache.set(imagePathToFetch, url);
            setDisplayImageUrl(url);
          }
        } catch (error) {
          console.error(`Error fetching image for ${person.name} (${imagePathToFetch}):`, error);
          if (isMounted) {
            const errorUrl = "https://placehold.co/300x300.png?text=Error";
            imageUrlCache.set(imagePathToFetch, errorUrl);
            setDisplayImageUrl(errorUrl);
          }
        }
      } else {
        if (isMounted) {
          setDisplayImageUrl("https://placehold.co/300x300.png?text=No+Image");
        }
      }
    };

    fetchImage();
    return () => { isMounted = false; };
  }, [person, imageUrlCache]); // Re-fetch if person object changes (e.g., primaryFaceAppearancePath updates)

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

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleCardClickUtil(e, {
      onCardClick: () => {
        if (generalActionDisabled && selectionMode === 'none') return;

        if (selectionMode === 'delete' && onToggleDeleteSelection) {
          onToggleDeleteSelection();
        } else if (selectionMode === 'merge' && onToggleMergeSelection) {
          onToggleMergeSelection();
        } else if (selectionMode === 'none' && !generalActionDisabled) {
          onEditClick();
        }
      }
    });
  };

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (generalActionDisabled) return;
    if (selectionMode === 'delete' && onToggleDeleteSelection) {
      onToggleDeleteSelection();
    } else if (selectionMode === 'merge' && onToggleMergeSelection) {
      onToggleMergeSelection();
    }
  };

  const showCheckbox = selectionMode !== 'none' && !generalActionDisabled;
  const isChecked = selectionMode === 'delete' ? isSelectedForDeletion : (selectionMode === 'merge' ? isSelectedForMerge : false);
  const effectiveDisabledForMergeSelection = selectionMode === 'merge' && generalActionDisabled;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (generalActionDisabled || selectionMode !== 'none') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("sourcePersonId", person?.id || '');
    e.dataTransfer.effectAllowed = "move";
    setIsBeingDragged(true);
    setDraggingState(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (generalActionDisabled || selectionMode !== 'none') {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (generalActionDisabled || selectionMode !== 'none') return;
    const sourcePersonIdDragged = e.dataTransfer.types.includes("sourcepersonid") ? e.dataTransfer.getData("sourcePersonId") : null;
    if (sourcePersonIdDragged && sourcePersonIdDragged !== person?.id) {
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
    if (generalActionDisabled || selectionMode !== 'none') return;

    const sourcePersonId = e.dataTransfer.getData("sourcePersonId");
    const targetPersonId = person?.id;

    if (sourcePersonId && targetPersonId && sourcePersonId !== targetPersonId) {
      onInitiateConnection(sourcePersonId, targetPersonId);
    }
  };

  const handleDragEnd = () => {
    setIsBeingDragged(false);
    setIsBeingDraggedOver(false);
    setDraggingState(false);
  };


  return (
    <Card
      draggable={!generalActionDisabled && selectionMode === 'none'}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={cn(
        "flex flex-col h-full shadow-md hover:shadow-lg transition-all duration-200 rounded-lg overflow-hidden relative group",
        (selectionMode !== 'none' && !generalActionDisabled) && "cursor-pointer",
        (isSelectedForMerge && selectionMode === 'merge') && "ring-2 ring-offset-2 ring-blue-500 border-blue-500",
        (isSelectedForDeletion && selectionMode === 'delete') && "ring-2 ring-offset-2 ring-destructive border-destructive",
        (generalActionDisabled || effectiveDisabledForMergeSelection) && selectionMode === 'none' && "opacity-70",
        (effectiveDisabledForMergeSelection && !isChecked) && "opacity-60 cursor-not-allowed",
        isBeingDragged && "opacity-50 border-2 border-dashed border-primary scale-95 shadow-xl z-50",
        isBeingDraggedOver && !isBeingDragged && "ring-2 ring-offset-2 ring-green-500 border-green-500 scale-105 bg-green-500/10"
      )}
      onClick={handleCardClick}
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
          <OptimizedImage
            src={displayImageUrl || "https://placehold.co/300x300.png?text=Placeholder"}
            alt={`Face of ${person?.name || 'Unknown'}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            objectFit="cover"
            priority={false}
            placeholder="blur"
            loading="lazy"
            fallbackSrc="https://placehold.co/300x300.png?text=No+Image"
            className="rounded-t-lg"
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        <CardTitle className="text-lg font-semibold truncate" title={person?.name || 'Unknown'}>
          {person?.name || 'Unknown'}
        </CardTitle>
        {person?.company && (
          <p className="text-xs text-muted-foreground truncate" title={person.company}>{person.company}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5 items-center text-xs text-muted-foreground">
          {connectionCounts.general > 0 && (
            <span className="flex items-center p-1 bg-muted rounded-sm" title={`${connectionCounts.general} general connection(s)`}>
              <Users className="h-3.5 w-3.5 mr-1 text-sky-600" /> {connectionCounts.general}
            </span>
          )}
          {connectionCounts.family > 0 && (
            <span className="flex items-center p-1 bg-muted rounded-sm" title={`${connectionCounts.family} family connection(s)`}>
              <Home className="h-3.5 w-3.5 mr-1 text-green-600" /> {connectionCounts.family}
            </span>
          )}
          {connectionCounts.professional > 0 && (
            <span className="flex items-center p-1 bg-muted rounded-sm" title={`${connectionCounts.professional} professional connection(s)`}>
              <Briefcase className="h-3.5 w-3.5 mr-1 text-indigo-600" /> {connectionCounts.professional}
            </span>
          )}
          {connectionCounts.partner > 0 && (
            <span className="flex items-center p-1 bg-muted rounded-sm" title={`${connectionCounts.partner} partner connection(s)`}>
              <Heart className="h-3.5 w-3.5 mr-1 text-red-600" /> {connectionCounts.partner}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/30">
        <div className="flex items-center text-xs text-muted-foreground">
          <Layers className="h-3.5 w-3.5 mr-1.5" />
          Appears in {rosterCount} roster{rosterCount === 1 ? '' : 's'}
        </div>
      </CardFooter>
    </Card>
  );
});

export default PeopleListItem;
