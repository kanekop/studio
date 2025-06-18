
"use client";
import React from 'react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import RosterItem from './RosterItem';

const RosterList: React.FC = () => {
  const { roster, selectedPersonId, selectPerson, isProcessing } = useFaceRoster();

  if (roster.length === 0) {
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
            isSelected={person.id === selectedPersonId}
            onSelect={() => selectPerson(person.id)}
            isDisabled={isProcessing}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default RosterList;
