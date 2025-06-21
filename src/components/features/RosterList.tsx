
"use client";
import React from 'react';
import { useFaceRoster, useUI } from '@/contexts';
import { ScrollArea } from '@/components/ui/scroll-area';
import RosterItem from './RosterItem';

const RosterList: React.FC = () => {
  const { roster } = useFaceRoster();
  const { selectedPersonId, selectPerson, isProcessing } = useUI();

  // Safe array access with null check
  const safeRoster = roster || [];

  if (safeRoster.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-md h-full flex items-center justify-center">
        Your roster will appear here once you create it from selected regions.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full max-h-[300px] md:max-h-none md:flex-grow pr-3 -mr-3">
      <div className="space-y-1.5">
        {safeRoster.map((person) => {
          // Defensive check for person object and required properties
          if (!person?.id) {
            console.warn('RosterList: Person object missing id:', person);
            return null;
          }

          return (
            <RosterItem
              key={person.id}
              person={person}
              isSelected={person.id === selectedPersonId}
              onSelect={() => selectPerson?.(person.id)}
              isDisabled={isProcessing}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default RosterList;
