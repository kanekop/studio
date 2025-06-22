import { useMemo } from 'react';
import { Person } from '@/shared/types';
import { PeopleService, PersonSearchCriteria } from '@/domain/services';
import { SortOption } from '@/shared/constants';

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