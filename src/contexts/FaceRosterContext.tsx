
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db, storage as appFirebaseStorage } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL, uploadString, StringFormat, deleteObject } from 'firebase/storage'; 
import { doc, setDoc, addDoc, updateDoc, collection, serverTimestamp, arrayUnion, arrayRemove, query, where, getDocs, orderBy, getDoc, writeBatch, deleteDoc, runTransaction, FirestoreError } from 'firebase/firestore';

import type { Person, Region, DisplayRegion, ImageSet, EditablePersonInContext, FaceAppearance } from '@/types';
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
  const [roster, setRoster] = useState<EditablePersonInContext[]>([]); // This is the UI roster for the current active image
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentRosterDocId, setCurrentRosterDocId] = useState<string | null>(null);
  const [userRosters, setUserRosters] = useState<ImageSet[]>([]); // List of all roster documents for the user
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
        toast({ title: "Database Index Required", description: `A database index is needed. Error: ${error.message}. The console may provide a link to create it.`, variant: "destructive", duration: 15000});
      } else if (error instanceof FirestoreError) {
         toast({ title: "Error Loading Rosters", description: `Could not fetch your saved rosters. Error: ${error.message} (Code: ${error.code})`, variant: "destructive" });
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
          
          const rosterDocData = {
            ownerId: currentUser.uid,
            rosterName: `Roster - ${file.name.split('.')[0]} - ${new Date().toLocaleDateString()}`, 
            originalImageStoragePath: cloudStoragePath,
            originalImageDimensions: currentImgSize,
            peopleIds: [], // Will be populated as people are added
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          if (!db) throw new Error("Firestore database service is not available.");

          const rosterDocRef = await addDoc(collection(db, "rosters"), rosterDocData);
          setCurrentRosterDocId(rosterDocRef.id);
          await fetchUserRosters();

          toast({ title: "Upload Successful", description: "Image saved to cloud and new roster created." });
        } catch (uploadError: any) {
          console.error("FRC: Cloud upload or Firestore roster creation error:", uploadError);
          let errorDescription = "Could not save image or create roster.";
           if (uploadError instanceof FirestoreError) {
            errorDescription = `Firestore error: ${uploadError.message} (Code: ${uploadError.code}). Check Firestore rules and API status. Data: ${JSON.stringify(uploadError.customData || {})}`;
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
    if (!imageDataUrl || drawnRegions.length === 0 || !currentRosterDocId) {
      toast({ title: "Error", description: "No image, regions, or active roster. Please draw regions first.", variant: "destructive" });
      return;
    }
    if (!currentUser?.uid || !db || !appFirebaseStorage) {
      toast({ title: "Error", description: "User not authenticated or Firebase services unavailable.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    const newEditablePeopleForUI: EditablePersonInContext[] = [];
    const peopleIdsForRosterDoc: string[] = [];
    
    const img = new Image();
    img.crossOrigin = "anonymous"; 

    const imageLoadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (errEventOrMsg) => {
        let specificErrorMessage = 'Image load failed.';
        if (typeof errEventOrMsg === 'string') specificErrorMessage = errEventOrMsg;
        else if (errEventOrMsg instanceof Event) specificErrorMessage = `Image load failed. Event type: ${errEventOrMsg.type}.`;
        else if (errEventOrMsg && typeof errEventOrMsg === 'object' && 'message' in errEventOrMsg) specificErrorMessage = (errEventOrMsg as Error).message;
        
        console.error("FRC: Error loading image for cropping. URL:", imageDataUrl, "Specific error:", specificErrorMessage, "Raw event:", errEventOrMsg);
        reject(new Error(`Failed to load base image for cropping. Error: ${specificErrorMessage}`));
      };
      try {
        img.src = imageDataUrl; 
      } catch (srcError: any) {
        reject(new Error(`Failed to set image source for cropping. Error: ${srcError.message || 'Unknown src assignment error'}`));
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
        ctx.drawImage(img, Math.floor(region.x), Math.floor(region.y), Math.floor(region.width), Math.floor(region.height), 0, 0, tempCanvas.width, tempCanvas.height);
        const faceImageDataURI = tempCanvas.toDataURL('image/png'); 
        
        const croppedFaceFileName = `${currentRosterDocId}_person_${Date.now()}_${i}.png`;
        const croppedFaceStoragePath = `users/${currentUser.uid}/cropped_faces/${croppedFaceFileName}`;
        const croppedFaceRef = storageRef(appFirebaseStorage, croppedFaceStoragePath);
        
        const uploadResult = await uploadString(croppedFaceRef, faceImageDataURI, StringFormat.DATA_URL);
        const faceImageDownloadUrl = await getDownloadURL(uploadResult.ref);
        
        const personBaseName = `Person ${roster.length + newEditablePeopleForUI.length + 1}`;
        const newFaceAppearance: FaceAppearance = {
          rosterId: currentRosterDocId,
          faceImageStoragePath: croppedFaceStoragePath,
          originalRegion: region,
        };

        // For simplicity in this step, we'll create a new person document for each region.
        // A more advanced implementation would search for existing people to link.
        const personData: Omit<Person, 'id'> = { 
          name: personBaseName,
          aiName: personBaseName,
          notes: '',
          company: '',
          hobbies: '',
          birthday: '',
          firstMet: '',
          firstMetContext: '',
          faceAppearances: [newFaceAppearance],
          addedBy: currentUser.uid,
          rosterIds: [currentRosterDocId],
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp(), 
        };
        const personDocRef = await addDoc(collection(db, "people"), personData);
        peopleIdsForRosterDoc.push(personDocRef.id);

        newEditablePeopleForUI.push({
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
          currentRosterAppearance: {
             rosterId: currentRosterDocId,
             faceImageStoragePath: croppedFaceStoragePath,
             originalRegion: region,
          }
        });
      }

      if (peopleIdsForRosterDoc.length > 0) {
        const rosterDocToUpdateRef = doc(db, "rosters", currentRosterDocId);
        await updateDoc(rosterDocToUpdateRef, {
          peopleIds: arrayUnion(...peopleIdsForRosterDoc),
          updatedAt: serverTimestamp()
        });
        // Update userRosters list locally if this roster was new or changed
        setUserRosters(prev => prev.map(r => r.id === currentRosterDocId ? {...r, peopleIds: Array.from(new Set([...(r.peopleIds || []), ...peopleIdsForRosterDoc])) } : r));

      }

      setRoster(prev => [...prev, ...newEditablePeopleForUI]); 
      setDrawnRegions([]); 
      toast({ title: "Roster Updated", description: `${newEditablePeopleForUI.length} person(s) added to the current roster.` });
    } catch (error: any) {
      console.error("FRC: Error during roster creation (cropping/saving people):", error.message, error.stack, error);
      toast({ title: "Roster Creation Failed", description: `Could not process regions: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [imageDataUrl, drawnRegions, roster.length, toast, currentUser, currentRosterDocId]);

  const selectPerson = useCallback((id: string | null) => {
    setSelectedPersonId(id);
  }, []);

  const updatePersonDetails = useCallback(async (personDocId: string, details: Partial<EditablePersonInContext>) => {
    if (!db || !currentUser?.uid) {
        toast({ title: "Error", description: "User not authenticated or database service unavailable.", variant: "destructive" });
        return;
    }
    
    // Optimistically update UI
    setRoster(prevRoster =>
      prevRoster.map(person =>
        person.id === personDocId ? { ...person, ...details } : person
      )
    );
    
    const firestoreUpdateData: { [key: string]: any } = { updatedAt: serverTimestamp() };
    if (details.name !== undefined) firestoreUpdateData.name = details.name;
    if (details.notes !== undefined) firestoreUpdateData.notes = details.notes;
    if (details.company !== undefined) firestoreUpdateData.company = details.company;
    if (details.hobbies !== undefined) firestoreUpdateData.hobbies = details.hobbies;
    if (details.birthday !== undefined) firestoreUpdateData.birthday = details.birthday;
    if (details.firstMet !== undefined) firestoreUpdateData.firstMet = details.firstMet;
    if (details.firstMetContext !== undefined) firestoreUpdateData.firstMetContext = details.firstMetContext;
    // Note: `faceAppearances` are managed in `createRosterFromRegions`
    
    try {
        const personRef = doc(db, "people", personDocId);
        await updateDoc(personRef, firestoreUpdateData);
        toast({ title: "Details Updated", description: "Person's information saved to cloud." });
    } catch (error: any) {
        console.error(`FRC: Error updating person details (ID: ${personDocId}) in Firestore:`, error);
        toast({ title: "Update Failed", description: `Could not save changes for ${details.name || 'person'} to cloud: ${error.message}`, variant: "destructive" });
        // Potentially revert optimistic update here if needed
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

      const peopleForRosterUI: EditablePersonInContext[] = [];
      if (rosterData.peopleIds && rosterData.peopleIds.length > 0) {
        const peopleChunks = [];
        for (let i = 0; i < rosterData.peopleIds.length; i += 30) { // Firestore 'in' query max 30
            peopleChunks.push(rosterData.peopleIds.slice(i, i + 30));
        }

        for (const chunk of peopleChunks) {
            if (chunk.length === 0) continue;
            const peopleQuery = query(collection(db, "people"), where("__name__", "in", chunk));
            const peopleSnapshots = await getDocs(peopleQuery);
            
            for (const personDoc of peopleSnapshots.docs) {
              const personData = personDoc.data() as Person;
              
              // Find the specific face appearance for the current roster
              const appearanceForThisRoster = personData.faceAppearances?.find(app => app.rosterId === rosterId);
              
              let faceImgUrl = "https://placehold.co/100x100.png"; 
              let currentAppearanceDetails: EditablePersonInContext['currentRosterAppearance'] = undefined;

              if (appearanceForThisRoster && appearanceForThisRoster.faceImageStoragePath) {
                  try {
                    const faceRef = storageRef(appFirebaseStorage, appearanceForThisRoster.faceImageStoragePath);
                    faceImgUrl = await getDownloadURL(faceRef);
                    currentAppearanceDetails = {
                        rosterId: rosterId,
                        faceImageStoragePath: appearanceForThisRoster.faceImageStoragePath,
                        originalRegion: appearanceForThisRoster.originalRegion,
                    };
                  } catch (storageError) {
                    console.error(`FRC: Error getting download URL for face image ${appearanceForThisRoster.faceImageStoragePath}:`, storageError);
                    toast({title: "Image Load Error", description: `Could not load face for ${personData.name}.`, variant: "destructive"});
                  }
              } else {
                  console.warn(`FRC: No matching face appearance found for person ${personData.id} in roster ${rosterId}, or path missing.`);
              }

              peopleForRosterUI.push({
                  id: personDoc.id,
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
      if (peopleForRosterUI.length > 0) {
        setSelectedPersonId(peopleForRosterUI[0].id); 
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
        const peopleToDeleteFullData: Person[] = [];

        // Fetch full person docs to get all their faceImageStoragePaths if they only belong to this roster
        if (rosterData.peopleIds && rosterData.peopleIds.length > 0) {
            const peopleQuery = query(collection(db, "people"), where("__name__", "in", rosterData.peopleIds));
            const peopleSnapshots = await getDocs(peopleQuery);
            peopleSnapshots.forEach(personDoc => {
                peopleToDeleteFullData.push({ id: personDoc.id, ...personDoc.data() } as Person);
            });
        }
        
        for (const person of peopleToDeleteFullData) {
            // Option 1: Delete person if only in this roster
            // Option 2: Remove this roster's appearance from person, then delete person if no appearances left
            // For now, let's implement: if a person is only in this roster, delete them. Otherwise, just remove this roster's appearance.
            const updatedAppearances = person.faceAppearances?.filter(app => app.rosterId !== rosterId);
            const updatedRosterIds = person.rosterIds?.filter(id => id !== rosterId);

            const appearanceToDelete = person.faceAppearances?.find(app => app.rosterId === rosterId);
            if (appearanceToDelete?.faceImageStoragePath) {
                 const faceImageFileRef = storageRef(appFirebaseStorage, appearanceToDelete.faceImageStoragePath);
                 try { await deleteObject(faceImageFileRef); } catch (e:any) { console.warn("FRC: Failed to delete a face image from Storage:", appearanceToDelete.faceImageStoragePath, e.message); }
            }

            if (updatedRosterIds && updatedRosterIds.length > 0) { // Person exists in other rosters
                batch.update(doc(db, "people", person.id), {
                    faceAppearances: updatedAppearances,
                    rosterIds: updatedRosterIds,
                    updatedAt: serverTimestamp()
                });
            } else { // Person only existed in this roster, or something is wrong
                batch.delete(doc(db, "people", person.id));
                 // Also delete all other face images if this person doc is deleted (though ideally they should be gone if appearances are managed correctly)
                person.faceAppearances?.forEach(async app => {
                    if (app.rosterId !== rosterId && app.faceImageStoragePath) { // Don't re-delete the one we might have just deleted
                         const otherFaceRef = storageRef(appFirebaseStorage, app.faceImageStoragePath);
                         try { await deleteObject(otherFaceRef); } catch (e:any) { console.warn("FRC: Clean-up: Failed to delete another face image:", app.faceImageStoragePath, e.message); }
                    }
                });
            }
        }
        
        if (rosterData.originalImageStoragePath) {
            const originalImageFileRef = storageRef(appFirebaseStorage, rosterData.originalImageStoragePath);
             try { await deleteObject(originalImageFileRef); } catch (e:any) { console.warn("FRC: Failed to delete original image from Storage:", rosterData.originalImageStoragePath, e.message); }
        }
        
        batch.delete(rosterDocRef);
        await batch.commit();
        toast({ title: "Roster Deleted", description: `${rosterData.rosterName} and associated people/images specific to it removed.` });

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
