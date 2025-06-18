
"use client";
import React from 'react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import RosterItem from './RosterItem';

interface RosterListProps {
  isMergeModeActive: boolean;
}

const RosterList: React.FC<RosterListProps> = ({ isMergeModeActive }) => {
  const { roster, selectedPersonId, selectPerson, selectedPeopleForMerge, togglePersonInMergeSelection, isProcessing } = useFaceRoster();

  if (roster.length === 0) {
    // This case should ideally be handled by the parent (RosterPanel)
    // but as a fallback:
    return (
      <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-md h-full flex items-center justify-center">
        Your roster will appear here once you create it from selected regions.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full max-h-[300px] md:max-h-none md:flex-grow pr-3 -mr-3">
      <div className="space-y-1.5">
        {roster.map((person) => (
          <RosterItem
            key={person.id}
            person={person}
            isSelected={person.id === selectedPersonId && !isMergeModeActive} // Main selection only if not in merge mode
            onSelect={() => selectPerson(person.id)}
            isMergeModeActive={isMergeModeActive}
            isSelectedForMerge={selectedPeopleForMerge.includes(person.id)}
            onToggleSelectionForMerge={togglePersonInMergeSelection}
            isDisabled={isProcessing} // Disable item interaction if global processing
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default RosterList;
