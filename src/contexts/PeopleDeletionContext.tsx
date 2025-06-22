'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  writeBatch, 
  doc, 
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
import { Person } from '@/shared/types';
import { useToast } from '@/hooks/use-toast';

interface PeopleDeletionContextType {
  selectedPeopleForDeletion: string[];
  isProcessing: boolean;
  
  togglePersonSelectionForDeletion: (personId: string) => void;
  clearDeletionSelection: () => void;
  deleteSelectedPeople: () => Promise<void>;
  deleteSinglePerson: (personId: string) => Promise<void>;
  getSelectedPeopleData: () => Person[];
}

const PeopleDeletionContext = createContext<PeopleDeletionContextType | undefined>(undefined);

interface PeopleDeletionProviderProps {
  children: ReactNode;
}

export const PeopleDeletionProvider: React.FC<PeopleDeletionProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const { people, setPeople } = usePeople();
  const { fetchAllUserConnections } = useConnections();
  const { toast } = useToast();
  
  const [selectedPeopleForDeletion, setSelectedPeopleForDeletion] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const togglePersonSelectionForDeletion = useCallback((personId: string): void => {
    setSelectedPeopleForDeletion(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  }, []);

  const clearDeletionSelection = useCallback((): void => {
    setSelectedPeopleForDeletion([]);
  }, []);

  const getSelectedPeopleData = useCallback((): Person[] => {
    return people.filter(person => selectedPeopleForDeletion.includes(person.id));
  }, [people, selectedPeopleForDeletion]);

  const deletePeopleWithCleanup = useCallback(async (peopleIds: string[]): Promise<void> => {
    if (!currentUser?.uid || peopleIds.length === 0) {
      return;
    }

    const batch = writeBatch(db);
    const imagesToDelete: string[] = [];

    try {
      // 削除対象の人物データを取得
      const peopleToDelete = people.filter(person => peopleIds.includes(person.id));

      // 関連する画像パスを収集
      peopleToDelete.forEach(person => {
        if (person.primaryFaceAppearancePath) {
          imagesToDelete.push(person.primaryFaceAppearancePath);
        }
        person.faceAppearances?.forEach(appearance => {
          if (appearance.faceImageStoragePath) {
            imagesToDelete.push(appearance.faceImageStoragePath);
          }
        });
      });

      // 人物ドキュメントを削除
      peopleIds.forEach(personId => {
        const personRef = doc(db, 'people', personId);
        batch.delete(personRef);
      });

      // 関連する接続を削除
      const connectionsQuery = query(
        collection(db, 'connections'),
        where('userId', '==', currentUser.uid)
      );
      
      const connectionsSnapshot = await getDocs(connectionsQuery);
      
      connectionsSnapshot.forEach((connectionDoc) => {
        const connectionData = connectionDoc.data();
        const shouldDelete = peopleIds.includes(connectionData.fromPersonId) || 
                           peopleIds.includes(connectionData.toPersonId);
        
        if (shouldDelete) {
          batch.delete(doc(db, 'connections', connectionDoc.id));
        }
      });

      // バッチ実行
      await batch.commit();

      // Storage から画像を削除（非同期で実行、エラーが発生しても処理を続行）
      const deleteImagePromises = imagesToDelete.map(async (imagePath) => {
        try {
          const imageRef = storageRef(storage, imagePath);
          await deleteObject(imageRef);
        } catch (error) {
          console.warn(`画像の削除に失敗: ${imagePath}`, error);
          // 画像削除の失敗は致命的ではないので、エラーをログに記録するだけ
        }
      });

      // 画像削除を並列実行（失敗しても処理を続行）
      await Promise.allSettled(deleteImagePromises);

      // ローカルデータを更新
      await setPeople(people.filter(p => !peopleIds.includes(p.id)));
      await fetchAllUserConnections();

    } catch (error) {
      console.error('人物削除エラー:', error);
      throw error;
    }
  }, [currentUser?.uid, people, setPeople, fetchAllUserConnections]);

  const deleteSelectedPeople = useCallback(async (): Promise<void> => {
    if (selectedPeopleForDeletion.length === 0) {
      return;
    }

    setIsProcessing(true);
    try {
      await deletePeopleWithCleanup(selectedPeopleForDeletion);
      
      setSelectedPeopleForDeletion([]);
      
      toast({
        title: "削除完了",
        description: `${selectedPeopleForDeletion.length}人の人物を削除しました`,
      });
    } catch (error) {
      console.error('選択された人物の削除エラー:', error);
      toast({
        title: "エラー",
        description: "人物の削除に失敗しました",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPeopleForDeletion, deletePeopleWithCleanup, toast]);

  const deleteSinglePerson = useCallback(async (personId: string): Promise<void> => {
    setIsProcessing(true);
    try {
      await deletePeopleWithCleanup([personId]);
      
      // 選択リストからも削除
      setSelectedPeopleForDeletion(prev => prev.filter(id => id !== personId));
      
      const person = people.find(p => p.id === personId);
      toast({
        title: "削除完了",
        description: `${person?.name || '人物'}を削除しました`,
      });
    } catch (error) {
      console.error('単一人物の削除エラー:', error);
      toast({
        title: "エラー",
        description: "人物の削除に失敗しました",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [deletePeopleWithCleanup, people, toast]);

  const value: PeopleDeletionContextType = {
    selectedPeopleForDeletion,
    isProcessing,
    togglePersonSelectionForDeletion,
    clearDeletionSelection,
    deleteSelectedPeople,
    deleteSinglePerson,
    getSelectedPeopleData,
  };

  return (
    <PeopleDeletionContext.Provider value={value}>
      {children}
    </PeopleDeletionContext.Provider>
  );
};

export const usePeopleDeletion = (): PeopleDeletionContextType => {
  const context = useContext(PeopleDeletionContext);
  if (context === undefined) {
    throw new Error('usePeopleDeletion must be used within a PeopleDeletionProvider');
  }
  return context;
};