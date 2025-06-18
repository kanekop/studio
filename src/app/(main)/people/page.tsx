
"use client";
import React, { useEffect, useState } from 'react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { Button } from '@/components/ui/button';
import { UserCheck, Users, Brain, Merge, XCircle } from 'lucide-react';
import PeopleList from '@/components/features/PeopleList';
import { Skeleton } from '@/components/ui/skeleton';
import MergePeopleDialog from '@/components/features/MergePeopleDialog'; 
import type { Person, FieldMergeChoices } from '@/types';

export default function ManagePeoplePage() {
  const { 
    allUserPeople, 
    isLoadingAllUserPeople, 
    fetchAllUserPeople, 
    currentUser,
    globallySelectedPeopleForMerge,
    toggleGlobalPersonSelectionForMerge,
    clearGlobalMergeSelection,
    performGlobalPeopleMerge,
    isProcessing,
  } = useFaceRoster();

  const [isMergeSelectionMode, setIsMergeSelectionMode] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);

  useEffect(() => {
    if (currentUser && !allUserPeople.length && !isLoadingAllUserPeople) {
      fetchAllUserPeople();
    }
  }, [currentUser, fetchAllUserPeople, allUserPeople, isLoadingAllUserPeople]);

  useEffect(() => {
    if (!isMergeSelectionMode) {
      clearGlobalMergeSelection();
    }
  }, [isMergeSelectionMode, clearGlobalMergeSelection]);

  const handleToggleMergeMode = () => {
    setIsMergeSelectionMode(!isMergeSelectionMode);
  };

  const handleInitiateMerge = () => {
    if (globallySelectedPeopleForMerge.length === 2) {
      setIsMergeDialogOpen(true);
    }
  };
  
  const handleConfirmMergeFromDialog = async (
    targetPersonId: string, 
    sourcePersonId: string, 
    fieldChoices: FieldMergeChoices
  ) => {
    await performGlobalPeopleMerge(targetPersonId, sourcePersonId, fieldChoices);
    setIsMergeDialogOpen(false);
    setIsMergeSelectionMode(false); // Exit merge selection mode after merge
  };
  
  const canMerge = globallySelectedPeopleForMerge.length === 2 && !isProcessing;

  const person1ForDialog = allUserPeople.find(p => p.id === globallySelectedPeopleForMerge[0]) || null;
  const person2ForDialog = allUserPeople.find(p => p.id === globallySelectedPeopleForMerge[1]) || null;

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
          <Button 
            variant={isMergeSelectionMode ? "destructive" : "outline"} 
            onClick={handleToggleMergeMode}
            disabled={isProcessing || (!isMergeSelectionMode && allUserPeople.length < 2)}
          >
            {isMergeSelectionMode ? (
              <>
                <XCircle className="mr-2 h-4 w-4" /> Cancel Merge Selection
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" /> Select to Merge
              </>
            )}
          </Button>
          {isMergeSelectionMode && (
            <Button 
              onClick={handleInitiateMerge}
              disabled={!canMerge}
              size="default"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Merge className="mr-2 h-4 w-4" /> Merge Selected ({globallySelectedPeopleForMerge.length})
            </Button>
          )}
        </div>
      </div>
      
      {isMergeSelectionMode && (
        <div className="mb-4 p-3 bg-accent/20 border border-accent rounded-md text-center">
          <p className="text-sm text-accent-foreground">
            Select exactly two people from the list below to merge their information. 
            The first person selected will be the primary record for data conflict resolution in the upcoming dialog.
          </p>
        </div>
      )}

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
        <PeopleList 
          people={allUserPeople} 
          isMergeSelectionMode={isMergeSelectionMode}
          selectedPeopleForMerge={globallySelectedPeopleForMerge}
          onToggleSelection={toggleGlobalPersonSelectionForMerge}
        />
      )}

      {person1ForDialog && person2ForDialog && (
        <MergePeopleDialog
          isOpen={isMergeDialogOpen}
          onOpenChange={setIsMergeDialogOpen}
          person1={person1ForDialog}
          person2={person2ForDialog}
          onConfirmMerge={handleConfirmMergeFromDialog}
        />
      )}
    </div>
  );
}
