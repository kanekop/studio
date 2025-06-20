import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  DocumentData,
  Query,
  Unsubscribe,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useAsyncOperation } from './useAsyncOperation';

interface UseFirestoreSyncOptions {
  realtime?: boolean;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
  autoFetch?: boolean;
}

interface FirestoreDocument {
  id: string;
  [key: string]: any;
}

interface UseFirestoreSyncReturn<T extends FirestoreDocument> {
  documents: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addDocument: (data: Omit<T, 'id'>) => Promise<string | null>;
  updateDocument: (id: string, data: Partial<Omit<T, 'id'>>) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
  getDocument: (id: string) => Promise<T | null>;
}

export const useFirestoreSync = <T extends FirestoreDocument>(
  collectionName: string,
  options: UseFirestoreSyncOptions = {}
): UseFirestoreSyncReturn<T> => {
  const { currentUser } = useAuth();
  const {
    realtime = false,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    limitCount,
    autoFetch = true,
  } = options;

  const [documents, setDocuments] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const mountedRef = useRef<boolean>(true);

  const buildQuery = useCallback((): Query<DocumentData> | null => {
    if (!currentUser?.uid) return null;

    const constraints: QueryConstraint[] = [
      where('userId', '==', currentUser.uid)
    ];

    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection));
    }

    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    return query(collection(db, collectionName), ...constraints);
  }, [collectionName, currentUser?.uid, orderByField, orderDirection, limitCount]);

  const processDocuments = useCallback((docs: any[]): T[] => {
    return docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to Dates
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as T;
    });
  }, []);

  const fetchDocuments = useCallback(async (): Promise<void> => {
    const queryRef = buildQuery();
    if (!queryRef) {
      setDocuments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const querySnapshot = await getDocs(queryRef);
      const docs = processDocuments(querySnapshot.docs);
      
      if (mountedRef.current) {
        setDocuments(docs);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setError(error);
        setDocuments([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [buildQuery, processDocuments]);

  const setupRealtimeListener = useCallback((): void => {
    const queryRef = buildQuery();
    if (!queryRef) return;

    setIsLoading(true);
    setError(null);

    unsubscribeRef.current = onSnapshot(
      queryRef,
      (querySnapshot) => {
        if (mountedRef.current) {
          const docs = processDocuments(querySnapshot.docs);
          setDocuments(docs);
          setIsLoading(false);
        }
      },
      (err) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    );
  }, [buildQuery, processDocuments]);

  // Add document operation
  const addDocumentOperation = useCallback(async (data: Omit<T, 'id'>): Promise<string> => {
    if (!currentUser?.uid) {
      throw new Error('ユーザーがログインしていません');
    }

    const docData = {
      ...data,
      userId: currentUser.uid,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await addDoc(collection(db, collectionName), docData);
    return docRef.id;
  }, [collectionName, currentUser?.uid]);

  // Update document operation
  const updateDocumentOperation = useCallback(async (id: string, data: Partial<Omit<T, 'id'>>): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }, [collectionName]);

  // Delete document operation
  const deleteDocumentOperation = useCallback(async (id: string): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  }, [collectionName]);

  // Get single document
  const getDocumentOperation = useCallback(async (id: string): Promise<T | null> => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as T;
  }, [collectionName]);

  const { execute: addDocument } = useAsyncOperation(addDocumentOperation);
  const { execute: updateDocument } = useAsyncOperation(updateDocumentOperation);
  const { execute: deleteDocument } = useAsyncOperation(deleteDocumentOperation);
  const { execute: getDocument } = useAsyncOperation(getDocumentOperation);

  // Wrapper functions that handle errors and return appropriate values
  const addDocumentWrapper = useCallback(async (data: Omit<T, 'id'>): Promise<string | null> => {
    try {
      const id = await addDocument(data);
      if (!realtime) {
        await fetchDocuments();
      }
      return id;
    } catch (error) {
      console.error('Error adding document:', error);
      return null;
    }
  }, [addDocument, realtime, fetchDocuments]);

  const updateDocumentWrapper = useCallback(async (id: string, data: Partial<Omit<T, 'id'>>): Promise<boolean> => {
    try {
      await updateDocument(id, data);
      if (!realtime) {
        await fetchDocuments();
      }
      return true;
    } catch (error) {
      console.error('Error updating document:', error);
      return false;
    }
  }, [updateDocument, realtime, fetchDocuments]);

  const deleteDocumentWrapper = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteDocument(id);
      if (!realtime) {
        await fetchDocuments();
      }
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }, [deleteDocument, realtime, fetchDocuments]);

  const getDocumentWrapper = useCallback(async (id: string): Promise<T | null> => {
    try {
      return await getDocument(id);
    } catch (error) {
      console.error('Error getting document:', error);
      return null;
    }
  }, [getDocument]);

  // Effect to setup listeners or fetch data
  useEffect(() => {
    mountedRef.current = true;

    if (currentUser?.uid && autoFetch) {
      if (realtime) {
        setupRealtimeListener();
      } else {
        fetchDocuments();
      }
    } else {
      setDocuments([]);
      setError(null);
      setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser?.uid, autoFetch, realtime, setupRealtimeListener, fetchDocuments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    documents,
    isLoading,
    error,
    refetch: fetchDocuments,
    addDocument: addDocumentWrapper,
    updateDocument: updateDocumentWrapper,
    deleteDocument: deleteDocumentWrapper,
    getDocument: getDocumentWrapper,
  };
};