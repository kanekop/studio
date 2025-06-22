"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  addDoc,
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/config';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import type { Connection } from '@/shared/types';
import { useToast } from "@/hooks/use-toast";

interface ConnectionContextType {
  allUserConnections: Connection[];
  isLoadingAllUserConnections: boolean;

  fetchAllUserConnections: () => Promise<void>;
  addConnection: (
    fromPersonId: string, 
    toPersonId: string, 
    types: string[], 
    reasons: string[], 
    strength?: number, 
    notes?: string
  ) => Promise<string | null>;
  updateConnection: (
    connectionId: string, 
    updates: Partial<Omit<Connection, 'id' | 'fromPersonId' | 'toPersonId' | 'createdAt'>>
  ) => Promise<boolean>;
  deleteConnection: (connectionId: string) => Promise<boolean>;
  getConnectionsForPerson: (personId: string) => Connection[];
  getConnectionTypes: () => string[];
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { setIsProcessing } = useUI();
  const { toast } = useToast();

  const [allUserConnections, setAllUserConnections] = useState<Connection[]>([]);
  const [isLoadingAllUserConnections, setIsLoadingAllUserConnections] = useState(false);

  const fetchAllUserConnections = useCallback(async () => {
    if (!currentUser?.uid) return;

    setIsLoadingAllUserConnections(true);
    try {
      const connectionsQuery = query(
        collection(db, 'connections'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(connectionsQuery);
      const connections: Connection[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        connections.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as Connection);
      });

      setAllUserConnections(connections);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast({
        title: "エラー",
        description: "関係性データの取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAllUserConnections(false);
    }
  }, [currentUser?.uid, toast]);

  const addConnection = useCallback(async (
    fromPersonId: string,
    toPersonId: string,
    types: string[],
    reasons: string[],
    strength: number = 3,
    notes: string = ''
  ): Promise<string | null> => {
    if (!currentUser?.uid) return null;

    try {
      setIsProcessing(true);
      
      const connectionData = {
        userId: currentUser.uid,
        fromPersonId,
        toPersonId,
        types,
        reasons,
        strength,
        notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'connections'), connectionData);
      
      await fetchAllUserConnections();
      
      toast({
        title: "関係性を追加",
        description: "新しい関係性を作成しました",
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding connection:', error);
      toast({
        title: "エラー",
        description: "関係性の追加に失敗しました",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, fetchAllUserConnections, setIsProcessing, toast]);

  const updateConnection = useCallback(async (
    connectionId: string,
    updates: Partial<Omit<Connection, 'id' | 'fromPersonId' | 'toPersonId' | 'createdAt'>>
  ): Promise<boolean> => {
    if (!currentUser?.uid) return false;

    try {
      setIsProcessing(true);
      const connectionRef = doc(db, 'connections', connectionId);
      
      await updateDoc(connectionRef, {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      });

      await fetchAllUserConnections();
      
      toast({
        title: "更新完了",
        description: "関係性を更新しました",
      });
      
      return true;
    } catch (error) {
      console.error('Error updating connection:', error);
      toast({
        title: "エラー",
        description: "関係性の更新に失敗しました",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, fetchAllUserConnections, setIsProcessing, toast]);

  const deleteConnection = useCallback(async (connectionId: string): Promise<boolean> => {
    if (!currentUser?.uid) return false;

    try {
      setIsProcessing(true);
      await deleteDoc(doc(db, 'connections', connectionId));
      
      await fetchAllUserConnections();
      
      toast({
        title: "削除完了",
        description: "関係性を削除しました",
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast({
        title: "エラー",
        description: "関係性の削除に失敗しました",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, fetchAllUserConnections, setIsProcessing, toast]);

  const getConnectionsForPerson = useCallback((personId: string): Connection[] => {
    return allUserConnections.filter(connection => 
      connection.fromPersonId === personId || connection.toPersonId === personId
    );
  }, [allUserConnections]);

  const getConnectionTypes = useCallback((): string[] => {
    const types = allUserConnections
      .flatMap(connection => connection.types || [])
      .filter((type, index, arr) => arr.indexOf(type) === index)
      .sort();
    return types;
  }, [allUserConnections]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAllUserConnections();
    }
  }, [currentUser?.uid, fetchAllUserConnections]);

  const value: ConnectionContextType = {
    allUserConnections,
    isLoadingAllUserConnections,
    fetchAllUserConnections,
    addConnection,
    updateConnection,
    deleteConnection,
    getConnectionsForPerson,
    getConnectionTypes,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnections = () => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnections must be used within a ConnectionProvider');
  }
  return context;
};