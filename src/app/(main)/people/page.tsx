"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePeople } from '@/contexts/PeopleContext';
import { useConnections } from '@/contexts/ConnectionContext';
import { useUI } from '@/contexts/UIContext';
import { useMergeFeatures } from '@/hooks/useMergeFeatures';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Merge, Trash2, Loader2, ListFilter, UserPlus, Zap, Search
} from 'lucide-react';
import { EditPersonDialog } from '@/components/features/EditPersonDialog';
import PeopleSearchFilters from '@/components/features/PeopleSearchFilters';
import VirtualizedPeopleList from '@/components/features/VirtualizedPeopleList';
import PeopleList from '@/components/features/PeopleList';
import { AddPersonDialog } from '@/components/features/AddPersonDialog';
import DeletePersonDialog from '@/components/features/DeletePersonDialog';
import CreateConnectionDialog from '@/components/features/CreateConnectionDialog';
import MergePeopleDialog from '@/components/features/MergePeopleDialog';
// import MergeSuggestionsDialog from '@/components/features/MergeSuggestionsDialog';
import type { Person, Connection, PeopleSortOptionValue, FieldMergeChoices, ProcessedConnectionFormData } from '@/shared/types';
import { ModeIndicator } from '@/components/features/ModeIndicator';

export default function PeoplePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const {
    allUserPeople,
    filteredPeople,
    isLoadingAllUserPeople,
    fetchAllUserPeople,
    peopleSearchQuery,
    setPeopleSearchQuery,
    selectedCompanyFilter,
    setSelectedCompanyFilter,
    sortedCompanies,
    updatePerson,
    addPerson,
    deletePerson,
    deleteMultiplePeople,
  } = usePeople();

  const {
    allUserConnections,
    isLoadingAllUserConnections,
    fetchAllUserConnections,
    addConnection,
  } = useConnections();

  const {
    isProcessing,
    setIsProcessing,
    peopleSortOption,
    setPeopleSortOption,
  } = useUI();

  const {
    mergeSuggestions,
    isLoadingMergeSuggestions,
    fetchMergeSuggestions,
    clearMergeSuggestions,
    performGlobalPeopleMerge,
    isMerging,
  } = useMergeFeatures();

  // State management
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddPersonDialogOpen, setIsAddPersonDialogOpen] = useState(false);
  const [selectedPeopleIdsForDeletion, setSelectedPeopleIdsForDeletion] = useState<string[]>([]);
  const [globallySelectedPeopleForMerge, setGloballySelectedPeopleForMerge] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'merge' | 'delete' | 'none'>('none');
  const [isSavingPersonDetails, setIsSavingPersonDetails] = useState(false);
  const [isSavingConnection, setIsSavingConnection] = useState(false);
  const [isCreateConnectionDialogOpen, setIsCreateConnectionDialogOpen] = useState(false);
  const [sourcePersonForConnection, setSourcePersonForConnection] = useState<Person | null>(null);
  const [targetPersonForConnection, setTargetPersonForConnection] = useState<Person | null>(null);
  // const [isMergeSuggestionsDialogOpen, setIsMergeSuggestionsDialogOpen] = useState(false);
  const [isPersonToPersonMergeDialogOpen, setIsPersonToPersonMergeDialogOpen] = useState(false);

  // Data fetching
  useEffect(() => {
    if (currentUser) {
      fetchAllUserPeople();
      fetchAllUserConnections();
    }
  }, [currentUser, fetchAllUserPeople, fetchAllUserConnections]);

  // Reset selections when mode changes
  useEffect(() => {
    setSelectedPeopleIdsForDeletion([]);
    setGloballySelectedPeopleForMerge([]);
  }, [selectionMode]);

  // Toggle handlers
  const handleToggleMergeSelection = useCallback((personId: string) => {
    setGloballySelectedPeopleForMerge(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else if (prev.length < 2) {
        return [...prev, personId];
      }
      return prev;
    });
  }, []);

  const handleToggleDeleteSelection = useCallback((personId: string) => {
    setSelectedPeopleIdsForDeletion(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  }, []);

  // Action handlers
  const handleEditClick = useCallback((person: Person) => {
    setPersonToEdit(person);
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdatePerson = async (personId: string, updates: Partial<Person>) => {
    setIsSavingPersonDetails(true);
    const success = await updatePerson(personId, updates);
    setIsSavingPersonDetails(false);
    if (success) {
      setIsEditDialogOpen(false);
      setPersonToEdit(null);
    }
  };

  const handleAddPerson = async (personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    setIsSavingPersonDetails(true);
    const personId = await addPerson(personData);
    setIsSavingPersonDetails(false);
    if (personId) {
      setIsAddPersonDialogOpen(false);
    }
  };

  const handleDeleteSelectedPeople = async () => {
    if (selectedPeopleIdsForDeletion.length === 0) return;
    
    setIsProcessing(true);
    const success = await deleteMultiplePeople(selectedPeopleIdsForDeletion);
    setIsProcessing(false);
    
    if (success) {
      setSelectedPeopleIdsForDeletion([]);
      setSelectionMode('none');
    }
  };

  const handlePerformManualMerge = async (
    targetPersonId: string,
    sourcePersonId: string,
    fieldChoices: FieldMergeChoices,
    chosenPrimaryPhotoPath: string | null
  ) => {
    await performGlobalPeopleMerge(targetPersonId, sourcePersonId, fieldChoices, chosenPrimaryPhotoPath);
    setGloballySelectedPeopleForMerge([]);
    setSelectionMode('none');
    setIsPersonToPersonMergeDialogOpen(false);
  };

  const handleInitiateConnection = (sourcePersonId: string, targetPersonId: string) => {
    const sourcePerson = allUserPeople?.find(p => p.id === sourcePersonId);
    const targetPerson = allUserPeople?.find(p => p.id === targetPersonId);
    
    if (sourcePerson && targetPerson) {
      setSourcePersonForConnection(sourcePerson);
      setTargetPersonForConnection(targetPerson);
      setIsCreateConnectionDialogOpen(true);
    } else {
      toast({ title: "エラー", description: "人物情報の取得に失敗しました", variant: "destructive" });
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

  const canManuallyMerge = globallySelectedPeopleForMerge?.length === 2 && !isProcessing && !isSavingPersonDetails && !isSavingConnection;
  const canDeleteSelected = selectedPeopleIdsForDeletion?.length > 0 && !isProcessing && !isSavingPersonDetails && !isSavingConnection;
  const generalActionDisabled = isProcessing || isSavingPersonDetails || isSavingConnection || isLoadingAllUserConnections || isLoadingAllUserPeople;

  // Safe access to people data for dialog
  const person1ForDialog = allUserPeople?.find(p => p.id === globallySelectedPeopleForMerge?.[0]) || null;
  const person2ForDialog = allUserPeople?.find(p => p.id === globallySelectedPeopleForMerge?.[1]) || null;
  
  const isDeleteSelectionMode = selectionMode === 'delete';

  return (
    <div className="container mx-auto py-8 px-4">
      {/* モードインジケーターを追加 */}
      <ModeIndicator selectionMode={selectionMode} />
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <Users className="inline-block mr-3 h-8 w-8" />
          Manage People
        </h1>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={peopleSortOption} onValueChange={(value) => setPeopleSortOption(value as PeopleSortOptionValue)} disabled={generalActionDisabled}>
            <SelectTrigger className="w-auto sm:w-[200px] text-sm">
              <ListFilter className="mr-2 h-4 w-4" />
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
            onClick={() => {
              fetchMergeSuggestions();
              // TODO: マージ候補が見つかったらダイアログを表示
              toast({ 
                title: "マージ候補を検索中", 
                description: "しばらくお待ちください..." 
              });
            }}
            disabled={generalActionDisabled || isLoadingMergeSuggestions || (allUserPeople?.length || 0) < 2 || selectionMode === 'delete'}
            title={selectionMode === 'delete' ? "Finish deletion first" : "Find merge suggestions"}
          >
            {isLoadingMergeSuggestions ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Find Duplicates
              </>
            )}
          </Button>

          <Button
            variant="default"
            onClick={() => setIsAddPersonDialogOpen(true)}
            disabled={generalActionDisabled || isDeleteSelectionMode}
            title={isDeleteSelectionMode ? "Finish deletion first" : "Add new person"}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Person</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <PeopleSearchFilters
          searchQuery={peopleSearchQuery}
          onSearchChange={setPeopleSearchQuery}
          selectedCompany={selectedCompanyFilter}
          onCompanyChange={setSelectedCompanyFilter}
          companies={sortedCompanies}
          disabled={generalActionDisabled}
        />

        <div className="flex items-center gap-2">
          <Select value={selectionMode} onValueChange={(value) => setSelectionMode(value as 'merge' | 'delete' | 'none')} disabled={generalActionDisabled}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select mode..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Normal Mode</SelectItem>
              <SelectItem value="merge">
                <span className="flex items-center">
                  <Merge className="mr-2 h-4 w-4" />
                  Merge Mode
                </span>
              </SelectItem>
              <SelectItem value="delete">
                <span className="flex items-center">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Mode
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {selectionMode === 'merge' && globallySelectedPeopleForMerge.length > 0 && (
            <Badge variant="secondary">
              {globallySelectedPeopleForMerge.length}/2 selected
            </Badge>
          )}

          {selectionMode === 'delete' && selectedPeopleIdsForDeletion.length > 0 && (
            <Badge variant="destructive">
              {selectedPeopleIdsForDeletion.length} selected
            </Badge>
          )}

          {canManuallyMerge && (
            <Button
              onClick={() => setIsPersonToPersonMergeDialogOpen(true)}
              disabled={!canManuallyMerge}
              size="sm"
            >
              <Merge className="mr-2 h-4 w-4" />
              Merge Selected
            </Button>
          )}

          {canDeleteSelected && (
            <Button
              variant="destructive"
              onClick={handleDeleteSelectedPeople}
              disabled={!canDeleteSelected}
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          )}
        </div>
      </div>

      {isLoadingAllUserPeople ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {(filteredPeople?.length || 0) > 20 ? (
            <VirtualizedPeopleList
              people={filteredPeople || []}
              isLoading={isLoadingAllUserPeople}
              onEditClick={handleEditClick}
              onInitiateConnection={handleInitiateConnection}
              selectionMode={selectionMode}
              selectedForMergeIds={globallySelectedPeopleForMerge}
              onToggleMergeSelection={handleToggleMergeSelection}
              selectedForDeletionIds={selectedPeopleIdsForDeletion}
              onToggleDeleteSelection={handleToggleDeleteSelection}
              generalActionDisabled={generalActionDisabled}
              allUserPeople={allUserPeople || []}
              allUserConnections={allUserConnections || []}
            />
          ) : (
            <PeopleList
              people={filteredPeople || []}
              isLoading={isLoadingAllUserPeople}
              onEditClick={handleEditClick}
              onInitiateConnection={handleInitiateConnection}
              selectionMode={selectionMode}
              selectedForMergeIds={globallySelectedPeopleForMerge}
              onToggleMergeSelection={handleToggleMergeSelection}
              selectedForDeletionIds={selectedPeopleIdsForDeletion}
              onToggleDeleteSelection={handleToggleDeleteSelection}
              generalActionDisabled={generalActionDisabled}
              allUserPeople={allUserPeople || []}
              allUserConnections={allUserConnections || []}
            />
          )}
        </>
      )}

      {/* Dialogs */}
      <EditPersonDialog
        person={personToEdit}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={handleUpdatePerson}
      />

      <AddPersonDialog
        isOpen={isAddPersonDialogOpen}
        onOpenChange={setIsAddPersonDialogOpen}
        onAdd={handleAddPerson}
      />

      <CreateConnectionDialog
        isOpen={isCreateConnectionDialogOpen}
        onOpenChange={setIsCreateConnectionDialogOpen}
        sourcePerson={sourcePersonForConnection}
        targetPerson={targetPersonForConnection}
        allUserPeople={allUserPeople || []}
        onSave={handleSaveConnection}
        isSaving={isSavingConnection}
      />

      {/* <MergeSuggestionsDialog
        isOpen={isMergeSuggestionsDialogOpen}
        onOpenChange={setIsMergeSuggestionsDialogOpen}
        suggestions={mergeSuggestions}
        onPerformMerge={performGlobalPeopleMerge}
        onDismissSuggestion={(index) => {
          const newSuggestions = [...mergeSuggestions];
          newSuggestions.splice(index, 1);
          if (newSuggestions.length === 0) {
            clearMergeSuggestions();
            setIsMergeSuggestionsDialogOpen(false);
          }
        }}
        isMerging={isMerging}
      /> */}

      {person1ForDialog && person2ForDialog && (
        <MergePeopleDialog
          isOpen={isPersonToPersonMergeDialogOpen}
          onOpenChange={setIsPersonToPersonMergeDialogOpen}
          person1={person1ForDialog}
          person2={person2ForDialog}
          onMerge={handlePerformManualMerge}
          isMerging={isMerging}
        />
      )}
    </div>
  );
}