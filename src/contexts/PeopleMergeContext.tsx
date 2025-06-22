'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  runTransaction, 
  doc, 
  writeBatch, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '@/infrastructure/firebase/config';
import { useAuth } from './AuthContext';
import { usePeople } from './PeopleContext';
import { useConnections } from './ConnectionContext';
import { 
  SuggestedMergePair, 
  FieldMergeChoices, 
  Person 
} from '@/shared/types';
import { useToast } from '@/hooks/use-toast';
import { suggestPeopleMerges } from '@/ai/flows/suggest-people-merges-flow';

interface PeopleMergeContextType {
  selectedPeopleForMerge: string[];
  mergeSuggestions: SuggestedMergePair[];
  isLoadingMergeSuggestions: boolean;
  isProcessing: boolean;
  
  togglePersonSelectionForMerge: (personId: string) => void;
  clearMergeSelection: () => void;
  performPeopleMerge: (
    targetPersonId: string,
    sourcePersonId: string,
    fieldChoices: FieldMergeChoices,
    chosenPrimaryPhotoPath: string | null
  ) => Promise<void>;
  fetchMergeSuggestions: () => Promise<void>;
  clearMergeSuggestions: () => void;
  getSelectedPeopleData: () => Person[];
}

const PeopleMergeContext = createContext<PeopleMergeContextType | undefined>(undefined);

interface PeopleMergeProviderProps {
  children: ReactNode;
}

export const PeopleMergeProvider: React.FC<PeopleMergeProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const { allUserPeople, fetchAllUserPeople } = usePeople();
  const { fetchAllUserConnections } = useConnections();
  const { toast } = useToast();
  
  const [selectedPeopleForMerge, setSelectedPeopleForMerge] = useState<string[]>([]);
  const [mergeSuggestions, setMergeSuggestions] = useState<SuggestedMergePair[]>([]);
  const [isLoadingMergeSuggestions, setIsLoadingMergeSuggestions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const togglePersonSelectionForMerge = useCallback((personId: string): void => {
    setSelectedPeopleForMerge(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  }, []);

  const clearMergeSelection = useCallback((): void => {
    setSelectedPeopleForMerge([]);
  }, []);

  const getSelectedPeopleData = useCallback((): Person[] => {
    return allUserPeople.filter(person => selectedPeopleForMerge.includes(person.id));
  }, [allUserPeople, selectedPeopleForMerge]);

  const fetchMergeSuggestions = useCallback(async (): Promise<void> => {
    if (!currentUser?.uid || allUserPeople.length < 2) {
      setMergeSuggestions([]);
      return;
    }

    setIsLoadingMergeSuggestions(true);
    try {
      const input = allUserPeople.map(person => ({
        id: person.id,
        name: person.name || '',
        company: person.company || '',
        notes: person.notes || '',
        hobbies: person.hobbies || '',
      }));

      const result = await suggestPeopleMerges(input);
      
      if (result && result.length > 0) {
        setMergeSuggestions(result as SuggestedMergePair[]);
        toast({
          title: "統合候補を取得",
          description: `${result.length}件の統合候補が見つかりました`,
        });
      } else {
        setMergeSuggestions([]);
        toast({
          title: "統合候補なし",
          description: "重複の可能性がある人物は見つかりませんでした",
        });
      }
    } catch (error) {
      console.error('統合候補の取得エラー:', error);
      toast({
        title: "エラー",
        description: "統合候補の取得に失敗しました",
        variant: "destructive",
      });
      setMergeSuggestions([]);
    } finally {
      setIsLoadingMergeSuggestions(false);
    }
  }, [currentUser?.uid, allUserPeople, toast]);

  const clearMergeSuggestions = useCallback((): void => {
    setMergeSuggestions([]);
  }, []);

  const performPeopleMerge = useCallback(async (
    targetPersonId: string,
    sourcePersonId: string,
    fieldChoices: FieldMergeChoices,
    chosenPrimaryPhotoPath: string | null
  ): Promise<void> => {
    if (!currentUser?.uid) {
      throw new Error('ユーザーが認証されていません');
    }

    setIsProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        const targetRef = doc(db, 'people', targetPersonId);
        const sourceRef = doc(db, 'people', sourcePersonId);

        const targetDoc = await transaction.get(targetRef);
        const sourceDoc = await transaction.get(sourceRef);

        if (!targetDoc.exists() || !sourceDoc.exists()) {
          throw new Error('統合対象の人物が見つかりません');
        }

        const targetData = targetDoc.data();
        const sourceData = sourceDoc.data();

        // フィールドをマージ
        const mergedData = {
          ...targetData,
          name: fieldChoices.name || targetData.name,
          company: fieldChoices.company || targetData.company,
          hobbies: fieldChoices.hobbies || targetData.hobbies,
          birthday: fieldChoices.birthday || targetData.birthday,
          firstMet: fieldChoices.firstMet || targetData.firstMet,
          firstMetContext: fieldChoices.firstMetContext || targetData.firstMetContext,
          notes: (fieldChoices as any).notes || targetData.notes,
          primaryFaceAppearancePath: chosenPrimaryPhotoPath || targetData.primaryFaceAppearancePath,
          
          // 顔の出現情報をマージ
          faceAppearances: [
            ...(targetData.faceAppearances || []),
            ...(sourceData.faceAppearances || [])
          ],
          
          // Roster IDsをマージ
          rosterIds: [
            ...(targetData.rosterIds || []),
            ...(sourceData.rosterIds || [])
          ].filter((id, index, arr) => arr.indexOf(id) === index), // 重複削除
          
          updatedAt: new Date(),
        };

        // ターゲット人物を更新
        transaction.update(targetRef, mergedData);

        // ソース人物を削除
        transaction.delete(sourceRef);

        // 関係性のfromPersonIdとtoPersonIdを更新
        const connectionsQuery = query(
          collection(db, 'connections'),
          where('userId', '==', currentUser.uid)
        );
        
        const connectionsSnapshot = await getDocs(connectionsQuery);
        
        connectionsSnapshot.forEach((connectionDoc) => {
          const connectionData = connectionDoc.data();
          let shouldUpdate = false;
          const updates: any = {};

          if (connectionData.fromPersonId === sourcePersonId) {
            updates.fromPersonId = targetPersonId;
            shouldUpdate = true;
          }
          if (connectionData.toPersonId === sourcePersonId) {
            updates.toPersonId = targetPersonId;
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            transaction.update(doc(db, 'connections', connectionDoc.id), updates);
          }
        });
      });

      // 成功した場合、ローカルデータを更新
      await fetchAllUserPeople();
      await fetchAllUserConnections();
      
      // 選択状態をクリア
      setSelectedPeopleForMerge(prev => 
        prev.filter(id => id !== sourcePersonId)
      );

      toast({
        title: "統合完了",
        description: "人物の統合が正常に完了しました",
      });
    } catch (error) {
      console.error('人物統合エラー:', error);
      toast({
        title: "エラー",
        description: "人物の統合に失敗しました",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, fetchAllUserPeople, fetchAllUserConnections, toast]);

  const value: PeopleMergeContextType = {
    selectedPeopleForMerge,
    mergeSuggestions,
    isLoadingMergeSuggestions,
    isProcessing,
    togglePersonSelectionForMerge,
    clearMergeSelection,
    performPeopleMerge,
    fetchMergeSuggestions,
    clearMergeSuggestions,
    getSelectedPeopleData,
  };

  return (
    <PeopleMergeContext.Provider value={value}>
      {children}
    </PeopleMergeContext.Provider>
  );
};

export const usePeopleMerge = (): PeopleMergeContextType => {
  const context = useContext(PeopleMergeContext);
  if (context === undefined) {
    throw new Error('usePeopleMerge must be used within a PeopleMergeProvider');
  }
  return context;
};