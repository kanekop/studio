
"use client";
import React from 'react';
import Image from 'next/image';
import type { Person } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from 'lucide-react';


interface RosterItemProps {
  person: Person;
  isSelected: boolean;
  onSelect: () => void;
}

const RosterItem: React.FC<RosterItemProps> = ({ person, isSelected, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center p-2 rounded-md transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected ? "bg-primary/20 shadow-sm" : "hover:bg-accent/50",
        "dark:focus-visible:ring-offset-background-dark" 
      )}
      aria-pressed={isSelected}
      aria-label={`Select ${person.name}`}
    >
      <Avatar className="h-10 w-10 mr-3 border-2 border-transparent group-hover:border-accent transition-colors">
        <AvatarImage src={person.faceImageUrl} alt={`Face of ${person.name}`} className="object-cover" />
        <AvatarFallback className="bg-muted">
          <User className="h-5 w-5 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <span className={cn(
        "truncate text-sm font-medium",
        isSelected ? "text-primary" : "text-foreground/90"
      )}>
        {person.name}
      </span>
    </button>
  );
};

export default RosterItem;
