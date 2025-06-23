"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  deleteDoc, 
  writeBatch,
  runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/config';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import type { Person, AdvancedSearchParams, Connection } from '@/shared/types';
import { useToast } from "@/hooks/use-toast";
import { PeopleService, UpdatePersonData } from '@/domain/services/people/PeopleService';

export type PeopleSortOptionValue = 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc';

interface PeopleContextType {
  allUserPeople: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  filteredPeople: Person[];
  fetchAllUserPeople: () => Promise<void>;
  searchParams: AdvancedSearchParams;
  setSearchParams: React.Dispatch<React.SetStateAction<AdvancedSearchParams>>;
  sortOption: PeopleSortOptionValue;
  setSortOption: React.Dispatch<React.SetStateAction<PeopleSortOptionValue>>;
  addPerson: (personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<Person | undefined>;
  updatePerson: (personId: string, updates: UpdatePersonData) => Promise<boolean>;
  deletePerson: (personId: string) => Promise<boolean>;
  deleteMultiplePeople: (personIds: string[]) => Promise<boolean>;
  getPersonById: (id: string) => Person | undefined;
  isLoading: boolean;
  error: Error | null;
  selectedForMerge: Person[];
  toggleMergeSelection: (person: Person) => void;
  clearMergeSelection: () => void;
  selectedForDeletion: Person[];
  toggleDeletionSelection: (person: Person) => void;
  clearDeletionSelection: () => void;
  isDeleting: boolean;
  connections: Connection[];
  fetchConnections: (personId: string) => Promise<void>;
  getConnectionsForPerson: (personId: string) => Connection[];
}

const PeopleContext = createContext<PeopleContextType | undefined>(undefined);

export const PeopleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { selectedPeopleIdsForDeletion, clearPeopleSelectionForDeletion, setIsProcessing } = useUI();
  const { toast } = useToast();

  const [people, setPeople] = useState<Person[]>([]);
  const [isLoadingAllUserPeople, setIsLoadingAllUserPeople] = useState(false);
  const [sortOption, setSortOption] = useState<PeopleSortOptionValue>('createdAt_desc');
  const [searchParams, setSearchParams] = useState<AdvancedSearchParams>({
    ageRange: { min: null, max: null },
    hobbies: [],
    hasConnections: null,
    connectionTypes: [],
  });

  const fetchAllUserPeople = useCallback(async () => {
    if (!currentUser?.uid) return;

    setIsLoadingAllUserPeople(true);
    try {
      const peopleQuery = query(
        collection(db, 'people'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(peopleQuery);
      const people: Person[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // --- Data Compatibility Patch ---
        // If faceAppearances doesn't exist, try to create it from the legacy `appearances` field.
        if (!data.faceAppearances && Array.isArray(data.appearances) && data.appearances.length > 0) {
          data.faceAppearances = data.appearances;
        }

        people.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as Person);
      });

      setPeople(people);
    } catch (error) {
      console.error('Error fetching people:', error);
      toast({
        title: "エラー",
        description: "人物データの取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAllUserPeople(false);
    }
  }, [currentUser?.uid, toast]);

  const deleteSelectedPeople = useCallback(async () => {
    if (!currentUser?.uid || selectedPeopleIdsForDeletion.length === 0) return;

    try {
      setIsProcessing(true);
      const batch = writeBatch(db);

      for (const personId of selectedPeopleIdsForDeletion) {
        const personRef = doc(db, 'people', personId);
        batch.delete(personRef);
      }

      await batch.commit();
      clearPeopleSelectionForDeletion();
      await fetchAllUserPeople();

      toast({
        title: "削除完了",
        description: `${selectedPeopleIdsForDeletion.length}人の人物を削除しました`,
      });
    } catch (error) {
      console.error('Error deleting people:', error);
      toast({
        title: "エラー",
        description: "人物の削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, selectedPeopleIdsForDeletion, clearPeopleSelectionForDeletion, fetchAllUserPeople, setIsProcessing, toast]);

  const addPerson = async (personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Person | undefined> => {
    if (!currentUser?.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in to add a person.", variant: "destructive" });
      return undefined;
    }

    setIsProcessing(true);
    try {
      const newPerson = await PeopleService.createPerson(personData);
      setPeople(currentPeople => [...currentPeople, newPerson]);
      toast({
        title: "Success",
        description: `${newPerson.name} has been added.`,
      });
      return newPerson;
    } catch (error: any) {
      console.error('Error adding person:', error);
      toast({
        title: "Error",
        description: `Failed to add person: ${error.message}`,
        variant: "destructive",
      });
      return undefined;
    } finally {
      setIsProcessing(false);
    }
  };

  const updatePerson = async (personId: string, updates: UpdatePersonData): Promise<boolean> => {
    setIsProcessing(true);
    try {
      await PeopleService.updatePerson(personId, updates);
      
      setPeople(prevPeople =>
        prevPeople.map(p =>
          p.id === personId ? { ...p, ...updates, updatedAt: new Date() } : p
        )
      );
      
      toast({
        title: "Success",
        description: "Person information has been updated.",
      });
      return true;
    } catch (error: any) {
      console.error('Error updating person:', error);
      toast({
        title: "Error",
        description: `Failed to update person: ${error.message}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const deletePerson = async (personId: string): Promise<boolean> => {
    setIsProcessing(true);
    try {
      await PeopleService.deletePerson(personId);
      setPeople(prevPeople => prevPeople.filter(p => p.id !== personId));
      toast({
        title: "Success",
        description: "Person has been deleted.",
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting person:', error);
      toast({
        title: "Error",
        description: `Failed to delete person: ${error.message}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteMultiplePeople = async (personIds: string[]): Promise<boolean> => {
    if (!currentUser?.uid || personIds.length === 0) return false;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      personIds.forEach(id => {
        const personRef = doc(db, 'people', id);
        batch.delete(personRef);
      });
      await batch.commit();

      setPeople(prev => prev.filter(p => !personIds.includes(p.id)));
      
      toast({
        title: "Success",
        description: `${personIds.length} people have been deleted.`,
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting multiple people:', error);
      toast({
        title: "Error",
        description: `Failed to delete people: ${error.message}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const getPersonById = useCallback((id: string) => {
    return people.find(person => person.id === id);
  }, [people]);

  const filteredPeople = useMemo(() => {
    let filtered = [...people];

    // Basic search query
    if (searchParams.ageRange.min !== null) {
      filtered = filtered.filter(person => 
        person.age !== undefined && person.age >= searchParams.ageRange.min!
      );
    }

    if (searchParams.ageRange.max !== null) {
      filtered = filtered.filter(person => 
        person.age !== undefined && person.age <= searchParams.ageRange.max!
      );
    }

    if (searchParams.hobbies.length > 0) {
      filtered = filtered.filter(person => {
        if (!person.hobbies) return false;
        const personHobbies = person.hobbies.toLowerCase();
        return searchParams.hobbies?.some(hobby => 
          personHobbies.includes(hobby.toLowerCase())
        ) || false;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'createdAt_asc':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'createdAt_desc':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return filtered;
  }, [people, searchParams, sortOption]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAllUserPeople();
    }
  }, [currentUser?.uid, fetchAllUserPeople]);

  const value: PeopleContextType = {
    allUserPeople: people,
    setPeople,
    filteredPeople,
    fetchAllUserPeople,
    searchParams,
    setSearchParams,
    sortOption,
    setSortOption,
    addPerson,
    updatePerson,
    deletePerson,
    deleteMultiplePeople,
    getPersonById,
    isLoading: isLoadingAllUserPeople,
    error: null,
    selectedForMerge: [],
    toggleMergeSelection: () => {},
    clearMergeSelection: () => {},
    selectedForDeletion: [],
    toggleDeletionSelection: () => {},
    clearDeletionSelection: () => {},
    isDeleting: false,
    connections: [],
    fetchConnections: async () => {},
    getConnectionsForPerson: () => [],
  };

  return (
    <PeopleContext.Provider value={value}>
      {children}
    </PeopleContext.Provider>
  );
};

export const usePeople = () => {
  const context = useContext(PeopleContext);
  if (context === undefined) {
    throw new Error('usePeople must be used within a PeopleProvider');
  }
  return context;
};