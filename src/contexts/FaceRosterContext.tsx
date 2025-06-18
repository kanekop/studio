
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db, storage as appFirebaseStorage } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL, uploadString, StringFormat, deleteObject } from 'firebase/storage'; 
import { doc, setDoc, addDoc, updateDoc, collection, serverTimestamp, arrayUnion, arrayRemove, query, where, getDocs, orderBy, getDoc, writeBatch, deleteDoc, runTransaction, FirestoreError, Timestamp } from 'firebase/firestore';

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
  selectedPeopleForMerge: string[];

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  createRosterFromRegions: () => Promise<void>;
  selectPerson: (id: string | null) => void;
  updatePersonDetails: (personId: string, details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl' >>, isNewPersonSaveOperation: boolean) => Promise<void>;
  clearAllData: (showToast?: boolean) => void; 
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
  fetchUserRosters: () => Promise<void>;
  loadRosterForEditing: (rosterId: string) => Promise<void>;
  deleteRoster: (rosterId: string) => Promise<void>;
  togglePersonInMergeSelection: (personId: string) => void;
  clearMergeSelection: () => void;
  performMergeOfSelectedPeople: () => Promise<void>;
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
  const [selectedPeopleForMerge, setSelectedPeopleForMerge] = useState<string[]>([]);
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
    setSelectedPeopleForMerge([]);
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
          
          console.log("FRC:handleImageUpload: FirebaseConfig looks okay. Attempting to upload original image...");
          const imageName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const imagePath = `users/${currentUser.uid}/original_images/${imageName}`;
          const imageFileRef = storageRef(appFirebaseStorage, imagePath);

          const uploadTask = await uploadBytes(imageFileRef, file);
          const downloadURL = await getDownloadURL(uploadTask.ref);
          const cloudStoragePath = uploadTask.ref.fullPath;
          console.log("FRC:handleImageUpload: Original image uploaded to Storage. Path:", cloudStoragePath, "URL:", downloadURL);

          setOriginalImageStoragePath(cloudStoragePath);
          setImageDataUrl(downloadURL); 
          
          const rosterDocData: Omit<ImageSet, 'id'> = {
            ownerId: currentUser.uid,
            rosterName: `Roster - ${file.name.split('.')[0]} - ${new Date().toLocaleDateString()}`, 
            originalImageStoragePath: cloudStoragePath,
            originalImageDimensions: currentImgSize,
            peopleIds: [], 
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          if (!db) throw new Error("Firestore database service is not available.");
          console.log("FRC:handleImageUpload: Attempting to add roster document to Firestore. Data:", rosterDocData);

          const rosterDocRef = await addDoc(collection(db, "rosters"), rosterDocData);
          console.log("FRC:handleImageUpload: Roster document added to Firestore. ID:", rosterDocRef.id);
          setCurrentRosterDocId(rosterDocRef.id);
          await fetchUserRosters();

          toast({ title: "Upload Successful", description: "Image saved and new roster ready. Draw regions and add people." });
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
      console.warn("FRC: convertDisplayToOriginalRegion returning zeroed region due to missing sizes.");
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
    if(originalRegion.width === 0 && originalRegion.height === 0) {
      toast({ title: "Error", description: "Cannot add region: failed to calculate original region coordinates.", variant: "destructive" });
      return;
    }
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
    const temporaryPeopleForUI: EditablePersonInContext[] = [];
    
    const img = new Image();
    img.crossOrigin = "anonymous"; 

    const imageLoadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (errEventOrMsg) => {
        let specificErrorMessage = 'Image load failed for cropping.';
        if (typeof errEventOrMsg === 'string') specificErrorMessage = errEventOrMsg;
        else if (errEventOrMsg instanceof Event) specificErrorMessage = `Image load failed. Event type: ${errEventOrMsg.type}.`;
        else if (errEventOrMsg && typeof errEventOrMsg === 'object' && 'message' in errEventOrMsg) specificErrorMessage = (errEventOrMsg as Error).message;
        console.error("FRC: Error loading image for cropping. URL:", imageDataUrl, "Specific error:", specificErrorMessage, "Raw event:", errEventOrMsg);
        reject(new Error(`Failed to load base image for cropping. Error: ${specificErrorMessage}`));
      };
      img.src = imageDataUrl; 
    });

    try {
      await imageLoadPromise;

      for (let i = 0; i < drawnRegions.length; i++) {
        const region = drawnRegions[i]; // This is already in original image coordinates
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.max(1, Math.floor(region.width)); 
        tempCanvas.height = Math.max(1, Math.floor(region.height));
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) {
            console.warn(`FRC: Could not get 2D context for canvas for region ${i}`);
            continue; 
        }
        ctx.drawImage(img, Math.floor(region.x), Math.floor(region.y), Math.floor(region.width), Math.floor(region.height), 0, 0, tempCanvas.width, tempCanvas.height);
        const faceImageDataURI = tempCanvas.toDataURL('image/png'); 
        
        const tempId = `temp_${Date.now()}_${i}`;
        temporaryPeopleForUI.push({
          id: tempId,
          isNew: true,
          faceImageUrl: faceImageDataURI, // This is a data URI initially
          tempFaceImageDataUri: faceImageDataURI,
          name: `Person ${roster.length + temporaryPeopleForUI.length + 1}`, // Default name
          aiName: `Person ${roster.length + temporaryPeopleForUI.length + 1}`,
          notes: '',
          company: '',
          hobbies: '',
          birthday: '',
          firstMet: '',
          firstMetContext: '',
          tempOriginalRegion: region, // Store the region used for this crop
        });
      }

      setRoster(prev => [...prev, ...temporaryPeopleForUI]); 
      setDrawnRegions([]); 
      if (temporaryPeopleForUI.length > 0) {
        setSelectedPersonId(temporaryPeopleForUI[0].id); // Select the first new person
        toast({ title: "Regions Processed", description: `${temporaryPeopleForUI.length} new face(s) added to editor. Name and save them individually.` });
      } else {
        toast({ title: "No Regions Processed", description: `Could not process any regions.`, variant: "destructive" });
      }
    } catch (error: any) {
      console.error("FRC: Error during local region processing (cropping):", error.message, error.stack, error);
      toast({ title: "Region Processing Failed", description: `Could not process regions: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [imageDataUrl, drawnRegions, roster.length, toast, currentUser, currentRosterDocId]);


  const selectPerson = useCallback((id: string | null) => {
    setSelectedPersonId(id);
  }, []);

  const updatePersonDetails = useCallback(async (
    personIdToUpdate: string, // This could be a temp ID or a Firestore ID
    details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl' | 'isNew' | 'tempFaceImageDataUri' | 'tempOriginalRegion'>>,
    isNewPersonSaveOperation: boolean
  ) => {
    if (!db || !currentUser?.uid || !currentRosterDocId) {
        toast({ title: "Error", description: "User not authenticated, no active roster, or database service unavailable.", variant: "destructive" });
        return;
    }
    
    setIsProcessing(true);
    const localPersonEntry = roster.find(p => p.id === personIdToUpdate);
    if (!localPersonEntry) {
        toast({ title: "Error", description: "Person to update not found in local roster.", variant: "destructive" });
        setIsProcessing(false);
        return;
    }

    const finalName = (details.name || localPersonEntry.name || `Unnamed Person`).trim();
    if (!finalName) {
      toast({ title: "Validation Error", description: "Person's name cannot be empty.", variant: "destructive"});
      setIsProcessing(false);
      return;
    }


    try {
        let targetPersonId = personIdToUpdate;
        let finalFaceImageUrl = localPersonEntry.faceImageUrl; // Keep existing URL unless it's a new person
        let personDocRefPath: string;

        if (isNewPersonSaveOperation && localPersonEntry.isNew) {
            if (!localPersonEntry.tempFaceImageDataUri || !localPersonEntry.tempOriginalRegion) {
                throw new Error("Missing temporary image data or region for new person save.");
            }
            // Search for existing person by name (for this user)
            const peopleQuery = query(
                collection(db, "people"),
                where("name", "==", finalName),
                where("addedBy", "==", currentUser.uid)
            );
            const querySnapshot = await getDocs(peopleQuery);

            let existingPersonDocData: Person | null = null;
            let existingPersonDocId: string | null = null;

            if (!querySnapshot.empty) {
                const firstMatch = querySnapshot.docs[0];
                existingPersonDocId = firstMatch.id;
                existingPersonDocData = { id: firstMatch.id, ...firstMatch.data() } as Person;
                toast({ title: "Existing Person Found", description: `Linking to existing person: ${finalName}`});
            }

            // Upload face image to Cloud Storage
            const croppedFaceFileName = `${currentRosterDocId}_${existingPersonDocId || 'new'}_${Date.now()}.png`;
            const faceImageStoragePath = `users/${currentUser.uid}/cropped_faces/${croppedFaceFileName}`;
            const croppedFaceRef = storageRef(appFirebaseStorage, faceImageStoragePath);
            
            const uploadResult = await uploadString(croppedFaceRef, localPersonEntry.tempFaceImageDataUri, StringFormat.DATA_URL);
            finalFaceImageUrl = await getDownloadURL(uploadResult.ref); // This is now the Storage URL

            const newAppearance: FaceAppearance = {
                rosterId: currentRosterDocId,
                faceImageStoragePath: faceImageStoragePath, // Store the path, not the download URL
                originalRegion: localPersonEntry.tempOriginalRegion,
            };

            if (existingPersonDocData && existingPersonDocId) { // Update existing person
                targetPersonId = existingPersonDocId;
                personDocRefPath = `people/${existingPersonDocId}`;
                const updatedFaceAppearances = [...(existingPersonDocData.faceAppearances || []), newAppearance];
                const updatedRosterIds = Array.from(new Set([...(existingPersonDocData.rosterIds || []), currentRosterDocId]));
                
                await updateDoc(doc(db, personDocRefPath), {
                    ...details, 
                    name: finalName, 
                    faceAppearances: updatedFaceAppearances,
                    rosterIds: updatedRosterIds,
                    updatedAt: serverTimestamp()
                });
            } else { // Create new person
                const newPersonData: Omit<Person, 'id'> = {
                    name: finalName,
                    aiName: details.aiName || finalName,
                    notes: details.notes || '',
                    company: details.company || '',
                    hobbies: details.hobbies || '',
                    birthday: details.birthday || '',
                    firstMet: details.firstMet || '',
                    firstMetContext: details.firstMetContext || '',
                    faceAppearances: [newAppearance],
                    addedBy: currentUser.uid,
                    rosterIds: [currentRosterDocId],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                const newPersonDocRef = await addDoc(collection(db, "people"), newPersonData);
                targetPersonId = newPersonDocRef.id;
                personDocRefPath = `people/${newPersonDocRef.id}`;
            }
            // Add personId to the current roster document
            await updateDoc(doc(db, "rosters", currentRosterDocId), {
                peopleIds: arrayUnion(targetPersonId),
                updatedAt: serverTimestamp()
            });
             setUserRosters(prev => prev.map(r => r.id === currentRosterDocId ? {...r, peopleIds: Array.from(new Set([...(r.peopleIds || []), targetPersonId])) } : r));


        } else { // Standard update for an already saved person
            personDocRefPath = `people/${personIdToUpdate}`; // personIdToUpdate is already Firestore ID
            const firestoreUpdateData: { [key: string]: any } = { 
                ...details,
                name: finalName, 
                updatedAt: serverTimestamp() 
            };
            await updateDoc(doc(db, personDocRefPath), firestoreUpdateData);
        }
        
        setRoster(prevRoster =>
          prevRoster.map(p =>
            p.id === personIdToUpdate 
              ? { 
                  ...p, 
                  ...details,
                  name: finalName, 
                  id: targetPersonId, 
                  isNew: false, 
                  tempFaceImageDataUri: undefined,
                  tempOriginalRegion: undefined,
                  faceImageUrl: finalFaceImageUrl, 
                  currentRosterAppearance: isNewPersonSaveOperation && localPersonEntry.tempOriginalRegion && finalFaceImageUrl.includes("firebasestorage") ? {
                      rosterId: currentRosterDocId,
                      faceImageStoragePath: `users/${currentUser?.uid}/cropped_faces/${finalFaceImageUrl.split('%2F').pop()?.split('?')[0].replace(`${currentRosterDocId}_`, '')}`, // Attempt to reconstruct path
                      originalRegion: localPersonEntry.tempOriginalRegion,
                  } : p.currentRosterAppearance,
                }
              : p
          )
        );
        if (isNewPersonSaveOperation && selectedPersonId === personIdToUpdate && selectedPersonId !== targetPersonId) {
          setSelectedPersonId(targetPersonId);
        }

        toast({ title: "Details Saved", description: `${finalName}'s information saved to cloud.` });

    } catch (error: any) {
        console.error(`FRC: Error updating/saving person details (ID: ${personIdToUpdate}) in Firestore:`, error);
        toast({ title: "Save Failed", description: `Could not save changes for ${finalName || 'person'} to cloud: ${error.message}`, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  }, [currentUser, currentRosterDocId, toast, roster, selectedPersonId]);

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
        for (let i = 0; i < rosterData.peopleIds.length; i += 30) { 
            peopleChunks.push(rosterData.peopleIds.slice(i, i + 30));
        }

        for (const chunk of peopleChunks) {
            if (chunk.length === 0) continue;
            const peopleQuery = query(collection(db, "people"), where("__name__", "in", chunk)); 
            const peopleSnapshots = await getDocs(peopleQuery);
            
            for (const personDoc of peopleSnapshots.docs) {
              const personData = { id: personDoc.id, ...personDoc.data()} as Person;
              
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
            await fetchUserRosters();
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
            const personRef = doc(db, "people", personId);
            const personSnap = await getDoc(personRef); // Use await here
            if (personSnap.exists()) {
              const personData = personSnap.data() as Person;
              const appearanceToDelete = personData.faceAppearances?.find(app => app.rosterId === rosterId);
              if (appearanceToDelete?.faceImageStoragePath) {
                const faceImageFileRef = storageRef(appFirebaseStorage, appearanceToDelete.faceImageStoragePath);
                try { await deleteObject(faceImageFileRef); } catch (e:any) { console.warn("FRC: Failed to delete a face image during roster deletion:", appearanceToDelete.faceImageStoragePath, e.message); }
              }

              const remainingAppearances = personData.faceAppearances?.filter(app => app.rosterId !== rosterId);
              const remainingRosterIds = personData.rosterIds?.filter(id => id !== rosterId);

              if (remainingRosterIds && remainingRosterIds.length > 0) {
                batch.update(personRef, {
                  faceAppearances: remainingAppearances,
                  rosterIds: remainingRosterIds,
                  updatedAt: serverTimestamp()
                });
              } else {
                // If no other rosters link to this person, delete the person entirely
                // And delete ALL their face images from storage
                personData.faceAppearances?.forEach(async app => { // ensure all appearances are considered
                    if (app.faceImageStoragePath) { 
                         const otherFaceRef = storageRef(appFirebaseStorage, app.faceImageStoragePath);
                         try { await deleteObject(otherFaceRef); } catch (e:any) { console.warn("FRC: Clean-up: Failed to delete other face image:", app.faceImageStoragePath, e.message); }
                    }
                });
                batch.delete(personRef);
              }
            }
          }
        }
        
        if (rosterData.originalImageStoragePath) {
            const originalImageFileRef = storageRef(appFirebaseStorage, rosterData.originalImageStoragePath);
             try { await deleteObject(originalImageFileRef); } catch (e:any) { console.warn("FRC: Failed to delete original image from Storage:", rosterData.originalImageStoragePath, e.message); }
        }
        
        batch.delete(rosterDocRef);
        await batch.commit();
        toast({ title: "Roster Deleted", description: `${rosterData.rosterName} and associated data removed.` });

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

  const togglePersonInMergeSelection = useCallback((personId: string) => {
    setSelectedPeopleForMerge(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        if (prev.length < 2) { // Allow selecting up to 2 people
          return [...prev, personId];
        }
        return prev; // Limit to 2 selections
      }
    });
  }, []);

  const clearMergeSelection = useCallback(() => {
    setSelectedPeopleForMerge([]);
  }, []);

  const performMergeOfSelectedPeople = useCallback(async () => {
    if (selectedPeopleForMerge.length !== 2) {
      toast({ title: "Merge Error", description: "Please select exactly two people to merge.", variant: "destructive" });
      return;
    }
    if (!db || !currentUser) {
      toast({ title: "Error", description: "Not logged in or Firebase unavailable.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const [id1, id2] = selectedPeopleForMerge;

    // For simplicity, let's designate the first selected (id1) as the TARGET and id2 as SOURCE (to be deleted)
    // A more advanced version might let the user choose the target.
    const targetPersonId = id1;
    const sourcePersonId = id2;

    try {
      const targetPersonRef = doc(db, "people", targetPersonId);
      const sourcePersonRef = doc(db, "people", sourcePersonId);

      const targetDocSnap = await getDoc(targetPersonRef);
      const sourceDocSnap = await getDoc(sourcePersonRef);

      if (!targetDocSnap.exists() || !sourceDocSnap.exists()) {
        throw new Error("One or both selected people not found in the database.");
      }

      const targetData = targetDocSnap.data() as Person;
      const sourceData = sourceDocSnap.data() as Person;

      // --- Consolidate Data ---
      // 1. Face Appearances: Combine, ensuring uniqueness by rosterId and path (though path should be unique enough)
      const combinedFaceAppearances = [...targetData.faceAppearances];
      sourceData.faceAppearances.forEach(sourceAppearance => {
        if (!combinedFaceAppearances.some(targetAppearance => 
            targetAppearance.rosterId === sourceAppearance.rosterId && 
            targetAppearance.faceImageStoragePath === sourceAppearance.faceImageStoragePath
        )) {
          combinedFaceAppearances.push(sourceAppearance);
        }
      });

      // 2. Roster IDs: Combine and make unique
      const combinedRosterIds = Array.from(new Set([...targetData.rosterIds, ...sourceData.rosterIds]));

      // 3. Other Fields (simple strategy: target's takes precedence, append notes)
      const mergedNotes = [targetData.notes, `Merged from ${sourceData.name}:\n${sourceData.notes}`]
                          .filter(Boolean).join("\n---\n").trim();

      const updatedTargetData: Partial<Person> = {
        name: targetData.name, // Keep target's name by default
        notes: mergedNotes,
        company: targetData.company || sourceData.company,
        hobbies: targetData.hobbies || sourceData.hobbies,
        birthday: targetData.birthday || sourceData.birthday,
        firstMet: targetData.firstMet || sourceData.firstMet,
        firstMetContext: targetData.firstMetContext || sourceData.firstMetContext,
        // aiName, knownAcquaintances, spouse could be handled similarly or with user input in future
        faceAppearances: combinedFaceAppearances,
        rosterIds: combinedRosterIds,
        updatedAt: serverTimestamp(),
      };

      // --- Firestore Operations ---
      const batch = writeBatch(db);
      batch.update(targetPersonRef, updatedTargetData);
      batch.delete(sourcePersonRef);
      await batch.commit();

      // Update roster documents that pointed to the sourcePersonId
      // This needs to be done after the people merge, as we need the final list of combinedRosterIds
      // and to ensure the target person exists.
      const rostersToUpdate = new Set<string>(sourceData.rosterIds); // Rosters that source person was part of
      for (const rosterId of rostersToUpdate) {
          const rosterRef = doc(db, "rosters", rosterId);
          // We need to fetch the roster to correctly update its peopleIds array
          const rosterDoc = await getDoc(rosterRef);
          if (rosterDoc.exists()) {
              let currentPeopleIds = (rosterDoc.data() as ImageSet).peopleIds || [];
              // Remove sourceId if present
              currentPeopleIds = currentPeopleIds.filter(id => id !== sourcePersonId);
              // Add targetId if not present
              if (!currentPeopleIds.includes(targetPersonId)) {
                  currentPeopleIds.push(targetPersonId);
              }
              await updateDoc(rosterRef, { 
                peopleIds: currentPeopleIds,
                updatedAt: serverTimestamp()
              });
          }
      }
      
      // --- Update Local State ---
      setRoster(prevRoster => {
        const newRoster = prevRoster.filter(p => p.id !== sourcePersonId);
        return newRoster.map(p => 
          p.id === targetPersonId 
            ? { ...p, ...updatedTargetData, faceImageUrl: p.faceImageUrl } // Keep current faceImageUrl for UI
            : p
        );
      });

      if (selectedPersonId === sourcePersonId) {
        setSelectedPersonId(targetPersonId); // If deleted person was selected, select the target
      }
      
      clearMergeSelection();
      await fetchUserRosters(); // Refresh roster list on landing page if any roster was affected
      toast({ title: "Merge Successful", description: `${sourceData.name} merged into ${targetData.name}.` });

    } catch (error: any) {
      console.error("FRC: Error merging people:", error);
      toast({ title: "Merge Failed", description: `Could not merge people: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPeopleForMerge, currentUser, db, toast, roster, selectedPersonId, clearMergeSelection, fetchUserRosters]);


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
      selectedPeopleForMerge,
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
      togglePersonInMergeSelection,
      clearMergeSelection,
      performMergeOfSelectedPeople,
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

