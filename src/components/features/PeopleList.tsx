
"use client";
import React from 'react';
import type { Person } from '@/types';
import PeopleListItem from './PeopleListItem';

interface PeopleListProps {
  people: Person[];
  isMergeSelectionMode?: boolean;
  selectedPeopleForMerge?: string[];
  onToggleMergeSelection?: (personId: string) => void;
  isDeleteSelectionMode?: boolean;
  selectedPeopleForDelete?: string[];
  onToggleDeleteSelection?: (personId: string) => void;
  onEditPerson: (person: Person) => void; // New prop for editing
  generalActionDisabled?: boolean; // To disable edit button if other actions are in progress
}

const PeopleList: React.FC<PeopleListProps> = ({ 
  people,
  isMergeSelectionMode = false,
  selectedPeopleForMerge = [],
  onToggleMergeSelection = () => {},
  isDeleteSelectionMode = false,
  selectedPeopleForDelete = [],
  onToggleDeleteSelection = () => {},
  onEditPerson,
  generalActionDisabled = false,
}) => {
  if (people.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-md h-full flex items-center justify-center">
        No people found. Start by adding people through rosters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      {people.map((person) => (
        <PeopleListItem 
          key={person.id} 
          person={person}
          isMergeSelectionMode={isMergeSelectionMode}
          isSelectedForMerge={selectedPeopleForMerge.includes(person.id)}
          onToggleMergeSelection={onToggleMergeSelection}
          isDisabledForMergeSelection={isMergeSelectionMode && selectedPeopleForMerge.length >= 2 && !selectedPeopleForMerge.includes(person.id)}
          isDeleteSelectionMode={isDeleteSelectionMode}
          isSelectedForDelete={selectedPeopleForDelete.includes(person.id)}
          onToggleDeleteSelection={onToggleDeleteSelection}
          onEdit={() => onEditPerson(person)} // Pass person to edit handler
          disableActions={generalActionDisabled || (isMergeSelectionMode && selectedPeopleForMerge.length >=2 && !selectedPeopleForMerge.includes(person.id))}
        />
      ))}
    </div>
  );
};

export default PeopleList;
