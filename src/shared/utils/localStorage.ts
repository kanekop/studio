import type { StoredAppState } from '@/shared/types';
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = 'faceRosterData';
const MAX_STORAGE_ATTEMPTS = 3; // Max attempts to save if reducing quality/size (not implemented yet, but for future)

export const loadStateFromLocalStorage = (): StoredAppState | null => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return null;
    }
    return JSON.parse(serializedState) as StoredAppState;
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
    toast({
      title: "Error Loading Data",
      description: "Could not load previously saved data. It might be corrupted.",
      variant: "destructive",
    });
    return null;
  }
};

export const saveStateToLocalStorage = (state: StoredAppState): boolean => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
    return true;
  } catch (error: any) {
    console.error("Error saving state to localStorage:", error);
    if (error.name === 'QuotaExceededError') {
      toast({
        title: "Storage Limit Reached",
        description: "Browser storage is full. Current work won't be saved. Clear some space or other site data.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error Saving Data",
        description: "Could not save your work to the browser.",
        variant: "destructive",
      });
    }
    return false;
  }
};

export const clearStateFromLocalStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing state from localStorage:", error);
    toast({
      title: "Error Clearing Data",
      description: "Could not clear saved data from the browser.",
      variant: "destructive",
    });
  }
};
