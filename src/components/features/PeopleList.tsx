
"use client";
import React from 'react';
import type { Person, Connection } from '@/types'; // Added Connection
import PeopleListItem from './PeopleListItem';

interface PeopleListProps {
  people: Person[];
  allUserConnections: Connection[]; // New prop for all connections
  isMergeSelectionMode?: boolean;
  selectedPeopleForMerge?: string[];
  onToggleMergeSelection?: (personId: string) => void;
  isDeleteSelectionMode?: boolean;
  selectedPeopleForDelete?: string[];
  onToggleDeleteSelection?: (personId: string) => void;
  onEditPerson: (person: Person) => void; 
  generalActionDisabled?: boolean;
  onInitiateConnection: (sourcePersonId: string, targetPersonId: string) => void; 
}

const PeopleList: React.FC<PeopleListProps> = ({ 
  people,
  allUserConnections, // Use this prop
  isMergeSelectionMode = false,
  selectedPeopleForMerge = [],
  onToggleMergeSelection = () => {},
  isDeleteSelectionMode = false,
  selectedPeopleForDelete = [],
  onToggleDeleteSelection = () => {},
  onEditPerson,
  generalActionDisabled = false,
  onInitiateConnection,
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
          allUserConnections={allUserConnections} // Pass all connections down
          isMergeSelectionMode={isMergeSelectionMode}
          isSelectedForMerge={selectedPeopleForMerge.includes(person.id)}
          onToggleMergeSelection={onToggleMergeSelection}
          isDisabledForMergeSelection={isMergeSelectionMode && selectedPeopleForMerge.length >= 2 && !selectedPeopleForMerge.includes(person.id)}
          isDeleteSelectionMode={isDeleteSelectionMode}
          isSelectedForDelete={selectedPeopleForDelete.includes(person.id)}
          onToggleDeleteSelection={onToggleDeleteSelection}
          onEdit={() => onEditPerson(person)} 
          disableActions={generalActionDisabled || (isMergeSelectionMode && selectedPeopleForMerge.length >=2 && !selectedPeopleForMerge.includes(person.id))}
          onInitiateConnection={onInitiateConnection}
        />
      ))}
    </div>
  );
};

export default PeopleList;
