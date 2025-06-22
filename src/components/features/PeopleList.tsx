"use client";
import React from 'react';
import type { Person, Connection } from '@/shared/types';
import PeopleListItem from './PeopleListItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from "@/components/ui/card";

interface PeopleListProps {
  people: Person[];
  connections: Connection[];
  isLoading: boolean;
  onEditClick: (person: Person) => void;
  onDeleteClick: (person: Person) => void;
}

export default function PeopleList({
  people,
  connections,
  isLoading,
  onEditClick,
  onDeleteClick,
}: PeopleListProps) {

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton key={index} className="h-[280px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p className="font-semibold">No people found.</p>
            <p className="text-sm">Try adjusting your search or filters, or add a new person.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {people.map((person) => {
        if (!person?.id) {
          console.warn('Person object missing id:', person);
          return null;
        }
        
        return (
          <PeopleListItem
            key={person.id}
            person={person}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            connections={connections}
          />
        );
      })}
    </div>
  );
}
