'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { Person, Connection, AdvancedSearchParams } from '@/types';

interface SearchFilterContextType {
  peopleSearchQuery: string;
  peopleCompanyFilter: string | null;
  advancedSearchParams: AdvancedSearchParams;
  
  setPeopleSearchQuery: (query: string) => void;
  setPeopleCompanyFilter: (company: string | null) => void;
  setAdvancedSearchParams: (params: AdvancedSearchParams) => void;
  clearAllSearchFilters: () => void;
  
  getUniqueCompanies: (people: Person[]) => string[];
  getAvailableHobbies: (people: Person[]) => string[];
  getAvailableConnectionTypes: (connections: Connection[]) => string[];
  
  filterPeople: (
    people: Person[], 
    connections?: Connection[]
  ) => Person[];
}

const SearchFilterContext = createContext<SearchFilterContextType | undefined>(undefined);

interface SearchFilterProviderProps {
  children: ReactNode;
}

const initialAdvancedSearchParams: AdvancedSearchParams = {
  ageRange: { min: null, max: null },
  hobbies: [],
  connectionTypes: [],
  hasConnections: null,
};

export const SearchFilterProvider: React.FC<SearchFilterProviderProps> = ({ children }) => {
  const [peopleSearchQuery, setPeopleSearchQuery] = useState('');
  const [peopleCompanyFilter, setPeopleCompanyFilter] = useState<string | null>(null);
  const [advancedSearchParams, setAdvancedSearchParams] = useState<AdvancedSearchParams>(initialAdvancedSearchParams);

  const clearAllSearchFilters = (): void => {
    setPeopleSearchQuery('');
    setPeopleCompanyFilter(null);
    setAdvancedSearchParams(initialAdvancedSearchParams);
  };

  const getUniqueCompanies = (people: Person[]): string[] => {
    return Array.from(
      new Set(
        people
          .map(person => person.company?.trim())
          .filter((company): company is string => Boolean(company))
      )
    ).sort();
  };

  const getAvailableHobbies = (people: Person[]): string[] => {
    const hobbiesSet = new Set<string>();
    
    people.forEach(person => {
      if (person.hobbies) {
        person.hobbies.split(',').forEach(hobby => {
          const trimmed = hobby.trim();
          if (trimmed) {
            hobbiesSet.add(trimmed);
          }
        });
      }
    });
    
    return Array.from(hobbiesSet).sort();
  };

  const getAvailableConnectionTypes = (connections: Connection[]): string[] => {
    const typesSet = new Set<string>();
    
    connections.forEach(connection => {
      if (connection.types) {
        connection.types.forEach(type => {
          if (type.trim()) {
            typesSet.add(type.trim());
          }
        });
      }
    });
    
    return Array.from(typesSet).sort();
  };

  const filterPeople = (people: Person[], connections: Connection[] = []): Person[] => {
    return people.filter(person => {
      // 基本検索クエリ
      if (peopleSearchQuery.trim()) {
        const query = peopleSearchQuery.toLowerCase();
        const matchesBasicSearch = 
          person.name?.toLowerCase().includes(query) ||
          person.company?.toLowerCase().includes(query) ||
          person.hobbies?.toLowerCase().includes(query) ||
          person.notes?.toLowerCase().includes(query);
        
        if (!matchesBasicSearch) return false;
      }

      // 会社フィルター
      if (peopleCompanyFilter && peopleCompanyFilter !== 'all') {
        if (person.company !== peopleCompanyFilter) return false;
      }

      // 高度な検索パラメータ
      const params = advancedSearchParams;

      // 年齢範囲
      if (params.ageRange.min !== null && person.age !== undefined && person.age < params.ageRange.min) {
        return false;
      }
      if (params.ageRange.max !== null && person.age !== undefined && person.age > params.ageRange.max) {
        return false;
      }

      // 趣味
      if (params.hobbies.length > 0) {
        const personHobbies = person.hobbies 
          ? person.hobbies.split(',').map(h => h.trim().toLowerCase())
          : [];
        
        const hasMatchingHobby = params.hobbies.some(hobby => 
          personHobbies.some(ph => ph.includes(hobby.toLowerCase()))
        );
        
        if (!hasMatchingHobby) return false;
      }

      // 接続タイプ
      if (params.connectionTypes.length > 0) {
        const personConnections = connections.filter(
          conn => conn.fromPersonId === person.id || conn.toPersonId === person.id
        );
        
        const hasMatchingConnectionType = params.connectionTypes.some(type =>
          personConnections.some(conn => 
            conn.types?.some(t => t.toLowerCase().includes(type.toLowerCase()))
          )
        );
        
        if (!hasMatchingConnectionType) return false;
      }

      // 接続の有無
      if (params.hasConnections !== null) {
        const hasConnections = connections.some(
          conn => conn.fromPersonId === person.id || conn.toPersonId === person.id
        );
        
        if (params.hasConnections && !hasConnections) return false;
        if (!params.hasConnections && hasConnections) return false;
      }

      // 基本的なフィルタリングのみ実装

      return true;
    });
  };

  const value: SearchFilterContextType = {
    peopleSearchQuery,
    peopleCompanyFilter,
    advancedSearchParams,
    setPeopleSearchQuery,
    setPeopleCompanyFilter,
    setAdvancedSearchParams,
    clearAllSearchFilters,
    getUniqueCompanies,
    getAvailableHobbies,
    getAvailableConnectionTypes,
    filterPeople,
  };

  return (
    <SearchFilterContext.Provider value={value}>
      {children}
    </SearchFilterContext.Provider>
  );
};

export const useSearchFilter = (): SearchFilterContextType => {
  const context = useContext(SearchFilterContext);
  if (context === undefined) {
    throw new Error('useSearchFilter must be used within a SearchFilterProvider');
  }
  return context;
};