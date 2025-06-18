
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
  allUserPeople: Person[];
  isLoadingAllUserPeople: boolean;

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  createRosterFromRegions: () => Promise<void>;
  selectPerson: (id: string | null) => void;
  updatePersonDetails: (personId: string, details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl'>>, isNewPersonSaveOperation?: boolean) => Promise<void>;
  clearAllData: (showToast?: boolean) => void; 
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
  fetchUserRosters: () => Promise<void>;
  loadRosterForEditing: (rosterId: string) => Promise<void>;
  deleteRoster: (rosterId: string) => Promise<void>;
  fetchAllUserPeople: () => Promise<void>;
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
  const [allUserPeople, setAllUserPeople] = useState<Person[]>([]);
  const [isLoadingAllUserPeople, setIsLoadingAllUserPeople] = useState<boolean>(false);
  const { toast } = useToast();

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
        toast({ title: "Database Index Required", description: `A database index is needed for rosters. Error: ${error.message}. The console may provide a link to create it.`, variant: "destructive", duration: 15000});
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

  const fetchAllUserPeople = useCallback(async () => {
    if (!currentUser || !db) {
      setAllUserPeople([]);
      return;
    }
    setIsLoadingAllUserPeople(true);
    try {
      const q = query(
        collection(db, "people"),
        where("addedBy", "==", currentUser.uid),
        orderBy("name", "asc") 
      );
      const querySnapshot = await getDocs(q);
      const fetchedPeople: Person[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPeople.push({ id: doc.id, ...doc.data() } as Person);
      });
      setAllUserPeople(fetchedPeople);
    } catch (error) {
      console.error("FRC: Error fetching all user people:", error);
       if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes('query requires an index')) {
        toast({ title: "Database Index Required", description: `A database index is needed for people list. Error: ${error.message}. The console may provide a link to create it.`, variant: "destructive", duration: 15000});
      } else if (error instanceof FirestoreError) {
        toast({ title: "Error Loading People", description: `Could not fetch your people list. Error: ${error.message} (Code: ${error.code})`, variant: "destructive" });
      } else {
        toast({ title: "Error Loading People", description: `Could not fetch your people list. Error: ${(error as Error).message}`, variant: "destructive" });
      }
      setAllUserPeople([]);
    } finally {
      setIsLoadingAllUserPeople(false);
    }
  }, [currentUser, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
      if (!user) {
        clearAllData(false); 
        setUserRosters([]);
        setAllUserPeople([]);
      } else {
        fetchUserRosters();
        fetchAllUserPeople(); 
      }
    });
    return () => unsubscribe();
  }, [fetchUserRosters, fetchAllUserPeople, clearAllData]);


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

          const rosterDocRef = await addDoc(collection(db, "rosters"), rosterDocData);
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
        const region = drawnRegions[i];
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
          tempFaceImageDataUri: faceImageDataURI, 
          tempOriginalRegion: region, 
          name: `Person ${roster.length + temporaryPeopleForUI.length + 1}`,
          notes: '',
          company: '',
          hobbies: '',
          birthday: '',
          firstMet: '',
          firstMetContext: '',
          faceImageUrl: faceImageDataURI, 
        });
      }

      setRoster(prev => [...prev, ...temporaryPeopleForUI]); 
      setDrawnRegions([]); 
      if (temporaryPeopleForUI.length > 0) {
        setSelectedPersonId(temporaryPeopleForUI[0].id);
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
    personIdToUpdate: string, 
    details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl'>>,
    isNewPersonSaveOperation: boolean = false // Kept for consistency but logic for isNew is primarily from localPersonEntry.isNew
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

    let targetPersonId = personIdToUpdate;
    let finalFaceImageUrl = localPersonEntry.faceImageUrl; 
    let batch = writeBatch(db);

    try {
        if (localPersonEntry.isNew && localPersonEntry.tempFaceImageDataUri && localPersonEntry.tempOriginalRegion) {
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
                targetPersonId = existingPersonDocId; // Use existing person's ID
                toast({ title: "Existing Person Found", description: `Linking to existing person: ${finalName}`});
            }
            
            const croppedFaceFileName = `${currentRosterDocId}_${targetPersonId}_${Date.now()}.png`;
            const faceImageStoragePath = `users/${currentUser.uid}/cropped_faces/${croppedFaceFileName}`;
            const croppedFaceRef = storageRef(appFirebaseStorage, faceImageStoragePath);
            
            const uploadResult = await uploadString(croppedFaceRef, localPersonEntry.tempFaceImageDataUri, StringFormat.DATA_URL);
            finalFaceImageUrl = await getDownloadURL(uploadResult.ref);

            const newAppearance: FaceAppearance = {
                rosterId: currentRosterDocId,
                faceImageStoragePath: faceImageStoragePath,
                originalRegion: localPersonEntry.tempOriginalRegion,
            };

            if (existingPersonDocData && existingPersonDocId) { // Update existing person
                const personRef = doc(db, "people", existingPersonDocId);
                batch.update(personRef, {
                    ...details, // Apply new details
                    name: finalName, // Ensure name is updated if changed
                    faceAppearances: arrayUnion(newAppearance),
                    rosterIds: arrayUnion(currentRosterDocId),
                    updatedAt: serverTimestamp()
                });
            } else { // Create new person
                const newPersonDocRef = doc(collection(db, "people")); 
                targetPersonId = newPersonDocRef.id; // Get ID for new person
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
                batch.set(newPersonDocRef, newPersonData);
            }
            
            const rosterRef = doc(db, "rosters", currentRosterDocId);
            batch.update(rosterRef, {
                peopleIds: arrayUnion(targetPersonId), // Use the correct targetPersonId
                updatedAt: serverTimestamp()
            });
            
            await batch.commit();
            await fetchUserRosters(); // Update list of rosters (might have new people counts)
            await fetchAllUserPeople(); // Update master list of people

        } else if (!localPersonEntry.isNew) { // Existing person being edited (not first save from temp)
            const personDocRef = doc(db, "people", personIdToUpdate); 
            const firestoreUpdateData: { [key: string]: any } = { 
                ...details,
                name: finalName, 
                updatedAt: serverTimestamp() 
            };
            await updateDoc(personDocRef, firestoreUpdateData);
            await fetchAllUserPeople(); // Update master list of people
        } else {
          throw new Error("updatePersonDetails called for a local 'new' person without temp data, or for a non-new person in an unexpected way.");
        }
        
        setRoster(prevRoster =>
          prevRoster.map(p =>
            p.id === personIdToUpdate 
              ? { 
                  ...p, 
                  ...details,
                  name: finalName, 
                  id: targetPersonId, // Crucial: update ID if it changed from temp to permanent or linked to existing
                  isNew: false, 
                  tempFaceImageDataUri: undefined,
                  tempOriginalRegion: undefined,
                  faceImageUrl: finalFaceImageUrl, 
                  currentRosterAppearance: (localPersonEntry.isNew && localPersonEntry.tempOriginalRegion && finalFaceImageUrl && finalFaceImageUrl.includes("firebasestorage")) ? {
                      rosterId: currentRosterDocId,
                      faceImageStoragePath: finalFaceImageUrl, 
                      originalRegion: localPersonEntry.tempOriginalRegion,
                  } : p.currentRosterAppearance,
                }
              : p
          )
        );

        if (selectedPersonId === personIdToUpdate && selectedPersonId !== targetPersonId) {
          setSelectedPersonId(targetPersonId);
        }

        toast({ title: "Details Saved", description: `${finalName}'s information saved to cloud.` });

    } catch (error: any) {
        console.error(`FRC: Error updating/saving person details (ID: ${personIdToUpdate}) in Firestore:`, error);
        toast({ title: "Save Failed", description: `Could not save changes for ${finalName || 'person'} to cloud: ${error.message}`, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  }, [currentUser, currentRosterDocId, toast, roster, selectedPersonId, fetchAllUserPeople, fetchUserRosters]);

  const getScaledRegionForDisplay = useCallback((
    originalRegion: Region,
    imageDisplaySize: { width: number; height: number }
  ): DisplayRegion => {
    if (!originalImageSize || !imageDisplaySize.width || !imageDisplaySize.height) {
      return { x: 0, y: 0, width: 0, height: 0, id: 'scaled_0_0_0_0' }; 
    }
    const scaleX = imageDisplaySize.width / originalImageSize.width;
    const scaleY = imageDisplaySize.height / originalImageSize.height;
    const x = originalRegion.x * scaleX;
    const y = originalRegion.y * scaleY;
    const w = originalRegion.width * scaleX;
    const h = originalRegion.height * scaleY;
    return {
      x, y, width: w, height: h,
      id: `scaled_${x.toFixed(0)}_${y.toFixed(0)}_${w.toFixed(0)}_${h.toFixed(0)}` 
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
             try { await deleteObject(storageRef(appFirebaseStorage, rosterData.originalImageStoragePath)); } catch (e:any) { console.warn("FRC: Failed to delete original image from Storage:", rosterData.originalImageStoragePath, e.message); }
        }
        
        batch.delete(rosterDocRef);
        await batch.commit();

        for (const path of faceImagesToDelete) {
            try { await deleteObject(storageRef(appFirebaseStorage, path)); } catch (e:any) { console.warn("FRC: Failed to delete a face image during roster deletion (post-commit):", path, e.message); }
        }
        
        toast({ title: "Roster Deleted", description: `${rosterData.rosterName} and associated data removed.` });

        if (currentRosterDocId === rosterId) {
            clearAllData(false);
        }
        await fetchUserRosters(); 
        await fetchAllUserPeople();

    } catch (error: any) {
        console.error("FRC: Error deleting roster:", error);
        toast({ title: "Delete Failed", description: `Could not delete roster: ${error.message}`, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  }, [currentUser, toast, fetchUserRosters, currentRosterDocId, clearAllData, fetchAllUserPeople]);

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
      allUserPeople,
      isLoadingAllUserPeople,
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
      fetchAllUserPeople,
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

