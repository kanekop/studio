
"use client";
import React, { useEffect } from 'react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { Button } from '@/components/ui/button';
import { UserCheck, Users, Brain } from 'lucide-react';
import PeopleList from '@/components/features/PeopleList';
import { Skeleton } from '@/components/ui/skeleton';

export default function ManagePeoplePage() {
  const { allUserPeople, isLoadingAllUserPeople, fetchAllUserPeople, currentUser } = useFaceRoster();

  useEffect(() => {
    if (currentUser && !allUserPeople.length && !isLoadingAllUserPeople) {
      fetchAllUserPeople();
    }
  }, [currentUser, fetchAllUserPeople, allUserPeople, isLoadingAllUserPeople]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary">
          <Users className="inline-block mr-3 h-8 w-8" />
          Manage People
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled>
            <Brain className="mr-2 h-4 w-4" /> AI Merge Suggestions (Soon)
          </Button>
          <Button variant="outline" disabled>
            <UserCheck className="mr-2 h-4 w-4" /> Select to Merge (Soon)
          </Button>
        </div>
      </div>

      {isLoadingAllUserPeople ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3 p-4 border rounded-lg">
              <Skeleton className="h-32 w-32 rounded-full mx-auto bg-muted" />
              <Skeleton className="h-4 w-3/4 mx-auto bg-muted" />
              <Skeleton className="h-4 w-1/2 mx-auto bg-muted" />
            </div>
          ))}
        </div>
      ) : allUserPeople.length === 0 ? (
        <p className="text-center text-muted-foreground text-lg py-10">
          No people registered yet. Upload images and create rosters to add people.
        </p>
      ) : (
        <PeopleList people={allUserPeople} />
      )}
    </div>
  );
}
