"use client";
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react';
import PeopleList from '@/components/features/PeopleList';
import { EditPersonDialog } from '@/components/features/EditPersonDialog';
import DeletePersonDialog from '@/components/features/DeletePersonDialog';
import { AddPersonDialog } from '@/components/features/AddPersonDialog';
import type { Person, Connection } from '@/shared/types';
import { PeopleService, UpdatePersonData } from '@/domain/services/people/PeopleService';
import PeopleSearchFilters from '@/components/features/PeopleSearchFilters'; // Assuming this is mostly self-contained

export default function ManagePeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  
  const [isAddPersonDialogOpen, setIsAddPersonDialogOpen] = useState(false);

  // Initial data fetching
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [peopleData, connectionsData] = await Promise.all([
          PeopleService.getAllPeople(),
          // Assuming a method to get all connections exists or can be added.
          // For now, let's create a placeholder.
          (async () => {
            const allPeople = await PeopleService.getAllPeople();
            const allConnections = await Promise.all(allPeople.map(p => PeopleService.getConnectionsForPerson(p.id)));
            return allConnections.flat();
          })()
        ]);
        setPeople(peopleData);
        setConnections(connectionsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        // Add user-facing error handling (e.g., toast notification)
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEditClick = (person: Person) => {
    setPersonToEdit(person);
  };

  const handleDeleteClick = (person: Person) => {
    setPersonToDelete(person);
  };

  const handleUpdatePerson = (personId: string, updates: UpdatePersonData) => {
    setPeople(prevPeople =>
      prevPeople.map(p => (p.id === personId ? { ...p, ...updates } : p))
    );
  };
  
  const handleConfirmDelete = async () => {
    if (!personToDelete) return;
    
    try {
      await PeopleService.deletePerson(personToDelete.id);
      setPeople(prevPeople => prevPeople.filter(p => p.id !== personToDelete.id));
      // Also refetch/update connections if necessary
      const newConnections = connections.filter(c => c.fromPersonId !== personToDelete.id && c.toPersonId !== personToDelete.id);
      setConnections(newConnections);
      
      setPersonToDelete(null);
    } catch (error) {
       console.error("Failed to delete person:", error);
       // Add user-facing error handling
    }
  };

  const handleAddPerson = (newPerson: Person) => {
    setPeople(prev => [...prev, newPerson]);
  };

  // TODO: Implement search and filtering logic based on simplified state
  const filteredPeople = people; // Placeholder

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className='space-y-1'>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">People</h1>
          <p className="text-sm text-muted-foreground">Manage all individuals in your network.</p>
        </div>
        <Button onClick={() => setIsAddPersonDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Person
        </Button>
      </div>
      
      {/* Search and filter components can be progressively re-integrated */}
      {/* <PeopleSearchFilters /> */}
      
      <PeopleList
        people={filteredPeople}
        connections={connections}
        isLoading={isLoading}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />
      
      {personToEdit && (
        <EditPersonDialog
          person={personToEdit}
          isOpen={!!personToEdit}
          onClose={() => setPersonToEdit(null)}
          onUpdate={handleUpdatePerson}
        />
      )}
      
      {personToDelete && (
        <DeletePersonDialog
          person={personToDelete}
          isOpen={!!personToDelete}
          onClose={() => setPersonToDelete(null)}
          onConfirm={handleConfirmDelete}
          connectionCount={connections.filter(c => c.fromPersonId === personToDelete.id || c.toPersonId === personToDelete.id).length}
        />
      )}
      
      <AddPersonDialog
        isOpen={isAddPersonDialogOpen}
        onClose={() => setIsAddPersonDialogOpen(false)}
        onAdd={handleAddPerson}
      /> 
    </div>
  );
}


