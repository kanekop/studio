
"use client";
import React, { useEffect, useState } from 'react';
import { useFaceRoster, type PeopleSortOptionValue } from '@/contexts/FaceRosterContext';
import { Button } from '@/components/ui/button';
import { UserCheck, Users, Brain, Merge, XCircle, SearchCheck, FileWarning, Trash2, ListChecks, ListFilter, Pencil, X, Link2 } from 'lucide-react';
import PeopleList from '@/components/features/PeopleList';
import { Skeleton } from '@/components/ui/skeleton';
import MergePeopleDialog from '@/components/features/MergePeopleDialog'; 
import EditPersonDialog, { type EditPersonFormData } from '@/components/features/EditPersonDialog';
import CreateConnectionDialog, { type ProcessedConnectionFormData } from '@/components/features/CreateConnectionDialog';
import type { Person, FieldMergeChoices, SuggestedMergePair } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';


export default function ManagePeoplePage() {
  const { 
    allUserPeople, 
    isLoadingAllUserPeople, 
    currentUser,
    globallySelectedPeopleForMerge,
    toggleGlobalPersonSelectionForMerge,
    clearGlobalMergeSelection,
    performGlobalPeopleMerge,
    isProcessing, 
    fetchMergeSuggestions,
    mergeSuggestions,
    clearMergeSuggestions,
    isLoadingMergeSuggestions,
    peopleSortOption,
    setPeopleSortOption,
    selectedPeopleIdsForDeletion,
    togglePersonSelectionForDeletion,
    clearPeopleSelectionForDeletion,
    deleteSelectedPeople,
    updateGlobalPersonDetails,
    addConnection,
  } = useFaceRoster();
  const { toast } = useToast();

  const [isMergeSelectionMode, setIsMergeSelectionMode] = useState(false);
  const [isDeleteSelectionMode, setIsDeleteSelectionMode] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [isEditPersonDialogOpen, setIsEditPersonDialogOpen] = useState(false);
  const [isSavingPersonDetails, setIsSavingPersonDetails] = useState(false); 

  const [isCreateConnectionDialogOpen, setIsCreateConnectionDialogOpen] = useState(false);
  const [sourcePersonForConnection, setSourcePersonForConnection] = useState<Person | null>(null);
  const [targetPersonForConnection, setTargetPersonForConnection] = useState<Person | null>(null);
  const [isSavingConnection, setIsSavingConnection] = useState(false);


  useEffect(() => {
    if (!isMergeSelectionMode) {
      clearGlobalMergeSelection();
    }
    if (isMergeSelectionMode && isDeleteSelectionMode) { 
        setIsDeleteSelectionMode(false);
        clearPeopleSelectionForDeletion();
    }
  }, [isMergeSelectionMode, clearGlobalMergeSelection, isDeleteSelectionMode, clearPeopleSelectionForDeletion]);

  useEffect(() => {
    if (!isDeleteSelectionMode) {
      clearPeopleSelectionForDeletion();
    }
     if (isDeleteSelectionMode && isMergeSelectionMode) { 
        setIsMergeSelectionMode(false);
        clearGlobalMergeSelection();
    }
  }, [isDeleteSelectionMode, clearPeopleSelectionForDeletion, isMergeSelectionMode, clearGlobalMergeSelection]);

  const handleToggleMergeMode = () => {
    setIsMergeSelectionMode(!isMergeSelectionMode);
    if (!isMergeSelectionMode) setIsDeleteSelectionMode(false); 
    setPersonToEdit(null); setIsEditPersonDialogOpen(false); 
  };

  const handleToggleDeleteMode = () => {
    setIsDeleteSelectionMode(!isDeleteSelectionMode);
    if (!isDeleteSelectionMode) setIsMergeSelectionMode(false); 
    setPersonToEdit(null); setIsEditPersonDialogOpen(false); 
  };

  const handleInitiateMergeFromSelection = () => {
    if (globallySelectedPeopleForMerge.length === 2) {
      setIsMergeDialogOpen(true);
    }
  };

  const handleInitiateMergeFromSuggestion = (suggestion: SuggestedMergePair) => {
    clearGlobalMergeSelection(); 
    toggleGlobalPersonSelectionForMerge(suggestion.person1Id);
    toggleGlobalPersonSelectionForMerge(suggestion.person2Id);
    setIsMergeSelectionMode(true); 
    setIsDeleteSelectionMode(false);
    setPersonToEdit(null); setIsEditPersonDialogOpen(false);
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

  const handleConfirmDelete = async () => {
    await deleteSelectedPeople();
    setIsDeleteSelectionMode(false); 
    setIsDeleteDialogOpen(false);
  };

  const handleOpenEditPersonDialog = (person: Person) => {
    setIsMergeSelectionMode(false);
    setIsDeleteSelectionMode(false);
    setPersonToEdit(person);
    setIsEditPersonDialogOpen(true);
  };

  const handleSavePersonDetails = async (personId: string, data: EditPersonFormData) => {
    setIsSavingPersonDetails(true);
    const success = await updateGlobalPersonDetails(personId, data);
    setIsSavingPersonDetails(false);
    if (success) {
      setIsEditPersonDialogOpen(false);
      setPersonToEdit(null);
    }
  };

  const handleInitiateConnection = (sourcePersonId: string, targetPersonId: string) => {
    if (sourcePersonId === targetPersonId) {
        toast({title: "Cannot connect person to themself", variant: "default"});
        return;
    }
    const source = allUserPeople.find(p => p.id === sourcePersonId);
    const target = allUserPeople.find(p => p.id === targetPersonId);

    if (source && target) {
      setSourcePersonForConnection(source);
      setTargetPersonForConnection(target);
      setIsCreateConnectionDialogOpen(true);
    } else {
      toast({title: "Error", description: "Could not find persons to connect.", variant: "destructive"});
    }
  };

  const handleSaveConnection = async (data: ProcessedConnectionFormData) => {
    if (!sourcePersonForConnection || !targetPersonForConnection) return;
    setIsSavingConnection(true);
    
    const connectionId = await addConnection(
      sourcePersonForConnection.id,
      targetPersonForConnection.id,
      data.types, 
      data.reasons,
      data.strength,
      data.notes
    );
    setIsSavingConnection(false);
    if (connectionId) {
      setIsCreateConnectionDialogOpen(false);
      setSourcePersonForConnection(null);
      setTargetPersonForConnection(null);
    }
  };
  
  const canManuallyMerge = globallySelectedPeopleForMerge.length === 2 && !isProcessing && !isSavingPersonDetails && !isSavingConnection;
  const canDeleteSelected = selectedPeopleIdsForDeletion.length > 0 && !isProcessing && !isSavingPersonDetails && !isSavingConnection;
  const generalActionDisabled = isProcessing || isSavingPersonDetails || isSavingConnection;


  const person1ForDialog = allUserPeople.find(p => p.id === globallySelectedPeopleForMerge[0]) || null;
  const person2ForDialog = allUserPeople.find(p => p.id === globallySelectedPeopleForMerge[1]) || null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <Users className="inline-block mr-3 h-8 w-8" />
          Manage People
        </h1>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={peopleSortOption} onValueChange={(value) => setPeopleSortOption(value as PeopleSortOptionValue)} disabled={generalActionDisabled}>
            <SelectTrigger className="w-auto sm:w-[200px] text-sm">
              <ListFilter className="mr-2 h-4 w-4"/>
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">Date Added (Newest)</SelectItem>
              <SelectItem value="createdAt_asc">Date Added (Oldest)</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
         
          <Button 
            variant="outline" 
            onClick={fetchMergeSuggestions} 
            disabled={generalActionDisabled || isLoadingMergeSuggestions || allUserPeople.length < 2 || isDeleteSelectionMode}
            title={isDeleteSelectionMode ? "Finish deletion first" : "Find merge suggestions"}
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
            variant={isMergeSelectionMode ? "default" : "outline"} 
            onClick={handleToggleMergeMode}
            disabled={generalActionDisabled || allUserPeople.length < 2 || isDeleteSelectionMode}
            className={isMergeSelectionMode ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
            title={isDeleteSelectionMode ? "Finish deletion first" : (isMergeSelectionMode ? "Cancel Merge Selection" : "Select to Merge Manually")}
          >
            {isMergeSelectionMode ? (
              <>
                <XCircle className="mr-2 h-4 w-4" /> Cancel Merge
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" /> Merge Manually
              </>
            )}
          </Button>

          <Button 
            variant={isDeleteSelectionMode ? "default" : "outline"} 
            onClick={handleToggleDeleteMode}
            disabled={generalActionDisabled || allUserPeople.length < 1 || isMergeSelectionMode}
             className={isDeleteSelectionMode ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
            title={isMergeSelectionMode ? "Finish merging first" : (isDeleteSelectionMode ? "Cancel Deletion" : "Select to Delete")}
          >
            {isDeleteSelectionMode ? (
              <>
                <XCircle className="mr-2 h-4 w-4" /> Cancel Deletion
              </>
            ) : (
              <>
                <ListChecks className="mr-2 h-4 w-4" /> Select to Delete
              </>
            )}
          </Button>

        </div>
      </div>

      {isMergeSelectionMode && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md text-center">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Merge Mode: Select exactly two people from the list to merge. 
            The first selected will be the primary.
          </p>
          {globallySelectedPeopleForMerge.length > 0 && (
             <Button 
              onClick={handleInitiateMergeFromSelection}
              disabled={!canManuallyMerge}
              size="sm"
              className="mt-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Merge className="mr-2 h-4 w-4" /> Merge Selected ({globallySelectedPeopleForMerge.length})
            </Button>
          )}
        </div>
      )}

      {isDeleteSelectionMode && (
        <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-md text-center">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Delete Mode: Select one or more people from the list to delete.
          </p>
          {selectedPeopleIdsForDeletion.length > 0 && (
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  size="sm"
                  className="mt-2"
                  disabled={!canDeleteSelected}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedPeopleIdsForDeletion.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedPeopleIdsForDeletion.length} selected person(s)? 
                    This will remove them from all rosters and delete their associated face images. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDelete} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                    {isProcessing ? "Deleting..." : "Yes, Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
      
      {!isMergeSelectionMode && !isDeleteSelectionMode && !isEditPersonDialogOpen && (
        <div className="mb-4 p-3 bg-green-500/5 border border-green-500/20 rounded-md text-center">
          <p className="text-sm text-green-700 dark:text-green-300 flex items-center justify-center">
            <Link2 className="mr-2 h-4 w-4" />
            To create a connection, drag one person's card and drop it onto another person's card.
          </p>
        </div>
      )}

      {mergeSuggestions.length > 0 && !isLoadingMergeSuggestions && !isDeleteSelectionMode && !isEditPersonDialogOpen && (
        <Card className="mb-6 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline text-xl flex items-center">
                <SearchCheck className="mr-2 h-5 w-5 text-primary" /> AI Merge Suggestions
              </CardTitle>
              <CardDescription>
                The AI has found these potential duplicates. Review and merge if appropriate.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMergeSuggestions}
              className="text-muted-foreground hover:text-destructive"
              title="Dismiss suggestions"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Dismiss suggestions</span>
            </Button>
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
                        <p className="text-xs text-muted-foreground mt-0.5">Confidence: <span className="font-medium">{suggestion.confidence || 'N/A'}</span></p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleInitiateMergeFromSuggestion(suggestion)}
                        disabled={generalActionDisabled || isDeleteSelectionMode}
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
      {isLoadingMergeSuggestions && mergeSuggestions.length === 0 && !isDeleteSelectionMode && !isEditPersonDialogOpen && (
         <div className="mb-6 p-4 text-center text-muted-foreground">
            <svg className="animate-spin mx-auto h-8 w-8 text-primary mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Looking for merge suggestions...
        </div>
      )}
       {!isLoadingMergeSuggestions && mergeSuggestions.length === 0 && allUserPeople.length > 1 && !isDeleteSelectionMode && !isEditPersonDialogOpen &&(
         <Card className="mb-6 shadow-sm border-dashed">
            <CardContent className="p-6 text-center">
                <FileWarning className="mx-auto h-10 w-10 text-muted-foreground mb-3"/>
                <p className="text-sm text-muted-foreground">
                    No merge suggestions found by the AI. <br/>
                    You can still select people manually to merge them.
                </p>
            </CardContent>
         </Card>
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
        <div className="text-center text-muted-foreground text-lg py-10 border border-dashed rounded-md">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="font-semibold">No people registered yet.</p>
          <p className="text-sm">Upload images and create rosters to add people to your list.</p>
        </div>
      ) : (
        <PeopleList 
          people={allUserPeople} 
          isMergeSelectionMode={isMergeSelectionMode}
          selectedPeopleForMerge={globallySelectedPeopleForMerge}
          onToggleMergeSelection={toggleGlobalPersonSelectionForMerge}
          isDeleteSelectionMode={isDeleteSelectionMode}
          selectedPeopleForDelete={selectedPeopleIdsForDeletion}
          onToggleDeleteSelection={togglePersonSelectionForDeletion}
          onEditPerson={handleOpenEditPersonDialog} 
          generalActionDisabled={generalActionDisabled}
          onInitiateConnection={handleInitiateConnection}
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

      {isEditPersonDialogOpen && personToEdit && (
        <EditPersonDialog
          personToEdit={personToEdit}
          isOpen={isEditPersonDialogOpen}
          onOpenChange={setIsEditPersonDialogOpen}
          onSave={handleSavePersonDetails}
          isProcessing={isSavingPersonDetails}
        />
      )}

      {sourcePersonForConnection && targetPersonForConnection && (
        <CreateConnectionDialog
          isOpen={isCreateConnectionDialogOpen}
          onOpenChange={setIsCreateConnectionDialogOpen}
          sourcePerson={sourcePersonForConnection}
          targetPerson={targetPersonForConnection}
          onSave={handleSaveConnection}
          isProcessing={isSavingConnection}
        />
      )}
    </div>
  );
}
