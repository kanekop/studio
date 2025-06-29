import { useMemo, useState, useEffect } from 'react';
import { Person } from '@/shared/types';
import { PeopleService, PersonSearchCriteria } from '@/domain/services';
import { SortOption } from '@/shared/constants';
import { useRecentlySelectedPeople } from '@/hooks/useRecentlySelectedPeople';

interface UsePeopleSearchOptions {
  query?: string;
  company?: string;
  rosterId?: string;
  sortBy?: SortOption;
}

/**
 * Custom hook for searching and filtering people using domain services
 * Bridges the domain layer with React components
 */
export function usePeopleSearch(
  people: Person[],
  options: UsePeopleSearchOptions
): {
  filteredPeople: Person[];
  companies: string[];
  statistics: {
    totalResults: number;
    uniqueCompanies: number;
  };
} {
  const { query, company, rosterId, sortBy = 'createdAt_desc' } = options;
  const { sortPeopleByRecency } = useRecentlySelectedPeople();

  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (!query && !company && !rosterId) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const searchCriteria: PersonSearchCriteria = {
        query,
        company,
        rosterId,
        rostersCount: 0, // Default value
      };
      const results = PeopleService.searchPeople(people, searchCriteria);
      setSearchResults(results);
      setIsSearching(false);
    };

    search();
  }, [query, company, rosterId]);

  // Get unique companies for filtering
  const companies = useMemo(() => 
    PeopleService.getUniqueCompanies(people),
    [people]
  );

  // Apply search and filters
  const filteredPeople = useMemo(() => {
    const searchCriteria: PersonSearchCriteria = {
      query,
      company,
      rosterId,
      rostersCount: 0, // Default value
    };

    // Search and filter
    let results = PeopleService.searchPeople(people, searchCriteria);

    // Sort
    if (sortBy.startsWith('name_') || sortBy.startsWith('createdAt_')) {
      results = PeopleService.sortPeople(
        results, 
        sortBy as 'name_asc' | 'name_desc' | 'createdAt_asc' | 'createdAt_desc'
      );
    }

    // If no specific sort is applied or searching, prioritize recently selected people
    if (!query && !company && sortBy === 'createdAt_desc') {
      results = sortPeopleByRecency(results);
    }

    return results;
  }, [people, query, company, rosterId, sortBy]);

  // Calculate statistics
  const statistics = useMemo(() => ({
    totalResults: filteredPeople.length,
    uniqueCompanies: new Set(filteredPeople.map(p => p.company).filter(Boolean)).size,
  }), [filteredPeople]);

  return {
    filteredPeople,
    companies,
    statistics,
  };
}