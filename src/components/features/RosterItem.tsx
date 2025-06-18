
"use client";
import React from 'react';
import Image from 'next/image';
import type { Person } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { User } from 'lucide-react';


interface RosterItemProps {
  person: Person;
  isSelected: boolean;
  onSelect: () => void;
  isMergeModeActive: boolean;
  isSelectedForMerge: boolean;
  onToggleSelectionForMerge: (personId: string) => void;
}

const RosterItem: React.FC<RosterItemProps> = ({ 
  person, 
  isSelected, 
  onSelect,
  isMergeModeActive,
  isSelectedForMerge,
  onToggleSelectionForMerge
}) => {
  return (
    <div
      className={cn(
        "w-full flex items-center p-2 rounded-md transition-all duration-150 ease-in-out group",
        isSelected && !isMergeModeActive ? "bg-primary/20 shadow-sm" : "hover:bg-accent/50",
        isMergeModeActive && isSelectedForMerge && "bg-blue-500/20 ring-2 ring-blue-500", // Highlight for merge selection
         "dark:focus-visible:ring-offset-background-dark" 
      )}
    >
      {isMergeModeActive && (
        <Checkbox
          id={`merge-${person.id}`}
          checked={isSelectedForMerge}
          onCheckedChange={() => onToggleSelectionForMerge(person.id)}
          className="mr-3 ml-1 h-5 w-5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          aria-label={`Select ${person.name} for merge`}
        />
      )}
      <button
        onClick={onSelect}
        disabled={isMergeModeActive} // Disable main selection if in merge mode for clarity
        className={cn(
          "flex-grow flex items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
          isMergeModeActive && "cursor-default"
        )}
        aria-pressed={isSelected && !isMergeModeActive}
        aria-label={`Select ${person.name}`}
      >
        <Avatar className="h-10 w-10 mr-3 border-2 border-transparent group-hover:border-accent transition-colors">
          <AvatarImage src={person.faceImageUrl || "https://placehold.co/100x100.png"} alt={`Face of ${person.name}`} className="object-cover" />
          <AvatarFallback className="bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          "truncate text-sm font-medium",
          isSelected && !isMergeModeActive ? "text-primary" : "text-foreground/90"
        )}>
          {person.name}
        </span>
      </button>
    </div>
  );
};

export default RosterItem;
