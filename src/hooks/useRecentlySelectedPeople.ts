import { useState, useEffect, useCallback } from 'react';
import { Person } from '@/shared/types';

const STORAGE_KEY = 'faceroster_recently_selected_people';
const MAX_RECENT_PEOPLE = 10;

interface RecentPerson {
  personId: string;
  selectedAt: number;
}

export const useRecentlySelectedPeople = () => {
  const [recentPeople, setRecentPeople] = useState<RecentPerson[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentPerson[];
        setRecentPeople(parsed);
      }
    } catch (error) {
      console.warn('Failed to load recently selected people:', error);
    }
  }, []);

  // Save to localStorage whenever recentPeople changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentPeople));
    } catch (error) {
      console.warn('Failed to save recently selected people:', error);
    }
  }, [recentPeople]);

  const addRecentPerson = useCallback((personId: string) => {
    setRecentPeople((prev) => {
      // Remove the person if they already exist
      const filtered = prev.filter((p) => p.personId !== personId);
      
      // Add to the beginning with current timestamp
      const newRecent: RecentPerson = {
        personId,
        selectedAt: Date.now(),
      };
      
      // Keep only the most recent MAX_RECENT_PEOPLE
      const updated = [newRecent, ...filtered].slice(0, MAX_RECENT_PEOPLE);
      
      return updated;
    });
  }, []);

  const getRecentPersonIds = useCallback((): string[] => {
    return recentPeople.map((p) => p.personId);
  }, [recentPeople]);

  const sortPeopleByRecency = useCallback((people: Person[]): Person[] => {
    const recentIds = getRecentPersonIds();
    
    // Create a map for quick lookup of recency order
    const recencyMap = new Map<string, number>();
    recentIds.forEach((id, index) => {
      recencyMap.set(id, index);
    });

    // Sort people: recent ones first, then alphabetically
    return [...people].sort((a, b) => {
      const aRecency = recencyMap.get(a.id);
      const bRecency = recencyMap.get(b.id);

      // Both are recent - sort by recency
      if (aRecency !== undefined && bRecency !== undefined) {
        return aRecency - bRecency;
      }

      // Only a is recent
      if (aRecency !== undefined) {
        return -1;
      }

      // Only b is recent
      if (bRecency !== undefined) {
        return 1;
      }

      // Neither is recent - sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [getRecentPersonIds]);

  const clearRecentPeople = useCallback(() => {
    setRecentPeople([]);
  }, []);

  return {
    recentPeople,
    addRecentPerson,
    getRecentPersonIds,
    sortPeopleByRecency,
    clearRecentPeople,
  };
};