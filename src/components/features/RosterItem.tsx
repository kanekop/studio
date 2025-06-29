"use client";
import React from 'react';
import type { EditablePersonInContext } from '@/shared/types';
import { cn } from '@/shared/utils/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from 'lucide-react';
import { useStorageImage } from '@/hooks/useStorageImage.improved';

interface RosterItemProps {
  person: EditablePersonInContext;
  isSelected: boolean;
  onSelect: () => void;
  isDisabled?: boolean;
}

const RosterItem: React.FC<RosterItemProps> = ({ 
  person, 
  isSelected, 
  onSelect,
  isDisabled = false,
}) => {
  console.log('RosterItem: Rendering person:', { id: person.id, name: person.name });
  
  // Use the same robust image fetching hook as the main PeopleList
  const imagePath = person.currentRosterAppearance?.faceImageStoragePath;
  const { url: displayImageUrl } = useStorageImage(imagePath);

  return (
    <div
      className={cn(
        "w-full flex items-center p-2 rounded-md transition-all duration-150 ease-in-out group",
        isSelected ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-accent/30",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
      aria-disabled={isDisabled}
    >
      <button
        onClick={() => { if (!isDisabled) onSelect() }}
        disabled={isDisabled}
        className={cn(
          "flex-grow flex items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
          isDisabled && "cursor-not-allowed"
        )}
        aria-pressed={isSelected}
        aria-label={`Select ${person.name}`}
      >
        <Avatar className="h-10 w-10 mr-3 border-2 border-transparent group-hover:border-accent transition-colors">
          <AvatarImage src={displayImageUrl || person.tempFaceImageDataUri} alt={`Face of ${person.name}`} className="object-cover" />
          <AvatarFallback className="bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          "truncate text-sm font-medium",
          isSelected ? "text-primary font-semibold" : "text-foreground/90"
        )}>
          {person.name || "Unnamed"}
        </span>
      </button>
    </div>
  );
};

export default RosterItem;
