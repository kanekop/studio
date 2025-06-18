
"use client";
import React from 'react';
import type { Person } from '@/types';
import PeopleListItem from './PeopleListItem';

interface PeopleListProps {
  people: Person[];
  // Add other props as needed, e.g., for selection in future merge functionality
}

const PeopleList: React.FC<PeopleListProps> = ({ people }) => {
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
        <PeopleListItem key={person.id} person={person} />
      ))}
    </div>
  );
};

export default PeopleList;
