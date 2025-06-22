"use client";
import React from 'react';
import type { Person } from '@/shared/types';
import PeopleListItem from './PeopleListItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from "@/components/ui/card";

interface PeopleListProps {
  people: Person[];
  isLoading: boolean;
  onEditClick: (person: Person) => void;
  onInitiateConnection: (sourcePersonId: string, targetPersonId: string) => void;
  selectionMode?: 'merge' | 'delete' | 'none';
  selectedForMergeIds?: string[];
  onToggleMergeSelection?: (personId: string) => void;
  selectedForDeletionIds?: string[];
  onToggleDeleteSelection?: (personId: string) => void;
  generalActionDisabled?: boolean;
  allUserPeople?: Person[];
}

export default function PeopleList({
  people,
  isLoading,
  onEditClick,
  onInitiateConnection,
  selectionMode = 'none',
  selectedForMergeIds = [],
  onToggleMergeSelection,
  selectedForDeletionIds = [],
  onToggleDeleteSelection,
  generalActionDisabled = false,
  allUserPeople = []
}: PeopleListProps) {
  // Safe array access with fallback
  const safePeople = people || [];
  const safeSelectedForMergeIds = selectedForMergeIds || [];
  const safeSelectedForDeletionIds = selectedForDeletionIds || [];

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
            onInitiateConnection={onInitiateConnection}
            selectionMode={selectionMode}
            isSelectedForMerge={selectionMode === 'merge' && onToggleMergeSelection ? safeSelectedForMergeIds.includes(person.id) : false}
            onToggleMergeSelection={() => selectionMode === 'merge' && onToggleMergeSelection ? onToggleMergeSelection(person.id) : undefined}
            isSelectedForDeletion={selectionMode === 'delete' && onToggleDeleteSelection ? safeSelectedForDeletionIds.includes(person.id) : false}
            onToggleDeleteSelection={() => selectionMode === 'delete' && onToggleDeleteSelection ? onToggleDeleteSelection(person.id) : undefined}
            generalActionDisabled={generalActionDisabled}
            allUserPeople={allUserPeople}
          />
        );
      })}
    </div>
  );
}
