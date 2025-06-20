"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  ref as storageRefStandard, 
  uploadBytes, 
  getDownloadURL, 
  uploadString, 
  StringFormat, 
  deleteObject 
} from 'firebase/storage';
import { 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  collection, 
  serverTimestamp, 
  getDocs, 
  orderBy, 
  getDoc, 
  writeBatch,
  deleteDoc,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db, storage as appFirebaseStorage } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import type { Region, DisplayRegion, ImageSet, EditablePersonInContext, FaceAppearance } from '@/types';
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface RosterContextType {
  imageDataUrl: string | null;
  originalImageStoragePath: string | null;
  originalImageSize: { width: number; height: number } | null;
  drawnRegions: Region[];
  roster: EditablePersonInContext[];
  currentRosterDocId: string | null;
  userRosters: ImageSet[];
  isLoadingUserRosters: boolean;

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  createRosterFromRegions: () => Promise<void>;
  updatePersonDetails: (
    personId: string, 
    details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl' | 'isNew' | 'tempFaceImageDataUri' | 'tempOriginalRegion'>>
  ) => Promise<void>;
  clearAllData: (showToast?: boolean) => void;
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
  fetchUserRosters: () => Promise<void>;
  loadRosterForEditing: (rosterId: string) => Promise<void>;
  deleteRoster: (rosterId: string) => Promise<void>;
}

const RosterContext = createContext<RosterContextType | undefined>(undefined);

async function imageStoragePathToDataURI(path: string): Promise<string | undefined> {
  if (!appFirebaseStorage || !path) return undefined;
  try {
    const fileRef = storageRefStandard(appFirebaseStorage, path);
    const url = await getDownloadURL(fileRef);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image from URL ${url}: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error converting storage path ${path} to data URI:`, error);
    return undefined;
  }
}

export const RosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { setIsProcessing } = useUI();
  const { toast } = useToast();

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [originalImageStoragePath, setOriginalImageStoragePath] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [drawnRegions, setDrawnRegions] = useState<Region[]>([]);
  const [roster, setRoster] = useState<EditablePersonInContext[]>([]);
  const [currentRosterDocId, setCurrentRosterDocId] = useState<string | null>(null);
  const [userRosters, setUserRosters] = useState<ImageSet[]>([]);
  const [isLoadingUserRosters, setIsLoadingUserRosters] = useState<boolean>(false);

  const clearAllData = useCallback((showToast = true) => {
    setImageDataUrl(null);
    setOriginalImageStoragePath(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
    setRoster([]);
    setCurrentRosterDocId(null);
    if (showToast) {
      toast({ 
        title: "エディタをクリア", 
        description: "現在の画像とロスターがクリアされました。" 
      });
    }
  }, [toast]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!currentUser?.uid) {
      toast({
        title: "認証エラー",
        description: "ユーザーがログインしていません",
        variant: "destructive",
      });
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "ファイル形式エラー",
        description: "サポートされている形式: PNG, JPEG, WebP",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "ファイルサイズエラー",
        description: `ファイルサイズは${MAX_FILE_SIZE_MB}MB以下にしてください`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      clearAllData(false);

      const storagePath = `users/${currentUser.uid}/rosters/${Date.now()}_${file.name}`;
      const storageRef = storageRefStandard(appFirebaseStorage, storagePath);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 画像のサイズを取得
      const img = new Image();
      img.onload = () => {
        setOriginalImageSize({ width: img.width, height: img.height });
      };
      img.src = downloadURL;

      setImageDataUrl(downloadURL);
      setOriginalImageStoragePath(storagePath);

      toast({
        title: "アップロード完了",
        description: "画像が正常にアップロードされました",
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "アップロードエラー",
        description: "画像のアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, clearAllData, setIsProcessing, toast]);

  const addDrawnRegion = useCallback((
    displayRegion: Omit<DisplayRegion, 'id'>, 
    imageDisplaySize: { width: number; height: number }
  ) => {
    if (!originalImageSize) return;

    const scaleX = originalImageSize.width / imageDisplaySize.width;
    const scaleY = originalImageSize.height / imageDisplaySize.height;

    const originalRegion: Region = {
      id: crypto.randomUUID(),
      x: displayRegion.x * scaleX,
      y: displayRegion.y * scaleY,
      width: displayRegion.width * scaleX,
      height: displayRegion.height * scaleY,
    };

    setDrawnRegions(prev => [...prev, originalRegion]);
  }, [originalImageSize]);

  const clearDrawnRegions = useCallback(() => {
    setDrawnRegions([]);
  }, []);

  const getScaledRegionForDisplay = useCallback((
    originalRegion: Region, 
    imageDisplaySize: { width: number; height: number }
  ): DisplayRegion => {
    if (!originalImageSize) {
      return { ...originalRegion };
    }

    const scaleX = imageDisplaySize.width / originalImageSize.width;
    const scaleY = imageDisplaySize.height / originalImageSize.height;

    return {
      id: originalRegion.id || crypto.randomUUID(),
      x: originalRegion.x * scaleX,
      y: originalRegion.y * scaleY,
      width: originalRegion.width * scaleX,
      height: originalRegion.height * scaleY,
    };
  }, [originalImageSize]);

  const createRosterFromRegions = useCallback(async () => {
    if (!currentUser?.uid || !originalImageStoragePath || drawnRegions.length === 0) {
      return;
    }

    try {
      setIsProcessing(true);

      const newRoster: EditablePersonInContext[] = drawnRegions.map(region => ({
        id: crypto.randomUUID(),
        name: '',
        company: '',
        notes: '',
        currentRosterAppearance: {
          rosterId: crypto.randomUUID(),
          faceImageStoragePath: originalImageStoragePath,
          originalRegion: region,
        },
        faceImageUrl: null,
        isNew: true,
        tempFaceImageDataUri: null,
        tempOriginalRegion: region,
      }));

      setRoster(newRoster);
      
      toast({
        title: "ロスター作成完了",
        description: `${drawnRegions.length}人の顔が検出されました`,
      });
    } catch (error) {
      console.error('Error creating roster:', error);
      toast({
        title: "エラー",
        description: "ロスターの作成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, originalImageStoragePath, drawnRegions, setIsProcessing, toast]);

  const updatePersonDetails = useCallback(async (
    personId: string,
    details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl' | 'isNew' | 'tempFaceImageDataUri' | 'tempOriginalRegion'>>
  ) => {
    setRoster(prev => prev.map(person => 
      person.id === personId 
        ? { ...person, ...details }
        : person
    ));
  }, []);

  const fetchUserRosters = useCallback(async () => {
    if (!currentUser?.uid) {
      setUserRosters([]);
      return;
    }

    setIsLoadingUserRosters(true);
    try {
      const q = query(
        collection(db, "rosters"),
        where("ownerId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedRosters: ImageSet[] = [];
      querySnapshot.forEach((doc) => {
        fetchedRosters.push({ id: doc.id, ...doc.data() } as ImageSet);
      });
      setUserRosters(fetchedRosters);
    } catch (error) {
      console.error("Error fetching user rosters:", error);
      toast({
        title: "エラー",
        description: "ロスターデータの取得に失敗しました",
        variant: "destructive",
      });
      setUserRosters([]);
    } finally {
      setIsLoadingUserRosters(false);
    }
  }, [currentUser?.uid, toast]);

  const loadRosterForEditing = useCallback(async (rosterId: string) => {
    if (!currentUser?.uid) return;

    try {
      setIsProcessing(true);
      clearAllData(false);

      const rosterDoc = await getDoc(doc(db, "rosters", rosterId));
      if (!rosterDoc.exists()) {
        throw new Error("ロスターが見つかりません");
      }

      const rosterData = rosterDoc.data() as ImageSet;
      setCurrentRosterDocId(rosterId);

      if (rosterData.originalImagePath) {
        const imageDataUri = await imageStoragePathToDataURI(rosterData.originalImagePath);
        if (imageDataUri) {
          setImageDataUrl(imageDataUri);
          setOriginalImageStoragePath(rosterData.originalImagePath);
        }
      }

      if (rosterData.originalImageSize) {
        setOriginalImageSize(rosterData.originalImageSize);
      }

      const editableRoster: EditablePersonInContext[] = (rosterData.people || []).map(person => ({
        ...person,
        isNew: false,
        tempFaceImageDataUri: null,
        tempOriginalRegion: null,
      }));

      setRoster(editableRoster);

      toast({
        title: "ロスター読み込み完了",
        description: "ロスターが編集用に読み込まれました",
      });
    } catch (error) {
      console.error('Error loading roster:', error);
      toast({
        title: "エラー",
        description: "ロスターの読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, clearAllData, setIsProcessing, toast]);

  const deleteRoster = useCallback(async (rosterId: string) => {
    if (!currentUser?.uid) return;

    try {
      setIsProcessing(true);
      
      await deleteDoc(doc(db, "rosters", rosterId));
      await fetchUserRosters();

      if (currentRosterDocId === rosterId) {
        clearAllData();
      }

      toast({
        title: "削除完了",
        description: "ロスターが削除されました",
      });
    } catch (error) {
      console.error('Error deleting roster:', error);
      toast({
        title: "エラー",
        description: "ロスターの削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser?.uid, currentRosterDocId, clearAllData, fetchUserRosters, setIsProcessing, toast]);

  const value: RosterContextType = {
    imageDataUrl,
    originalImageStoragePath,
    originalImageSize,
    drawnRegions,
    roster,
    currentRosterDocId,
    userRosters,
    isLoadingUserRosters,
    handleImageUpload,
    addDrawnRegion,
    clearDrawnRegions,
    createRosterFromRegions,
    updatePersonDetails,
    clearAllData,
    getScaledRegionForDisplay,
    fetchUserRosters,
    loadRosterForEditing,
    deleteRoster,
  };

  return (
    <RosterContext.Provider value={value}>
      {children}
    </RosterContext.Provider>
  );
};

export const useRoster = () => {
  const context = useContext(RosterContext);
  if (context === undefined) {
    throw new Error('useRoster must be used within a RosterProvider');
  }
  return context;
};