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
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import type { Person, AdvancedSearchParams } from '@/types';
import type { EditPersonFormData } from '@/components/features/EditPersonDialog';
import { useToast } from "@/hooks/use-toast";

export type PeopleSortOptionValue = 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc';

interface PeopleContextType {
  allUserPeople: Person[];
  isLoadingAllUserPeople: boolean;
  peopleSortOption: PeopleSortOptionValue;
  peopleSearchQuery: string;
  peopleCompanyFilter: string | null;
  filteredPeople: Person[];
  advancedSearchParams: AdvancedSearchParams;
  availableHobbies: string[];
  availableConnectionTypes: string[];

  fetchAllUserPeople: () => Promise<void>;
  updateGlobalPersonDetails: (personId: string, details: EditPersonFormData) => Promise<boolean>;
  deleteSelectedPeople: () => Promise<void>;
  setPeopleSortOption: (option: PeopleSortOptionValue) => void;
  setPeopleSearchQuery: (query: string) => void;
  setPeopleCompanyFilter: (company: string | null) => void;
  getUniqueCompanies: () => string[];
  setAdvancedSearchParams: (params: AdvancedSearchParams) => void;
  clearAllSearchFilters: () => void;
  getAvailableHobbies: () => string[];
  getAvailableConnectionTypes: () => string[];
}

const PeopleContext = createContext<PeopleContextType | undefined>(undefined);

export const PeopleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { selectedPeopleIdsForDeletion, clearPeopleSelectionForDeletion, setIsProcessing } = useUI();
  const { toast } = useToast();

  const [allUserPeople, setAllUserPeople] = useState<Person[]>([]);
  const [isLoadingAllUserPeople, setIsLoadingAllUserPeople] = useState(false);
  const [peopleSortOption, setPeopleSortOption] = useState<PeopleSortOptionValue>('createdAt_desc');
  const [peopleSearchQuery, setPeopleSearchQuery] = useState('');
  const [peopleCompanyFilter, setPeopleCompanyFilter] = useState<string | null>(null);
  const [advancedSearchParams, setAdvancedSearchParams] = useState<AdvancedSearchParams>({
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

      setAllUserPeople(people);
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

  const updateGlobalPersonDetails = useCallback(async (
    personId: string, 
    details: EditPersonFormData
  ): Promise<boolean> => {
    if (!currentUser?.uid) return false;

    try {
      setIsProcessing(true);
      const personRef = doc(db, 'people', personId);
      
      await updateDoc(personRef, {
        ...details,
        updatedAt: Timestamp.fromDate(new Date()),
      });

      await fetchAllUserPeople();
      
      toast({
        title: "更新完了",
        description: "人物情報を更新しました",
      });
      
      return true;
    } catch (error) {
      console.error('Error updating person:', error);
      toast({
        title: "エラー",
        description: "人物情報の更新に失敗しました",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, fetchAllUserPeople, setIsProcessing, toast]);

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

  const getUniqueCompanies = useCallback(() => {
    const companies = allUserPeople
      .map(person => person.company)
      .filter((company): company is string => Boolean(company))
      .filter((company, index, arr) => arr.indexOf(company) === index)
      .sort();
    return companies;
  }, [allUserPeople]);

  const getAvailableHobbies = useCallback(() => {
    const hobbies = allUserPeople
      .flatMap(person => person.hobbies || [])
      .filter((hobby, index, arr) => arr.indexOf(hobby) === index)
      .sort();
    return hobbies;
  }, [allUserPeople]);

  const getAvailableConnectionTypes = useCallback(() => {
    // This would need to be integrated with ConnectionContext
    return ['colleague', 'friend', 'family', 'other'];
  }, []);

  const clearAllSearchFilters = useCallback(() => {
    setPeopleSearchQuery('');
    setPeopleCompanyFilter(null);
    setAdvancedSearchParams({
      ageRange: { min: null, max: null },
      hobbies: [],
      hasConnections: null,
      connectionTypes: [],
    });
  }, []);

  // Filtered people calculation
  const filteredPeople = useMemo(() => {
    let filtered = [...allUserPeople];

    // Basic search query
    if (peopleSearchQuery) {
      const query = peopleSearchQuery.toLowerCase();
      filtered = filtered.filter(person => 
        person.name?.toLowerCase().includes(query) ||
        person.company?.toLowerCase().includes(query) ||
        person.notes?.toLowerCase().includes(query)
      );
    }

    // Company filter
    if (peopleCompanyFilter) {
      filtered = filtered.filter(person => person.company === peopleCompanyFilter);
    }

    // Advanced search filters
    if (advancedSearchParams.ageRange.min !== null) {
      filtered = filtered.filter(person => 
        person.age !== undefined && person.age >= advancedSearchParams.ageRange.min!
      );
    }

    if (advancedSearchParams.ageRange.max !== null) {
      filtered = filtered.filter(person => 
        person.age !== undefined && person.age <= advancedSearchParams.ageRange.max!
      );
    }

    if (advancedSearchParams.hobbies.length > 0) {
      filtered = filtered.filter(person => {
        if (!person.hobbies) return false;
        const personHobbies = person.hobbies.toLowerCase();
        return advancedSearchParams.hobbies?.some(hobby => 
          personHobbies.includes(hobby.toLowerCase())
        ) || false;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (peopleSortOption) {
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
  }, [allUserPeople, peopleSearchQuery, peopleCompanyFilter, advancedSearchParams, peopleSortOption]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAllUserPeople();
    }
  }, [currentUser?.uid, fetchAllUserPeople]);

  const value: PeopleContextType = {
    allUserPeople,
    isLoadingAllUserPeople,
    peopleSortOption,
    peopleSearchQuery,
    peopleCompanyFilter,
    filteredPeople,
    advancedSearchParams,
    availableHobbies: getAvailableHobbies(),
    availableConnectionTypes: getAvailableConnectionTypes(),
    fetchAllUserPeople,
    updateGlobalPersonDetails,
    deleteSelectedPeople,
    setPeopleSortOption,
    setPeopleSearchQuery,
    setPeopleCompanyFilter,
    getUniqueCompanies,
    setAdvancedSearchParams,
    clearAllSearchFilters,
    getAvailableHobbies,
    getAvailableConnectionTypes,
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