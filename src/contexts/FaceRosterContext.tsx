
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db, storage as appFirebaseStorage } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL, uploadString, StringFormat, deleteObject } from 'firebase/storage'; 
import { doc, setDoc, addDoc, updateDoc, collection, serverTimestamp, arrayUnion, query, where, getDocs, orderBy, getDoc, writeBatch, deleteDoc, FirestoreError } from 'firebase/firestore';

import type { Person, Region, DisplayRegion, ImageSet, EditablePersonInContext } from '@/types';
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];


interface FaceRosterContextType {
  currentUser: FirebaseUser | null;
  imageDataUrl: string | null; 
  originalImageStoragePath: string | null; 
  originalImageSize: { width: number; height: number } | null;
  drawnRegions: Region[];
  roster: EditablePersonInContext[]; 
  selectedPersonId: string | null;
  isLoading: boolean; 
  isProcessing: boolean;
  currentRosterDocId: string | null;
  userRosters: ImageSet[];
  isLoadingUserRosters: boolean;

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  createRosterFromRegions: () => Promise<void>;
  selectPerson: (id: string | null) => void;
  updatePersonDetails: (id: string, details: Partial<EditablePersonInContext>) => void;
  clearAllData: (showToast?: boolean) => void; 
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
  fetchUserRosters: () => Promise<void>;
  loadRosterForEditing: (rosterId: string) => Promise<void>;
  deleteRoster: (rosterId: string) => Promise<void>;
}

const FaceRosterContext = createContext<FaceRosterContextType | undefined>(undefined);

export const FaceRosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [originalImageStoragePath, setOriginalImageStoragePath] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [drawnRegions, setDrawnRegions] = useState<Region[]>([]);
  const [roster, setRoster] = useState<EditablePersonInContext[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentRosterDocId, setCurrentRosterDocId] = useState<string | null>(null);
  const [userRosters, setUserRosters] = useState<ImageSet[]>([]);
  const [isLoadingUserRosters, setIsLoadingUserRosters] = useState<boolean>(false);
  const { toast } = useToast();

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
      if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes('query requires an index')) {
        toast({ title: "Database Index Required", description: `A database index is needed for fetching rosters. Firestore error: ${error.message}. The console may provide a link to create it.`, variant: "destructive", duration: 15000});
      } else if (error instanceof FirestoreError) {
         toast({ title: "Error Loading Rosters", description: `Could not fetch your saved rosters. Firestore error: ${error.message} (Code: ${error.code})`, variant: "destructive" });
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
      } else {
        fetchUserRosters();
      }
    });
    return () => unsubscribe();
  }, [fetchUserRosters]);


  const clearAllData = useCallback((showToast = true) => {
    setImageDataUrl(null);
    setOriginalImageStoragePath(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
    setRoster([]);
    setSelectedPersonId(null);
    setCurrentRosterDocId(null); 
    if (showToast) {
      toast({ title: "Editor Cleared", description: "Current image and roster have been cleared from the editor." });
    }
  }, [toast]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in to upload images.", variant: "destructive" });
      return;
    }
    if (!db || !appFirebaseStorage) {
      toast({ title: "Firebase Error", description: "Database or Storage service not available. Check console.", variant: "destructive" });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "File Too Large", description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({ title: "Invalid File Type", description: "Please upload a PNG, JPG, or WEBP image.", variant: "destructive" });
      return;
    }

    clearAllData(false); 
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const localDataUrl = e.target?.result as string;
      if (!localDataUrl) {
          toast({ title: "File Read Error", description: "Could not read file data for preview.", variant: "destructive" });
          setIsProcessing(false);
          return;
      }
      const img = new Image();
      img.onload = async () => {
        const currentImgSize = { width: img.width, height: img.height };
        setImageDataUrl(localDataUrl); 
        setOriginalImageSize(currentImgSize);

        try {
          if (!currentUser?.uid) throw new Error("User not authenticated for cloud upload.");
          if (!currentImgSize || !currentImgSize.width || !currentImgSize.height) throw new Error("Image dimensions are invalid.");
          
          const imageName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const imagePath = `users/${currentUser.uid}/original_images/${imageName}`;
          const imageFileRef = storageRef(appFirebaseStorage, imagePath);

          const uploadTask = await uploadBytes(imageFileRef, file);
          const downloadURL = await getDownloadURL(uploadTask.ref);
          const cloudStoragePath = uploadTask.ref.fullPath;

          setOriginalImageStoragePath(cloudStoragePath);
          setImageDataUrl(downloadURL); 
          
          const rosterData = {
            ownerId: currentUser.uid,
            rosterName: `Roster - ${file.name.split('.')[0]} - ${new Date().toLocaleDateString()}`, 
            originalImageStoragePath: cloudStoragePath,
            originalImageDimensions: currentImgSize,
            peopleIds: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          if (!db) throw new Error("Firestore database service is not available.");

          const rosterDocRef = await addDoc(collection(db, "rosters"), rosterData);
          setCurrentRosterDocId(rosterDocRef.id);
          await fetchUserRosters();

          toast({ title: "Upload Successful", description: "Image saved to cloud and new roster created." });
        } catch (uploadError: any) {
          console.error("FRC: Cloud upload or Firestore roster creation error:", uploadError);
          let errorDescription = "Could not save image or create roster.";
          if (uploadError instanceof FirestoreError) {
            errorDescription = `Firestore error: ${uploadError.message} (Code: ${uploadError.code}). Check Firestore rules and API status.`;
          } else if (uploadError.message) {
            errorDescription = uploadError.message;
          } else if (uploadError.code && uploadError.code.startsWith('storage/')) {
            errorDescription = `Storage error: ${uploadError.message} (Code: ${uploadError.code}). Check Storage rules.`;
          }
          toast({ title: "Operation Failed", description: errorDescription, variant: "destructive" });
          setImageDataUrl(localDataUrl); 
          setOriginalImageStoragePath(null); 
          setCurrentRosterDocId(null);
        } finally {
          setIsProcessing(false);
        }
      };
      img.onerror = (errEv) => {
        console.error("FRC: img.onerror triggered during initial load/preview. Error:", errEv);
        toast({ title: "Image Load Error", description: "Could not load the image for preview.", variant: "destructive" });
        setIsProcessing(false);
      }
      img.src = localDataUrl;
    };
    reader.onerror = (errEv) => {
      console.error("FRC: reader.onerror triggered. Error:", errEv);
      toast({ title: "File Read Error", description: "Could not read the file.", variant: "destructive"});
      setIsProcessing(false);
    }
    reader.readAsDataURL(file);
  }, [toast, currentUser, clearAllData, fetchUserRosters]);
  

  const convertDisplayToOriginalRegion = (
    displayRegion: Omit<DisplayRegion, 'id'>,
    imageDisplaySize: { width: number; height: number }
  ): Region => {
    if (!originalImageSize || !imageDisplaySize.width || !imageDisplaySize.height) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const scaleX = originalImageSize.width / imageDisplaySize.width;
    const scaleY = originalImageSize.height / imageDisplaySize.height;
    return {
      x: displayRegion.x * scaleX,
      y: displayRegion.y * scaleY,
      width: displayRegion.width * scaleX,
      height: displayRegion.height * scaleY,
    };
  };

  const addDrawnRegion = useCallback((displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => {
    if (!originalImageSize) {
        toast({ title: "Error", description: "Cannot add region: original image dimensions not set.", variant: "destructive" });
        return;
    }
    const originalRegion = convertDisplayToOriginalRegion(displayRegion, imageDisplaySize);
    setDrawnRegions(prev => [...prev, originalRegion]);
  }, [originalImageSize, toast]);

  const clearDrawnRegions = useCallback(() => {
    setDrawnRegions([]);
  }, []);

  const createRosterFromRegions = useCallback(async () => {
    if (!imageDataUrl || drawnRegions.length === 0) {
      toast({ title: "No Regions", description: "Please draw regions on the image first.", variant: "destructive" });
      return;
    }
    if (!currentUser?.uid || !currentRosterDocId || !db || !appFirebaseStorage) {
      toast({ title: "Error", description: "User not authenticated, roster not initialized, or Firebase services unavailable. Check console.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    const newEditablePeople: EditablePersonInContext[] = [];
    const newPersonDocIds: string[] = [];
    
    const img = new Image();
    img.crossOrigin = "anonymous"; 

    const imageLoadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (errEvent) => {
        let specificErrorMessage = 'Image load failed.';
        let errorDetails: any = {};
        if (typeof errEvent === 'string') specificErrorMessage = errEvent;
        else if (errEvent instanceof Event) specificErrorMessage = `Image load failed. Event type: ${errEvent.type}.`;
        console.error("FRC: Error loading image for cropping. URL:", imageDataUrl, "Specific error:", specificErrorMessage, "Details:", errorDetails, "Raw event:", errEvent);
        reject(new Error(`Failed to load base image for cropping. URL: ${imageDataUrl}. Error: ${specificErrorMessage}`));
      };
      try {
        img.src = imageDataUrl; 
      } catch (srcError: any) {
        reject(new Error(`Failed to set image source for cropping. URL: ${imageDataUrl}. Error: ${srcError.message || 'Unknown src assignment error'}`));
      }
    });

    try {
      await imageLoadPromise;
      for (let i = 0; i < drawnRegions.length; i++) {
        const region = drawnRegions[i];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.max(1, Math.floor(region.width)); 
        tempCanvas.height = Math.max(1, Math.floor(region.height));
        const ctx = tempCanvas.getContext('2d');

        if (!ctx) continue; 
        
        ctx.drawImage(
          img, 
          Math.floor(region.x), Math.floor(region.y), Math.floor(region.width), Math.floor(region.height), 
          0, 0, tempCanvas.width, tempCanvas.height 
        );
        
        const faceImageDataURI = tempCanvas.toDataURL('image/png'); 
        
        const croppedFaceFileName = `${currentRosterDocId}_${Date.now()}_${i}.png`;
        const croppedFaceStoragePath = `users/${currentUser.uid}/cropped_faces/${croppedFaceFileName}`;
        const croppedFaceRef = storageRef(appFirebaseStorage, croppedFaceStoragePath);
        
        const uploadResult = await uploadString(croppedFaceRef, faceImageDataURI, StringFormat.DATA_URL);
        const faceImageDownloadUrl = await getDownloadURL(uploadResult.ref);
        
        const personData: Omit<Person, 'id'> = { 
          name: `Person ${roster.length + newEditablePeople.length + 1}`,
          aiName: `Person ${roster.length + newEditablePeople.length + 1}`, 
          notes: '',
          company: '',
          hobbies: '',
          birthday: '',
          firstMet: '',
          firstMetContext: '',
          faceImageStoragePath: croppedFaceStoragePath, 
          originalRegion: region,
          addedBy: currentUser.uid,
          rosterIds: [currentRosterDocId],
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp(), 
        };
        const personDocRef = await addDoc(collection(db, "people"), personData);
        newPersonDocIds.push(personDocRef.id);

        newEditablePeople.push({
          id: personDocRef.id, 
          faceImageUrl: faceImageDownloadUrl, 
          name: personData.name,
          aiName: personData.aiName, 
          notes: personData.notes,
          company: personData.company,
          hobbies: personData.hobbies,
          birthday: personData.birthday,
          firstMet: personData.firstMet,
          firstMetContext: personData.firstMetContext,
          originalRegion: region,
          faceImageStoragePath: croppedFaceStoragePath, 
        });
      }

      if (newPersonDocIds.length > 0 && currentRosterDocId) {
        const rosterDocToUpdateRef = doc(db, "rosters", currentRosterDocId);
        await updateDoc(rosterDocToUpdateRef, {
          peopleIds: arrayUnion(...newPersonDocIds),
          updatedAt: serverTimestamp()
        });
      }

      setRoster(prev => [...prev, ...newEditablePeople]); 
      setDrawnRegions([]); 
      toast({ title: "Roster Updated", description: `${newEditablePeople.length} person(s) added, cropped images uploaded, and data saved to cloud.` });
    } catch (error: any) {
      console.error("FRC: Error during roster creation process (after image load attempt):", error.message, error.stack, error);
      let errorDescription = "Could not process regions due to an internal error.";
      if (error instanceof FirestoreError) {
            errorDescription = `Firestore error: ${error.message} (Code: ${error.code}).`;
      } else if (error.message) {
        errorDescription = error.message;
      }
      toast({ title: "Roster Creation Failed", description: errorDescription, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [imageDataUrl, drawnRegions, roster.length, toast, currentUser, currentRosterDocId]);

  const selectPerson = useCallback((id: string | null) => {
    setSelectedPersonId(id);
  }, []);

  const updatePersonDetails = useCallback(async (personDocId: string, details: Partial<EditablePersonInContext>) => {
    if (!db || !currentUser?.uid) {
        toast({ title: "Error", description: "User not authenticated or database service unavailable. Check console.", variant: "destructive" });
        return;
    }
    
    setRoster(prevRoster =>
      prevRoster.map(person =>
        person.id === personDocId ? { ...person, ...details } : person
      )
    );

    // Prepare data for Firestore, removing undefined values if any field is optional and not provided
    const firestoreUpdateData: { [key: string]: any } = {};
    if (details.name !== undefined) firestoreUpdateData.name = details.name;
    if (details.notes !== undefined) firestoreUpdateData.notes = details.notes;
    if (details.company !== undefined) firestoreUpdateData.company = details.company;
    if (details.hobbies !== undefined) firestoreUpdateData.hobbies = details.hobbies;
    if (details.birthday !== undefined) firestoreUpdateData.birthday = details.birthday;
    if (details.firstMet !== undefined) firestoreUpdateData.firstMet = details.firstMet;
    if (details.firstMetContext !== undefined) firestoreUpdateData.firstMetContext = details.firstMetContext;
    
    if (Object.keys(firestoreUpdateData).length === 0) {
      // No actual data fields to update besides timestamp
      firestoreUpdateData.updatedAt = serverTimestamp(); // Still update timestamp if only that
    } else {
      firestoreUpdateData.updatedAt = serverTimestamp();
    }
    
    try {
        const personRef = doc(db, "people", personDocId);
        await updateDoc(personRef, firestoreUpdateData);
        toast({ title: "Details Updated", description: "Person's information saved to cloud." });
    } catch (error: any) {
        console.error(`FRC: Error updating person details (ID: ${personDocId}) in Firestore:`, error);
        let errorDescription = `Could not save changes to cloud.`;
        if (error instanceof FirestoreError) {
            errorDescription = `Firestore error: ${error.message} (Code: ${error.code}).`;
        } else if (error.message) {
          errorDescription = error.message;
        }
        toast({ title: "Update Failed", description: errorDescription, variant: "destructive" });
    }
  }, [currentUser, toast]);

  const getScaledRegionForDisplay = useCallback((
    originalRegion: Region,
    imageDisplaySize: { width: number; height: number }
  ): DisplayRegion => {
    if (!originalImageSize || !imageDisplaySize.width || !imageDisplaySize.height) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const scaleX = imageDisplaySize.width / originalImageSize.width;
    const scaleY = imageDisplaySize.height / originalImageSize.height;
    return {
      x: originalRegion.x * scaleX,
      y: originalRegion.y * scaleY,
      width: originalRegion.width * scaleX,
      height: originalRegion.height * scaleY,
    };
  }, [originalImageSize]);

  const loadRosterForEditing = useCallback(async (rosterId: string) => {
    if (!db || !appFirebaseStorage || !currentUser) {
      toast({ title: "Error", description: "Firebase services not available or user not logged in.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    clearAllData(false); 

    try {
      const rosterDocRef = doc(db, "rosters", rosterId);
      const rosterSnap = await getDoc(rosterDocRef);

      if (!rosterSnap.exists()) {
        toast({ title: "Not Found", description: "The selected roster could not be found.", variant: "destructive" });
        setIsProcessing(false);
        await fetchUserRosters(); 
        return;
      }

      const rosterData = rosterSnap.data() as ImageSet;
      if (rosterData.ownerId !== currentUser.uid) {
          toast({ title: "Access Denied", description: "You do not have permission to load this roster.", variant: "destructive" });
          setIsProcessing(false);
          return;
      }
      
      setCurrentRosterDocId(rosterId);
      setOriginalImageStoragePath(rosterData.originalImageStoragePath);
      setOriginalImageSize(rosterData.originalImageDimensions);

      const mainImageRef = storageRef(appFirebaseStorage, rosterData.originalImageStoragePath);
      const mainImageUrl = await getDownloadURL(mainImageRef);
      setImageDataUrl(mainImageUrl);

      const peopleForRoster: EditablePersonInContext[] = [];
      if (rosterData.peopleIds && rosterData.peopleIds.length > 0) {
        // Firestore 'in' query limit is 30. If more people, need pagination or multiple queries.
        const peopleChunks = [];
        for (let i = 0; i < rosterData.peopleIds.length; i += 30) {
            peopleChunks.push(rosterData.peopleIds.slice(i, i + 30));
        }

        for (const chunk of peopleChunks) {
            const peopleQuery = query(collection(db, "people"), where("__name__", "in", chunk));
            const peopleSnapshots = await getDocs(peopleQuery);
            
            for (const personDoc of peopleSnapshots.docs) {
            const personData = personDoc.data() as Person;
            let faceImgUrl = "https://placehold.co/100x100.png"; 
            if (personData.faceImageStoragePath) {
                try {
                const faceRef = storageRef(appFirebaseStorage, personData.faceImageStoragePath);
                faceImgUrl = await getDownloadURL(faceRef);
                } catch (storageError) {
                console.error(`FRC: Error getting download URL for face image ${personData.faceImageStoragePath}:`, storageError);
                toast({title: "Image Load Error", description: `Could not load face for ${personData.name}.`, variant: "destructive"});
                }
            }
            peopleForRoster.push({
                id: personDoc.id,
                name: personData.name,
                aiName: personData.aiName,
                notes: personData.notes,
                company: personData.company,
                hobbies: personData.hobbies,
                birthday: personData.birthday,
                firstMet: personData.firstMet,
                firstMetContext: personData.firstMetContext,
                originalRegion: personData.originalRegion,
                faceImageUrl: faceImgUrl,
                faceImageStoragePath: personData.faceImageStoragePath,
            });
            }
        }
      }
      setRoster(peopleForRoster);
      if (peopleForRoster.length > 0) {
        setSelectedPersonId(peopleForRoster[0].id); 
      } else {
        setSelectedPersonId(null);
      }

      toast({ title: "Roster Loaded", description: `${rosterData.rosterName} is ready for editing.` });

    } catch (error: any) {
      console.error("FRC: Error loading roster for editing:", error);
      toast({ title: "Load Failed", description: `Could not load the roster: ${error.message}`, variant: "destructive" });
      clearAllData(false); 
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser, toast, fetchUserRosters, clearAllData]);


  const deleteRoster = useCallback(async (rosterId: string) => {
    if (!db || !appFirebaseStorage || !currentUser) {
        toast({ title: "Error", description: "Cannot delete: Not logged in or Firebase services unavailable.", variant: "destructive"});
        return;
    }
    setIsProcessing(true);
    try {
        const rosterDocRef = doc(db, "rosters", rosterId);
        const rosterSnap = await getDoc(rosterDocRef);

        if (!rosterSnap.exists()) {
            toast({ title: "Not Found", description: "Roster to delete was not found.", variant: "destructive" });
            setIsProcessing(false);
            return;
        }
        const rosterData = rosterSnap.data() as ImageSet;

        if (rosterData.ownerId !== currentUser.uid) {
            toast({ title: "Access Denied", description: "You cannot delete this roster.", variant: "destructive" });
            setIsProcessing(false);
            return;
        }

        const batch = writeBatch(db);

        if (rosterData.peopleIds && rosterData.peopleIds.length > 0) {
            for (const personId of rosterData.peopleIds) {
                const personDocRef = doc(db, "people", personId);
                const personSnap = await getDoc(personDocRef);
                if (personSnap.exists()) {
                    const personToDelete = personSnap.data() as Person;
                    if (personToDelete.faceImageStoragePath) {
                        const faceImageFileRef = storageRef(appFirebaseStorage, personToDelete.faceImageStoragePath);
                        try {
                            await deleteObject(faceImageFileRef);
                        } catch (e:any) {
                             console.warn("FRC: Failed to delete face image from Storage (may not exist or permissions):", personToDelete.faceImageStoragePath, e.code, e.message);
                        }
                    }
                }
                batch.delete(personDocRef);
            }
        }
        
        if (rosterData.originalImageStoragePath) {
            const originalImageFileRef = storageRef(appFirebaseStorage, rosterData.originalImageStoragePath);
             try {
                await deleteObject(originalImageFileRef);
            } catch (e:any) {
                console.warn("FRC: Failed to delete original image from Storage (may not exist or permissions):", rosterData.originalImageStoragePath, e.code, e.message);
            }
        }
        
        batch.delete(rosterDocRef);

        await batch.commit();
        toast({ title: "Roster Deleted", description: `${rosterData.rosterName} and its contents have been removed.` });

        if (currentRosterDocId === rosterId) {
            clearAllData(false);
        }
        await fetchUserRosters(); 

    } catch (error: any) {
        console.error("FRC: Error deleting roster:", error);
        toast({ title: "Delete Failed", description: `Could not delete roster: ${error.message}`, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  }, [currentUser, toast, fetchUserRosters, currentRosterDocId, clearAllData]);


  return (
    <FaceRosterContext.Provider value={{
      currentUser, 
      imageDataUrl, 
      originalImageStoragePath,
      originalImageSize, 
      drawnRegions, 
      roster, 
      selectedPersonId, 
      isLoading, 
      isProcessing,
      currentRosterDocId,
      userRosters,
      isLoadingUserRosters,
      handleImageUpload, 
      addDrawnRegion, 
      clearDrawnRegions, 
      createRosterFromRegions,
      selectPerson, 
      updatePersonDetails, 
      clearAllData, 
      getScaledRegionForDisplay,
      fetchUserRosters,
      loadRosterForEditing,
      deleteRoster,
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
