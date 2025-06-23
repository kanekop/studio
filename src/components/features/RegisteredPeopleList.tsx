"use client";

import React, { useEffect, useState } from 'react';
import { Person } from '@/shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, ExternalLink } from 'lucide-react';
import { usePeople } from '@/contexts/PeopleContext';
import { useStorageImage } from '@/hooks/useStorageImage';
import Link from 'next/link';

interface RegisteredPeopleListProps {
  peopleIds: string[];
}

interface PersonCardProps {
  person: Person;
}

const PersonCard: React.FC<PersonCardProps> = ({ person }) => {
  const primaryFacePath = person.primaryFaceAppearancePath || 
    person.faceAppearances?.[0]?.faceImageStoragePath;
  
  const { imageUrl, isLoading } = useStorageImage(primaryFacePath);

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={person.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{person.name}</p>
          {person.company && (
            <p className="text-sm text-gray-500 truncate">{person.company}</p>
          )}
        </div>
        
        <Link href={`/people?person=${person.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
};

export const RegisteredPeopleList: React.FC<RegisteredPeopleListProps> = ({ peopleIds }) => {
  const { people } = usePeople();
  const [registeredPeople, setRegisteredPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!people || !peopleIds) {
      setIsLoading(false);
      return;
    }
    // Filter people that are in this roster
    const filtered = people.filter(p => peopleIds.includes(p.id));
    setRegisteredPeople(filtered);
    setIsLoading(false);
  }, [people, peopleIds]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {registeredPeople.map((person) => (
        <PersonCard key={person.id} person={person} />
      ))}
    </div>
  );
};