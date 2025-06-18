
"use client";
import React, { useEffect, useState } from 'react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { Button } from '@/components/ui/button';
import { UserCheck, Users, Brain, Merge, XCircle, SearchCheck, FileWarning } from 'lucide-react';
import PeopleList from '@/components/features/PeopleList';
import { Skeleton } from '@/components/ui/skeleton';
import MergePeopleDialog from '@/components/features/MergePeopleDialog'; 
import type { Person, FieldMergeChoices, SuggestedMergePair } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';


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
    fetchMergeSuggestions,
    mergeSuggestions,
    isLoadingMergeSuggestions,
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
    // If exiting merge mode, ensure suggestions are cleared or handled if needed
    // For now, merge suggestions persist until explicitly re-fetched or page reloads
  };

  const handleInitiateMergeFromSelection = () => {
    if (globallySelectedPeopleForMerge.length === 2) {
      setIsMergeDialogOpen(true);
    }
  };

  const handleInitiateMergeFromSuggestion = (suggestion: SuggestedMergePair) => {
    clearGlobalMergeSelection(); // Clear any manual selections
    toggleGlobalPersonSelectionForMerge(suggestion.person1Id);
    toggleGlobalPersonSelectionForMerge(suggestion.person2Id);
    setIsMergeSelectionMode(true); // Enter merge selection mode
    // Timeout to allow state to update before opening dialog
    setTimeout(() => {
        setIsMergeDialogOpen(true);
    }, 0);
  };
  
  const handleConfirmMergeFromDialog = async (
    targetPersonId: string, 
    sourcePersonId: string, 
    fieldChoices: FieldMergeChoices
  ) => {
    await performGlobalPeopleMerge(targetPersonId, sourcePersonId, fieldChoices);
    setIsMergeDialogOpen(false);
    setIsMergeSelectionMode(false); 
  };
  
  const canManuallyMerge = globallySelectedPeopleForMerge.length === 2 && !isProcessing;

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
          <Button 
            variant="outline" 
            onClick={fetchMergeSuggestions} 
            disabled={isProcessing || isLoadingMergeSuggestions || allUserPeople.length < 2}
          >
            {isLoadingMergeSuggestions ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Finding...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" /> AI Merge Suggestions
              </>
            )}
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
                <UserCheck className="mr-2 h-4 w-4" /> Select to Merge Manually
              </>
            )}
          </Button>
          {isMergeSelectionMode && (
            <Button 
              onClick={handleInitiateMergeFromSelection}
              disabled={!canManuallyMerge}
              size="default"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Merge className="mr-2 h-4 w-4" /> Merge Manually Selected ({globallySelectedPeopleForMerge.length})
            </Button>
          )}
        </div>
      </div>
      
      {mergeSuggestions.length > 0 && !isLoadingMergeSuggestions && (
        <Card className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <SearchCheck className="mr-2 h-5 w-5 text-primary" /> Merge Suggestions
            </CardTitle>
            <CardDescription>
              The AI (placeholder) has found these potential duplicates. Review and merge if appropriate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px] pr-3">
              <div className="space-y-3">
                {mergeSuggestions.map((suggestion, index) => (
                  <div key={`${suggestion.person1Id}-${suggestion.person2Id}-${index}`} className="p-3 border rounded-md bg-card/80 hover:shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          Merge <strong className="text-accent">{suggestion.person1Name}</strong> (ID: ...{suggestion.person1Id.slice(-4)})
                          <br/>with <strong className="text-accent">{suggestion.person2Name}</strong> (ID: ...{suggestion.person2Id.slice(-4)})?
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Reason: {suggestion.reason}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleInitiateMergeFromSuggestion(suggestion)}
                        disabled={isProcessing}
                        className="mt-2 sm:mt-0 shrink-0"
                      >
                        <Merge className="mr-2 h-4 w-4" /> Review & Merge Pair
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      {isLoadingMergeSuggestions && mergeSuggestions.length === 0 && (
         <div className="mb-6 p-4 text-center text-muted-foreground">
            <svg className="animate-spin mx-auto h-8 w-8 text-primary mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Looking for merge suggestions...
        </div>
      )}
       {!isLoadingMergeSuggestions && mergeSuggestions.length === 0 && allUserPeople.length > 0 && (
         <Card className="mb-6 shadow-sm border-dashed">
            <CardContent className="p-6 text-center">
                <FileWarning className="mx-auto h-10 w-10 text-muted-foreground mb-3"/>
                <p className="text-sm text-muted-foreground">
                    No merge suggestions found by the current (placeholder) AI. <br/>
                    You can still select people manually from the list below to merge them.
                </p>
            </CardContent>
         </Card>
      )}


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

      {person1ForDialog && person2ForDialog && isMergeDialogOpen && (
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
