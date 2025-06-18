
"use client";
import React from 'react';
import type { EditablePersonInContext } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { User } from 'lucide-react';

interface RosterItemProps {
  person: EditablePersonInContext; // Changed from Person to EditablePersonInContext
  isSelected: boolean;
  onSelect: () => void;
  isMergeModeActive: boolean;
  isSelectedForMerge: boolean;
  onToggleSelectionForMerge: (personId: string) => void;
  isDisabled?: boolean;
}

const RosterItem: React.FC<RosterItemProps> = ({ 
  person, 
  isSelected, 
  onSelect,
  isMergeModeActive,
  isSelectedForMerge,
  onToggleSelectionForMerge,
  isDisabled = false,
}) => {
  return (
    <div
      className={cn(
        "w-full flex items-center p-2 rounded-md transition-all duration-150 ease-in-out group",
        isSelected && !isMergeModeActive ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-accent/30",
        isMergeModeActive && isSelectedForMerge && "bg-accent/50 ring-2 ring-accent",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
      aria-disabled={isDisabled}
    >
      {isMergeModeActive && (
        <Checkbox
          id={`merge-${person.id}`}
          checked={isSelectedForMerge}
          onCheckedChange={() => { if(!isDisabled) onToggleSelectionForMerge(person.id) }}
          className="mr-3 ml-1 h-5 w-5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:opacity-70"
          aria-label={`Select ${person.name} for merge`}
          disabled={isDisabled}
        />
      )}
      <button
        onClick={() => { if (!isDisabled && (!isMergeModeActive || !isSelectedForMerge)) onSelect() }} // Allow select if not in merge mode, or if in merge mode and item is not selected for merge (to view details)
        disabled={isDisabled || (isMergeModeActive && isSelectedForMerge)} // Disable main selection if item is selected for merge
        className={cn(
          "flex-grow flex items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
          (isMergeModeActive && isSelectedForMerge) && "cursor-default",
          isDisabled && "cursor-not-allowed"
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
          isSelected && !isMergeModeActive ? "text-primary font-semibold" : "text-foreground/90"
        )}>
          {person.name || "Unnamed"}
        </span>
      </button>
    </div>
  );
};

export default RosterItem;
