
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db, storage as appFirebaseStorage } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRefStandard, uploadBytes, getDownloadURL, uploadString, StringFormat, deleteObject } from 'firebase/storage'; 
import { doc, setDoc, addDoc, updateDoc, collection, serverTimestamp, arrayUnion, arrayRemove, query, where, getDocs, orderBy, getDoc, writeBatch, deleteDoc, runTransaction, FirestoreError, Timestamp } from 'firebase/firestore';

import type { Person, Region, DisplayRegion, ImageSet, EditablePersonInContext, FaceAppearance, FieldMergeChoices, SuggestedMergePair } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { suggestPeopleMerges, type SuggestMergeInput } from '@/ai/flows/suggest-people-merges-flow';


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
  globallySelectedPeopleForMerge: string[];
  mergeSuggestions: SuggestedMergePair[];
  isLoadingMergeSuggestions: boolean;

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  createRosterFromRegions: () => Promise<void>;
  selectPerson: (id: string | null) => void;
  updatePersonDetails: (personId: string, details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl' | 'isNew' | 'tempFaceImageDataUri' | 'tempOriginalRegion'>>) => Promise<void>;
  clearAllData: (showToast?: boolean) => void; 
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
  fetchUserRosters: () => Promise<void>;
  loadRosterForEditing: (rosterId: string) => Promise<void>;
  deleteRoster: (rosterId: string) => Promise<void>;
  fetchAllUserPeople: () => Promise<void>;
  toggleGlobalPersonSelectionForMerge: (personId: string) => void;
  clearGlobalMergeSelection: () => void;
  performGlobalPeopleMerge: (
    targetPersonId: string, 
    sourcePersonId: string, 
    fieldChoices: FieldMergeChoices
  ) => Promise<void>;
  fetchMergeSuggestions: () => Promise<void>;
}

const FaceRosterContext = createContext<FaceRosterContextType | undefined>(undefined);

// Helper function to convert a Firebase Storage path to a Base64 Data URI
async function imageStoragePathToDataURI(path: string): Promise<string | undefined> {
  if (!appFirebaseStorage || !path) return undefined;
  try {
    const fileRef = storageRefStandard(appFirebaseStorage, path);
    const url = await getDownloadURL(fileRef);
    // Fetch as blob
    const response = await fetch(url); // `fetch` is globally available in modern browsers and Node.js
    if (!response.ok) {
      console.error(`Failed to fetch image from URL ${url}: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    // Convert blob to data URI
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
  const [globallySelectedPeopleForMerge, setGloballySelectedPeopleForMerge] = useState<string[]>([]);
  const [mergeSuggestions, setMergeSuggestions] = useState<SuggestedMergePair[]>([]);
  const [isLoadingMergeSuggestions, setIsLoadingMergeSuggestions] = useState<boolean>(false);
  
  const clearAllData = useCallback((showToast = true) => {
    setImageDataUrl(null);
    setOriginalImageStoragePath(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
    setRoster([]);
    setSelectedPersonId(null);
    setCurrentRosterDocId(null); 
    // Do not clear merge suggestions here as they are global
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
        setGloballySelectedPeopleForMerge([]);
        setMergeSuggestions([]);
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
          const imageFileRef = storageRefStandard(appFirebaseStorage, imagePath);

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
    details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl' | 'isNew' | 'tempFaceImageDataUri' | 'tempOriginalRegion'>>
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
                targetPersonId = existingPersonDocId; 
                toast({ title: "Existing Person Found", description: `Linking to existing person: ${finalName}`});
            }
            
            const croppedFaceFileName = `${currentRosterDocId}_${targetPersonId}_${Date.now()}.png`;
            const faceImageStoragePath = `users/${currentUser.uid}/cropped_faces/${croppedFaceFileName}`;
            const croppedFaceRef = storageRefStandard(appFirebaseStorage, faceImageStoragePath);
            
            const uploadResult = await uploadString(croppedFaceRef, localPersonEntry.tempFaceImageDataUri, StringFormat.DATA_URL);
            finalFaceImageUrl = await getDownloadURL(uploadResult.ref);

            const newAppearance: FaceAppearance = {
                rosterId: currentRosterDocId,
                faceImageStoragePath: faceImageStoragePath,
                originalRegion: localPersonEntry.tempOriginalRegion,
            };

            if (existingPersonDocData && existingPersonDocId) { 
                const personRef = doc(db, "people", existingPersonDocId);
                batch.update(personRef, {
                    name: finalName,
                    notes: details.notes !== undefined ? details.notes : existingPersonDocData.notes || '',
                    company: details.company !== undefined ? details.company : existingPersonDocData.company || '',
                    hobbies: details.hobbies !== undefined ? details.hobbies : existingPersonDocData.hobbies || '',
                    birthday: details.birthday !== undefined ? details.birthday : existingPersonDocData.birthday || '',
                    firstMet: details.firstMet !== undefined ? details.firstMet : existingPersonDocData.firstMet || '',
                    firstMetContext: details.firstMetContext !== undefined ? details.firstMetContext : existingPersonDocData.firstMetContext || '',
                    faceAppearances: arrayUnion(newAppearance),
                    rosterIds: arrayUnion(currentRosterDocId),
                    updatedAt: serverTimestamp()
                });
            } else { 
                const newPersonDocRef = doc(collection(db, "people")); 
                targetPersonId = newPersonDocRef.id; 
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
                peopleIds: arrayUnion(targetPersonId), 
                updatedAt: serverTimestamp()
            });
            
            await batch.commit();
            await fetchUserRosters();
            await fetchAllUserPeople(); 

        } else if (!localPersonEntry.isNew) { 
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
            await fetchAllUserPeople(); 
        } else {
          throw new Error("updatePersonDetails called for a local 'new' person without temp data, or for a non-new person in an unexpected way.");
        }
        
        setRoster(prevRoster =>
          prevRoster.map(p =>
            p.id === personIdToUpdate 
              ? { 
                  ...p, 
                  name: finalName, 
                  notes: details.notes ?? p.notes,
                  company: details.company ?? p.company,
                  hobbies: details.hobbies ?? p.hobbies,
                  birthday: details.birthday ?? p.birthday,
                  firstMet: details.firstMet ?? p.firstMet,
                  firstMetContext: details.firstMetContext ?? p.firstMetContext,
                  id: targetPersonId, 
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

      const mainImageRef = storageRefStandard(appFirebaseStorage, rosterData.originalImageStoragePath);
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
                    const faceRef = storageRefStandard(appFirebaseStorage, appearanceForThisRoster.faceImageStoragePath);
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
             try { await deleteObject(storageRefStandard(appFirebaseStorage, rosterData.originalImageStoragePath)); } catch (e:any) { console.warn("FRC: Failed to delete original image from Storage:", rosterData.originalImageStoragePath, e.message); }
        }
        
        batch.delete(rosterDocRef);
        await batch.commit();

        for (const path of faceImagesToDelete) {
            try { await deleteObject(storageRefStandard(appFirebaseStorage, path)); } catch (e:any) { console.warn("FRC: Failed to delete a face image during roster deletion (post-commit):", path, e.message); }
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

  const toggleGlobalPersonSelectionForMerge = useCallback((personId: string) => {
    setGloballySelectedPeopleForMerge(prevSelected => {
      if (prevSelected.includes(personId)) {
        return prevSelected.filter(id => id !== personId);
      } else {
        if (prevSelected.length < 2) {
          return [...prevSelected, personId];
        } else { 
           toast({title: "Selection Limit", description: "You can only select two people to merge at a time.", variant: "default"});
           return prevSelected;
        }
      }
    });
  }, [toast]);

  const clearGlobalMergeSelection = useCallback(() => {
    setGloballySelectedPeopleForMerge([]);
  }, []);

  const performGlobalPeopleMerge = useCallback(async (
    targetPersonId: string, 
    sourcePersonId: string, 
    fieldChoices: FieldMergeChoices
  ) => {
    if (!db || !currentUser) {
      toast({ title: "Merge Error", description: "User not authenticated or database unavailable.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);

    const targetPersonRef = doc(db, "people", targetPersonId);
    const sourcePersonRef = doc(db, "people", sourcePersonId);

    try {
      await runTransaction(db, async (transaction) => {
        const targetDoc = await transaction.get(targetPersonRef);
        const sourceDoc = await transaction.get(sourcePersonRef);

        if (!targetDoc.exists() || !sourceDoc.exists()) {
          throw new Error("One or both selected people could not be found for merging.");
        }

        const targetData = targetDoc.data() as Person;
        const sourceData = sourceDoc.data() as Person;
        
        const getValue = (fieldKey: keyof FieldMergeChoices, tVal: string | undefined, sVal: string | undefined): string | undefined => {
            const choice = fieldChoices[fieldKey];
            if (choice === 'person1') return tVal;
            if (choice === 'person2') return sVal;
            return tVal; 
        };

        const mergedName = getValue('name', targetData.name, sourceData.name) || targetData.name;
        const mergedCompany = getValue('company', targetData.company, sourceData.company);
        const mergedHobbies = getValue('hobbies', targetData.hobbies, sourceData.hobbies);
        const mergedBirthday = getValue('birthday', targetData.birthday, sourceData.birthday);
        const mergedFirstMet = getValue('firstMet', targetData.firstMet, sourceData.firstMet);
        const mergedFirstMetContext = getValue('firstMetContext', targetData.firstMetContext, sourceData.firstMetContext);
        
        let mergedNotes = fieldChoices.name === 'person1' ? (targetData.notes || "") : (sourceData.notes || "");
        const otherPersonsNotes = fieldChoices.name === 'person1' ? (sourceData.notes || "") : (targetData.notes || "");
        const otherPersonsName = fieldChoices.name === 'person1' ? sourceData.name : targetData.name;
        const otherPersonsId = fieldChoices.name === 'person1' ? sourceData.id : targetData.id;


        if (otherPersonsNotes) {
            mergedNotes += `${mergedNotes ? "\n\n" : ""}Merged from ${otherPersonsName} (ID: ${otherPersonsId}):\n${otherPersonsNotes}`;
        }
        
        const mergedFaceAppearancesSet = new Map<string, FaceAppearance>();
        (targetData.faceAppearances || []).forEach(app => mergedFaceAppearancesSet.set(app.faceImageStoragePath, app));
        (sourceData.faceAppearances || []).forEach(app => {
            if (!mergedFaceAppearancesSet.has(app.faceImageStoragePath)) {
                mergedFaceAppearancesSet.set(app.faceImageStoragePath, app);
            }
        });
        const mergedFaceAppearances = Array.from(mergedFaceAppearancesSet.values());
        const mergedRosterIds = Array.from(new Set([...(targetData.rosterIds || []), ...(sourceData.rosterIds || [])]));

        transaction.update(targetPersonRef, {
          name: mergedName,
          notes: mergedNotes,
          company: mergedCompany || "",
          hobbies: mergedHobbies || "",
          birthday: mergedBirthday || "",
          firstMet: mergedFirstMet || "",
          firstMetContext: mergedFirstMetContext || "",
          faceAppearances: mergedFaceAppearances,
          rosterIds: mergedRosterIds,
          updatedAt: serverTimestamp()
        });

        transaction.delete(sourcePersonRef);
      });

      const batch = writeBatch(db);
      const sourceRosterIdsFromDataSource = allUserPeople.find(p => p.id === sourcePersonId)?.rosterIds || [];
      
      for (const rosterId of sourceRosterIdsFromDataSource) {
        const rosterRef = doc(db, "rosters", rosterId);
        batch.update(rosterRef, {
          peopleIds: arrayRemove(sourcePersonId)
        });
        batch.update(rosterRef, {
           peopleIds: arrayUnion(targetPersonId) 
        });
      }
      await batch.commit();


      const sourceName = allUserPeople.find(p => p.id === sourcePersonId)?.name || "Deleted Person";
      const targetNameAfterMerge = allUserPeople.find(p => p.id === targetPersonId)?.name || targetData.name; 


      toast({ title: "Merge Successful", description: `${sourceName} has been merged into ${targetNameAfterMerge}.` });
      
      await fetchAllUserPeople(); 
      await fetchUserRosters();
      clearGlobalMergeSelection();

    } catch (error: any) {
      console.error("FRC: Error merging people:", error);
      toast({ title: "Merge Failed", description: `Could not merge people: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [db, currentUser, toast, fetchAllUserPeople, fetchUserRosters, clearGlobalMergeSelection, allUserPeople]);

  const fetchMergeSuggestions = useCallback(async () => {
    if (!currentUser || allUserPeople.length < 2) {
      setMergeSuggestions([]);
      if (allUserPeople.length < 2 && currentUser) {
        toast({ title: "Not Enough People", description: "Need at least two people registered to suggest merges.", variant: "default"});
      }
      return;
    }
    setIsLoadingMergeSuggestions(true);
    setMergeSuggestions([]); // Clear previous suggestions

    try {
      // Prepare input for the Genkit flow, including fetching image data URIs
      const peopleWithImageDataPromises = allUserPeople.map(async (p) => {
        let faceImageDataUri: string | undefined = undefined;
        if (p.faceAppearances && p.faceAppearances.length > 0 && p.faceAppearances[0].faceImageStoragePath) {
          faceImageDataUri = await imageStoragePathToDataURI(p.faceAppearances[0].faceImageStoragePath);
        }
        return { 
          id: p.id, 
          name: p.name,
          company: p.company,
          hobbies: p.hobbies,
          faceImageDataUri: faceImageDataUri,
        };
      });

      const flowInput: SuggestMergeInput = await Promise.all(peopleWithImageDataPromises);
      
      const suggestions = await suggestPeopleMerges(flowInput);
      setMergeSuggestions(suggestions);

      if (suggestions.length === 0) {
        toast({ title: "No Merge Suggestions", description: "The AI found no potential duplicates based on current criteria." });
      } else {
        toast({ title: "Merge Suggestions Found", description: `Found ${suggestions.length} potential merge(s). Review them below.` });
      }
    } catch (error: any) {
      console.error("FRC: Error fetching merge suggestions (Genkit flow or image prep):", error);
      let detailedErrorMessage = `Could not fetch merge suggestions: ${error.message}`;
      if (error.cause && typeof error.cause === 'object') {
        detailedErrorMessage += ` Cause: ${JSON.stringify(error.cause)}`;
      } else if (error.cause) {
        detailedErrorMessage += ` Cause: ${error.cause}`;
      }
      toast({ title: "Suggestion Error", description: detailedErrorMessage, variant: "destructive", duration: 10000 });
      setMergeSuggestions([]);
    } finally {
      setIsLoadingMergeSuggestions(false);
    }
  }, [currentUser, allUserPeople, toast]);


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
      globallySelectedPeopleForMerge,
      mergeSuggestions,
      isLoadingMergeSuggestions,
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
      toggleGlobalPersonSelectionForMerge,
      clearGlobalMergeSelection,
      performGlobalPeopleMerge,
      fetchMergeSuggestions,
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
