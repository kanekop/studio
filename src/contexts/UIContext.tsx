"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

interface UIContextType {
  isLoading: boolean;
  isProcessing: boolean;
  selectedPersonId: string | null;
  globallySelectedPeopleForMerge: string[];
  selectedPeopleIdsForDeletion: string[];
  
  setIsLoading: (loading: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  selectPerson: (id: string | null) => void;
  toggleGlobalPersonSelectionForMerge: (personId: string) => void;
  clearGlobalMergeSelection: () => void;
  togglePersonSelectionForDeletion: (personId: string) => void;
  clearPeopleSelectionForDeletion: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [globallySelectedPeopleForMerge, setGloballySelectedPeopleForMerge] = useState<string[]>([]);
  const [selectedPeopleIdsForDeletion, setSelectedPeopleIdsForDeletion] = useState<string[]>([]);

  const selectPerson = useCallback((id: string | null) => {
    setSelectedPersonId(id);
  }, []);

  const toggleGlobalPersonSelectionForMerge = useCallback((personId: string) => {
    setGloballySelectedPeopleForMerge(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  }, []);

  const clearGlobalMergeSelection = useCallback(() => {
    setGloballySelectedPeopleForMerge([]);
  }, []);

  const togglePersonSelectionForDeletion = useCallback((personId: string) => {
    setSelectedPeopleIdsForDeletion(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  }, []);

  const clearPeopleSelectionForDeletion = useCallback(() => {
    setSelectedPeopleIdsForDeletion([]);
  }, []);

  const value: UIContextType = {
    isLoading,
    isProcessing,
    selectedPersonId,
    globallySelectedPeopleForMerge,
    selectedPeopleIdsForDeletion,
    setIsLoading,
    setIsProcessing,
    selectPerson,
    toggleGlobalPersonSelectionForMerge,
    clearGlobalMergeSelection,
    togglePersonSelectionForDeletion,
    clearPeopleSelectionForDeletion,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};