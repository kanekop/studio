"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, db, storage as appFirebaseStorage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRefStandard, uploadBytes, getDownloadURL, uploadString, StringFormat, deleteObject } from 'firebase/storage';
import { doc, setDoc, addDoc, updateDoc, collection, serverTimestamp, arrayUnion, arrayRemove, query, where, getDocs, orderBy, getDoc, writeBatch, deleteDoc, runTransaction, FirestoreError, Timestamp } from 'firebase/firestore';

import type { Person, Region, DisplayRegion, ImageSet, EditablePersonInContext, FaceAppearance, FieldMergeChoices, SuggestedMergePair, Connection, AdvancedSearchParams } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { suggestPeopleMerges, type SuggestMergeInput, type SuggestMergeOutput } from '@/ai/flows/suggest-people-merges-flow';
import type { EditPersonFormData } from '@/components/features/EditPersonDialog';
import { useUI } from '@/contexts/UIContext';


const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const FIRESTORE_IN_QUERY_LIMIT = 30;

export type PeopleSortOptionValue = 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc';


interface FaceRosterContextType {
  currentUser: FirebaseUser | null;
  roster: EditablePersonInContext[];
  isLoading: boolean;
  isProcessing: boolean;
  currentRosterDocId: string | null;
  userRosters: ImageSet[];
  isLoadingUserRosters: boolean;

  imageDataUrl: string | null;
  originalImageStoragePath: string | null;
  originalImageSize: { width: number; height: number } | null;
  drawnRegions: Region[];

  updatePersonDetails: (personId: string, details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl' | 'isNew' | 'tempFaceImageDataUri' | 'tempOriginalRegion'>>) => Promise<void>;
  clearAllData: (showToast?: boolean) => void;
  fetchUserRosters: () => Promise<void>;
  loadRosterForEditing: (rosterId: string) => Promise<void>;
  deleteRoster: (rosterId: string) => Promise<void>;
  createRosterFromRegions: (
    regions: Region[],
    imageDataUrl: string,
    originalImageStoragePath: string,
    originalImageSize: { width: number; height: number }
  ) => Promise<void>;

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
  clearCurrentRoster: () => void;
}

const FaceRosterContext = createContext<FaceRosterContextType | undefined>(undefined);

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


export const FaceRosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { selectPerson } = useUI();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [roster, setRoster] = useState<EditablePersonInContext[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessingState] = useState<boolean>(false);
  const [currentRosterDocId, setCurrentRosterDocId] = useState<string | null>(null);
  const [userRosters, setUserRosters] = useState<ImageSet[]>([]);
  const [isLoadingUserRosters, setIsLoadingUserRosters] = useState<boolean>(false);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [originalImageStoragePath, setOriginalImageStoragePath] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [drawnRegions, setDrawnRegions] = useState<Region[]>([]);

  const clearAllData = useCallback((showToast = true) => {
    setRoster([]);
    setCurrentRosterDocId(null);
    setImageDataUrl(null);
    setOriginalImageStoragePath(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
    if (showToast) {
      toast({ title: "Editor Cleared", description: "Current image and roster have been cleared from the editor." });
    }
  }, [toast]);

  const fetchUserRosters = useCallback(async () => {
    if (!currentUser || !db) {
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
      console.error("FRC: Error fetching user rosters:", error);
      const err = error as FirestoreError;
      if (err.code === 'failed-precondition' && err.message?.includes('query requires an index')) {
        toast({ title: "Database Index Required", description: `A database index is needed for rosters. Error: ${err.message}. The console may provide a link to create it.`, variant: "destructive", duration: 15000 });
      } else if (err.code) {
        toast({ title: "Error Loading Rosters", description: `Could not fetch your saved rosters. Error: ${err.message} (Code: ${err.code})`, variant: "destructive" });
      } else {
        toast({ title: "Error Loading Rosters", description: `Could not fetch your saved rosters. Error: ${(error as Error).message}`, variant: "destructive" });
      }
      setUserRosters([]);
    } finally {
      setIsLoadingUserRosters(false);
    }
  }, [currentUser, toast]);



  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
      if (!user) {
        clearAllData(false);
        setUserRosters([]);
      }
    });
    return () => unsubscribe();
  }, [clearAllData]);

  useEffect(() => {
    if (currentUser) {
      fetchUserRosters();
    }
  }, [currentUser, fetchUserRosters]);








  const updatePersonDetails = useCallback(async (
    personIdToUpdate: string,
    details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl' | 'isNew' | 'tempFaceImageDataUri' | 'tempOriginalRegion'>>
  ) => {
    if (!db || !currentUser?.uid || !currentRosterDocId) {
      toast({ title: "Error", description: "User not authenticated, or database service unavailable.", variant: "destructive" });
      return;
    }

    setIsProcessingState(true);
    const localPersonEntry = roster.find(p => p.id === personIdToUpdate);
    if (!localPersonEntry) {
      toast({ title: "Error", description: "Person to update not found in current roster view.", variant: "destructive" });
      setIsProcessingState(false);
      return;
    }
    if (localPersonEntry.isNew) {
      toast({ title: "Error", description: "Cannot update 'new' person directly. This should have been handled by createRosterFromRegions.", variant: "destructive" });
      setIsProcessingState(false);
      return;
    }


    const finalName = (details.name || localPersonEntry.name || `Unnamed Person`).trim();
    if (!finalName) {
      toast({ title: "Validation Error", description: "Person's name cannot be empty.", variant: "destructive" });
      setIsProcessingState(false);
      return;
    }

    try {
      const personDocRef = doc(db, "people", personIdToUpdate);
      const firestoreUpdateData: { [key: string]: any } = {
        name: finalName,
        notes: details.notes,
        company: details.company,
        hobbies: details.hobbies,
        birthday: details.birthday,
        firstMet: details.firstMet,
        firstMetContext: details.firstMetContext,
        updatedAt: serverTimestamp()
      };

      Object.keys(firestoreUpdateData).forEach(key => firestoreUpdateData[key] === undefined && delete firestoreUpdateData[key]);

      await updateDoc(personDocRef, firestoreUpdateData);

      setRoster(prevRoster =>
        prevRoster.map(p =>
          p.id === personIdToUpdate
            ? {
              ...p,
              name: finalName,
              notes: details.notes !== undefined ? details.notes : p.notes,
              company: details.company !== undefined ? details.company : p.company,
              hobbies: details.hobbies !== undefined ? details.hobbies : p.hobbies,
              birthday: details.birthday !== undefined ? details.birthday : p.birthday,
              firstMet: details.firstMet !== undefined ? details.firstMet : p.firstMet,
              firstMetContext: details.firstMetContext !== undefined ? details.firstMetContext : p.firstMetContext,
            }
            : p
        )
      );
      toast({ title: "Details Saved", description: `${finalName}'s information updated.` });

    } catch (error: any) {
      console.error(`FRC: Error updating person details (ID: ${personIdToUpdate}) in Firestore:`, error);
      toast({ title: "Save Failed", description: `Could not save changes for ${finalName || 'person'}: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessingState(false);
    }
  }, [currentUser, currentRosterDocId, toast, roster]);


  const loadRosterForEditing = useCallback(async (rosterId: string) => {
    if (!db || !appFirebaseStorage || !currentUser) {
      toast({ title: "Error", description: "Firebase services not available or user not logged in.", variant: "destructive" });
      return;
    }
    setIsProcessingState(true);
    clearAllData(false);

    try {
      const rosterDocRef = doc(db, "rosters", rosterId);
      const rosterSnap = await getDoc(rosterDocRef);

      if (!rosterSnap.exists()) {
        toast({ title: "Not Found", description: "The selected roster could not be found.", variant: "destructive" });
        setIsProcessingState(false);
        await fetchUserRosters();
        return;
      }

      const rosterData = rosterSnap.data() as ImageSet;
      if (rosterData.ownerId !== currentUser.uid) {
        toast({ title: "Access Denied", description: "You do not have permission to load this roster.", variant: "destructive" });
        setIsProcessingState(false);
        return;
      }

      setCurrentRosterDocId(rosterId);

      const peopleForRosterUI: EditablePersonInContext[] = [];
      if (rosterData.peopleIds && rosterData.peopleIds.length > 0) {
        const peopleChunks = [];
        for (let i = 0; i < rosterData.peopleIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
          peopleChunks.push(rosterData.peopleIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT));
        }

        for (const chunk of peopleChunks) {
          if (chunk.length === 0) continue;
          const peopleQuery = query(collection(db, "people"), where("__name__", "in", chunk));
          const peopleSnapshots = await getDocs(peopleQuery);

          for (const personDoc of peopleSnapshots.docs) {
            const personData = { id: personDoc.id, ...personDoc.data() } as Person;

            const appearanceForThisRoster = personData.faceAppearances?.find(app => app.rosterId === rosterId);

            let faceImgUrl = "https://placehold.co/100x100.png";
            let currentAppearanceDetails: EditablePersonInContext['currentRosterAppearance'] = undefined;

            if (appearanceForThisRoster && appearanceForThisRoster.faceImageStoragePath) {
              try {
                const faceRef = storageRefStandard(appFirebaseStorage, appearanceForThisRoster.faceImageStoragePath);
                faceImgUrl = await getDownloadURL(faceRef);
                currentAppearanceDetails = {
                  rosterId: rosterId,
                  faceImageStoragePath: appearanceForThisRoster.faceImageStoragePath,
                  originalRegion: appearanceForThisRoster.originalRegion,
                };
              } catch (storageError) {
                console.error(`FRC: Error getting download URL for face image ${appearanceForThisRoster.faceImageStoragePath}:`, storageError);
                toast({ title: "Image Load Error", description: `Could not load face for ${personData.name}.`, variant: "destructive" });
              }
            } else {
              console.warn(`FRC: No matching face appearance found for person ${personData.id} in roster ${rosterId}, or path missing.`);
            }

            peopleForRosterUI.push({
              id: personDoc.id,
              isNew: false,
              name: personData.name,
              aiName: personData.aiName,
              notes: personData.notes,
              company: personData.company,
              hobbies: personData.hobbies,
              birthday: personData.birthday,
              firstMet: personData.firstMet,
              firstMetContext: personData.firstMetContext,
              faceImageUrl: faceImgUrl,
              currentRosterAppearance: currentAppearanceDetails,
            });
          }
        }
      }
      setRoster(peopleForRosterUI);

      // Load the original image for the canvas
      if (rosterData.originalImageStoragePath) {
        setOriginalImageStoragePath(rosterData.originalImageStoragePath);
        
        // Set original image dimensions
        if (rosterData.originalImageSize) {
          setOriginalImageSize(rosterData.originalImageSize);
        }
        
        // Convert the Firebase Storage path to a data URL for canvas operations
        const dataUrl = await imageStoragePathToDataURI(rosterData.originalImageStoragePath);
        if (dataUrl) {
          setImageDataUrl(dataUrl);
        } else {
          console.error('FRC: Failed to load original image from storage');
          toast({ 
            title: "Image Load Warning", 
            description: "Could not load the original image, but you can still edit person details.", 
            variant: "destructive" 
          });
        }
      }

      toast({ title: "Roster Loaded", description: `${rosterData.rosterName} is ready for editing.` });

    } catch (error: any) {
      console.error("FRC: Error loading roster for editing:", error);
      toast({ title: "Load Failed", description: `Could not load the roster: ${error.message}`, variant: "destructive" });
      clearAllData(false);
    } finally {
      setIsProcessingState(false);
    }
  }, [currentUser, toast, fetchUserRosters, clearAllData]);


  const deleteRoster = useCallback(async (rosterId: string) => {
    if (!db || !appFirebaseStorage || !currentUser) {
      toast({ title: "Error", description: "Cannot delete: Not logged in or Firebase services unavailable.", variant: "destructive" });
      return;
    }
    setIsProcessingState(true);
    try {
      const rosterDocRef = doc(db, "rosters", rosterId);
      const rosterSnap = await getDoc(rosterDocRef);

      if (!rosterSnap.exists()) {
        toast({ title: "Not Found", description: "Roster to delete was not found.", variant: "destructive" });
        setIsProcessingState(false);
        await fetchUserRosters();
        return;
      }
      const rosterData = rosterSnap.data() as ImageSet;

      if (rosterData.ownerId !== currentUser.uid) {
        toast({ title: "Access Denied", description: "You cannot delete this roster.", variant: "destructive" });
        setIsProcessingState(false);
        return;
      }

      const batch = writeBatch(db);
      const faceImagesToDelete: string[] = [];

      if (rosterData.peopleIds && rosterData.peopleIds.length > 0) {
        for (const personId of rosterData.peopleIds) {
          const personRef = doc(db, "people", personId);
          const personSnap = await getDoc(personRef);
          if (personSnap.exists()) {
            const personData = personSnap.data() as Person;
            const appearanceToDelete = personData.faceAppearances?.find(app => app.rosterId === rosterId);
            if (appearanceToDelete?.faceImageStoragePath) {
              faceImagesToDelete.push(appearanceToDelete.faceImageStoragePath);
            }

            const remainingAppearances = personData.faceAppearances?.filter(app => app.rosterId !== rosterId);
            const remainingRosterIds = personData.rosterIds?.filter(id => id !== rosterId);

            if (remainingRosterIds && remainingRosterIds.length > 0) {
              batch.update(personRef, {
                faceAppearances: remainingAppearances,
                rosterIds: remainingRosterIds,
                primaryFaceAppearancePath: (personData.primaryFaceAppearancePath === appearanceToDelete?.faceImageStoragePath)
                  ? (remainingAppearances?.[0]?.faceImageStoragePath || null)
                  : personData.primaryFaceAppearancePath,
                updatedAt: serverTimestamp()
              });
            } else {
              personData.faceAppearances?.forEach(app => {
                if (app.faceImageStoragePath && !faceImagesToDelete.includes(app.faceImageStoragePath)) {
                  faceImagesToDelete.push(app.faceImageStoragePath);
                }
              });
              batch.delete(personRef);
            }
          }
        }
      }

      if (rosterData.originalImageStoragePath) {
        try { await deleteObject(storageRefStandard(appFirebaseStorage, rosterData.originalImageStoragePath)); } catch (e: any) { console.warn("FRC: Failed to delete original image from Storage:", rosterData.originalImageStoragePath, e.message); }
      }

      batch.delete(rosterDocRef);
      await batch.commit();

      for (const path of faceImagesToDelete) {
        try { await deleteObject(storageRefStandard(appFirebaseStorage, path)); } catch (e: any) { console.warn("FRC: Failed to delete a face image during roster deletion (post-commit):", path, e.message); }
      }

      toast({ title: "Roster Deleted", description: `${rosterData.rosterName} and associated data removed.` });

      if (currentRosterDocId === rosterId) {
        clearAllData(false);
      }
      await fetchUserRosters();

    } catch (error: any) {
      console.error("FRC: Error deleting roster:", error);
      toast({ title: "Delete Failed", description: `Could not delete roster: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessingState(false);
    }
  }, [currentUser, toast, fetchUserRosters, currentRosterDocId, clearAllData]);

  const createRosterFromRegions = async (
    regions: Region[],
    imageDataUrl: string,
    originalImageStoragePath: string,
    originalImageSize: { width: number; height: number }
  ) => {
    if (!currentUser) {
      console.error("User not authenticated to create a roster.");
      return;
    }
    if (regions.length === 0) {
      console.warn("No regions selected, nothing to create.");
      return;
    }

    setIsProcessingState(true);
    try {
      // 1. Prepare initial data structures
      const newPeople = await createInitialPersonDataFromRegions(regions, imageDataUrl, originalImageSize);
      const newRosterRef = doc(collection(db, 'rosters'));
      
      // 2. Upload face images and prepare person data
      const peopleWithRealIdsPromises = newPeople.map(async (person) => {
        const newPersonDocRef = doc(collection(db, 'people'));
        
        // Upload the cropped face image data URI to Storage
        const faceImageStoragePath = `rosters/${currentUser.uid}/${newRosterRef.id}/face_${newPersonDocRef.id}.jpg`;
        const faceImageRef = storageRefStandard(appFirebaseStorage, faceImageStoragePath);
        await uploadString(faceImageRef, person.tempFaceImageDataUri!, StringFormat.DATA_URL);

        const appearanceForThisRoster = { 
          ...person.currentRosterAppearance, 
          rosterId: newRosterRef.id,
          faceImageStoragePath: faceImageStoragePath
        };
        
        return {
          ...person,
          id: newPersonDocRef.id,
          isNew: false,
          currentRosterAppearance: appearanceForThisRoster
        };
      });

      const peopleWithRealIds = await Promise.all(peopleWithRealIdsPromises);

      // 3. Create a batch write to commit all changes at once
      const batch = writeBatch(db);

      batch.set(newRosterRef, {
        ownerId: currentUser.uid,
        createdAt: serverTimestamp(),
        originalImageStoragePath: originalImageStoragePath,
        originalImageSize: originalImageSize,
        personCount: regions.length,
        peopleIds: peopleWithRealIds.map(p => p.id)
      });
      
      peopleWithRealIds.forEach(person => {
        const personDocRef = doc(db, 'people', person.id);
        const {
          isNew,
          tempFaceImageDataUri,
          tempOriginalRegion,
          currentRosterAppearance,
          ...personDataToSave
        } = person;

        const finalPersonData = {
          ...personDataToSave,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          faceAppearances: [currentRosterAppearance]
        };
        batch.set(personDocRef, finalPersonData);
      });

      await batch.commit();

      // 4. On Success, update the local state
      setRoster(peopleWithRealIds);
      setCurrentRosterDocId(newRosterRef.id);
      setOriginalImageStoragePath(originalImageStoragePath);
      setOriginalImageSize(originalImageSize);
      // Auto-select the first person if any were created
      if (peopleWithRealIds.length > 0) {
        selectPerson(peopleWithRealIds[0].id);
        console.log('FRC: Auto-selected first person:', peopleWithRealIds[0].id, peopleWithRealIds[0].name);
      }
      toast({ 
        title: "Roster Created", 
        description: `${regions.length} face(s) detected. Please save the roster to persist changes.` 
      });

    } catch (error) {
      console.error("Error creating new roster: ", error);
      toast({ title: "Error", description: `Failed to create roster: ${error}`, variant: "destructive" });
    } finally {
      setIsProcessingState(false);
    }
  };

  const createInitialPersonDataFromRegions = async (
    regions: Region[],
    imageDataUrl: string,
    originalImageSize: { width: number, height: number }
  ): Promise<EditablePersonInContext[]> => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageDataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    return regions.map((region, i) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      canvas.width = region.width;
      canvas.height = region.height;
      ctx.drawImage(img, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
      const faceDataUri = canvas.toDataURL('image/png');

      return {
        id: `temp_${Date.now()}_${i}`,
        name: `Person ${i + 1}`,
        isNew: true,
        tempFaceImageDataUri: faceDataUri,
        tempOriginalRegion: region,
        currentRosterAppearance: {
          rosterId: '',
          faceImageStoragePath: '',
          originalRegion: {
            x: region.x / originalImageSize.width,
            y: region.y / originalImageSize.height,
            width: region.width / originalImageSize.width,
            height: region.height / originalImageSize.height,
          },
        },
        notes: '',
        company: '',
        hobbies: '',
        birthday: '',
        firstMet: '',
        firstMetContext: '',
      };
    });
  };

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
      setIsProcessingState(true);
      clearAllData(false);

      // Convert file to data URL for canvas operations
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const storagePath = `users/${currentUser.uid}/rosters/${Date.now()}_${file.name}`;
      const storageRef = storageRefStandard(appFirebaseStorage, storagePath);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 画像のサイズを取得
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setOriginalImageSize({ width: img.width, height: img.height });
      };
      img.src = dataUrl; // Use data URL instead of Firebase URL

      setImageDataUrl(dataUrl); // Use data URL for canvas operations
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
      setIsProcessingState(false);
    }
  }, [currentUser?.uid, clearAllData, toast]);

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
      return { id: originalRegion.id || 'default', ...originalRegion };
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

  const clearCurrentRoster = useCallback(() => {
    setRoster([]);
    setCurrentRosterDocId(null);
    setOriginalImageStoragePath(null);
    setOriginalImageSize(null);
    setImageDataUrl(null);
    setDrawnRegions([]);
    selectPerson(null);
    console.log('FRC: Current roster cleared.');
  }, []);

  return (
    <FaceRosterContext.Provider value={{
      currentUser,
      roster,
      isLoading,
      isProcessing,
      currentRosterDocId,
      userRosters,
      isLoadingUserRosters,
      imageDataUrl,
      originalImageStoragePath,
      originalImageSize,
      drawnRegions,
      updatePersonDetails,
      clearAllData,
      fetchUserRosters,
      loadRosterForEditing,
      deleteRoster,
      createRosterFromRegions,
      handleImageUpload,
      addDrawnRegion,
      clearDrawnRegions,
      getScaledRegionForDisplay,
      clearCurrentRoster,
    }}>
      {children}
    </FaceRosterContext.Provider>
  );
};

export const useFaceRoster = (): FaceRosterContextType => {
  const context = useContext(FaceRosterContext);
  if (context === undefined) {
    throw new Error('useFaceRoster must be used within a FaceRosterProvider');
  }
  return context;
};


