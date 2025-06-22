import { useState, useCallback } from 'react';
import { usePeople } from '@/contexts/PeopleContext';
import { useUI } from '@/contexts/UIContext';
import { useAsyncOperation } from './useAsyncOperation';
import { useErrorHandler } from './useErrorHandler';
import { suggestPeopleMerges, type SuggestMergeInput, type SuggestMergeOutput } from '@/ai/flows/suggest-people-merges-flow';
import type { SuggestedMergePair, FieldMergeChoices } from '@/shared/types';
import { useToast } from './use-toast';
import { runTransaction, doc, writeBatch, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

interface UseMergeFeaturesReturn {
  mergeSuggestions: SuggestedMergePair[];
  isLoadingMergeSuggestions: boolean;
  fetchMergeSuggestions: () => Promise<void>;
  clearMergeSuggestions: () => void;
  performGlobalPeopleMerge: (
    targetPersonId: string,
    sourcePersonId: string,
    fieldChoices: FieldMergeChoices,
    chosenPrimaryPhotoPath: string | null
  ) => Promise<void>;
  isMerging: boolean;
}

export const useMergeFeatures = (): UseMergeFeaturesReturn => {
  const { currentUser } = useAuth();
  const { allUserPeople, fetchAllUserPeople } = usePeople();
  const { setIsProcessing } = useUI();
  const { handleError } = useErrorHandler();
  const { toast } = useToast();

  const [mergeSuggestions, setMergeSuggestions] = useState<SuggestedMergePair[]>([]);

  // Async operations
  const fetchSuggestionsOperation = useCallback(async () => {
    if (!currentUser?.uid || allUserPeople.length === 0) {
      setMergeSuggestions([]);
      return;
    }

    const input: SuggestMergeInput = allUserPeople.map(person => ({
      id: person.id,
      name: person.name || '',
      company: person.company || '',
      hobbies: person.hobbies || '',
    }));

    try {
      const result: SuggestMergeOutput = await suggestPeopleMerges(input);
      setMergeSuggestions(result.filter(suggestion => 
        suggestion.person1Id && suggestion.person2Id && suggestion.reason
      ) as SuggestedMergePair[]);
      
      toast({
        title: "マージ候補を取得",
        description: `${result?.length || 0}件のマージ候補が見つかりました`,
      });
    } catch (error) {
      console.error('Error fetching merge suggestions:', error);
      setMergeSuggestions([]);
      throw error;
    }
  }, [currentUser?.uid, allUserPeople, toast]);

  const mergeOperation = useCallback(async (
    targetPersonId: string,
    sourcePersonId: string,
    fieldChoices: FieldMergeChoices,
    chosenPrimaryPhotoPath: string | null
  ) => {
    if (!currentUser?.uid) {
      throw new Error('User not authenticated');
    }

    await runTransaction(db, async (transaction) => {
      const targetRef = doc(db, 'people', targetPersonId);
      const sourceRef = doc(db, 'people', sourcePersonId);

      const targetDoc = await transaction.get(targetRef);
      const sourceDoc = await transaction.get(sourceRef);

      if (!targetDoc.exists() || !sourceDoc.exists()) {
        throw new Error('One or both people not found');
      }

      const targetData = targetDoc.data();
      const sourceData = sourceDoc.data();

      // Merge data based on field choices
      const mergedData: any = { ...targetData };

      Object.entries(fieldChoices).forEach(([field, choice]) => {
        if (choice === 'source' && sourceData[field] !== undefined) {
          mergedData[field] = sourceData[field];
        } else if (choice === 'merge') {
          // Handle merge logic for specific fields
          if (field === 'faceAppearances') {
            mergedData[field] = [
              ...(targetData[field] || []),
              ...(sourceData[field] || [])
            ];
          } else if (field === 'rosterIds') {
            const targetIds = targetData[field] || [];
            const sourceIds = sourceData[field] || [];
            mergedData[field] = [...new Set([...targetIds, ...sourceIds])];
          } else {
            // For text fields, concatenate with separator
            const targetValue = targetData[field] || '';
            const sourceValue = sourceData[field] || '';
            if (targetValue && sourceValue) {
              mergedData[field] = `${targetValue}; ${sourceValue}`;
            } else {
              mergedData[field] = targetValue || sourceValue;
            }
          }
        }
        // 'target' choice means keep target data (no change needed)
      });

      // Set primary photo if chosen
      if (chosenPrimaryPhotoPath) {
        mergedData.primaryFaceAppearancePath = chosenPrimaryPhotoPath;
      }

      // Update timestamps
      mergedData.updatedAt = Timestamp.fromDate(new Date());

      // Update target person with merged data
      transaction.update(targetRef, mergedData);

      // Delete source person
      transaction.delete(sourceRef);
    });

    // Refresh people list
    await fetchAllUserPeople();

    toast({
      title: "マージ完了",
      description: "人物の統合が完了しました",
    });
  }, [currentUser?.uid, fetchAllUserPeople, toast]);

  const { execute: fetchMergeSuggestions, isLoading: isLoadingMergeSuggestions } = useAsyncOperation(fetchSuggestionsOperation);
  const { execute: performGlobalPeopleMerge, isLoading: isMerging } = useAsyncOperation(mergeOperation);

  const clearMergeSuggestions = useCallback(() => {
    setMergeSuggestions([]);
  }, []);

  // Wrapper functions with error handling
  const fetchMergeSuggestionsWithErrorHandling = useCallback(async () => {
    try {
      setIsProcessing(true);
      await fetchMergeSuggestions();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to fetch merge suggestions'));
    } finally {
      setIsProcessing(false);
    }
  }, [fetchMergeSuggestions, setIsProcessing, handleError]);

  const performMergeWithErrorHandling = useCallback(async (
    targetPersonId: string,
    sourcePersonId: string,
    fieldChoices: FieldMergeChoices,
    chosenPrimaryPhotoPath: string | null
  ) => {
    try {
      setIsProcessing(true);
      await performGlobalPeopleMerge(targetPersonId, sourcePersonId, fieldChoices, chosenPrimaryPhotoPath);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to merge people'));
      throw error; // Re-throw so calling code can handle if needed
    } finally {
      setIsProcessing(false);
    }
  }, [performGlobalPeopleMerge, setIsProcessing, handleError]);

  return {
    mergeSuggestions,
    isLoadingMergeSuggestions,
    fetchMergeSuggestions: fetchMergeSuggestionsWithErrorHandling,
    clearMergeSuggestions,
    performGlobalPeopleMerge: performMergeWithErrorHandling,
    isMerging,
  };
};