
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db, storage as appFirebaseStorage } from '@/lib/firebase'; // Direct import with alias for storage and db
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL, uploadString, StringFormat, listAll, deleteObject } from 'firebase/storage'; 
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
  updatePersonDetails: (id: string, details: Partial<Pick<EditablePersonInContext, 'name' | 'notes'>>) => void;
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
    console.log("FRC: Fetching user rosters for UID:", currentUser.uid);
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
      console.log("FRC: Fetched rosters:", fetchedRosters.length);
    } catch (error) {
      console.error("FRC: Error fetching user rosters:", error);
      toast({ title: "Error Loading Rosters", description: "Could not fetch your saved rosters.", variant: "destructive" });
      setUserRosters([]);
    } finally {
      setIsLoadingUserRosters(false);
    }
  }, [currentUser, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("FRC: Auth state changed, user:", user ? user.uid : null);
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
    // setUserRosters([]); // Do not clear userRosters here, only on logout.
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
      console.error("FRC: Firestore (db) or Firebase Storage (appFirebaseStorage) is not initialized in firebase.ts.");
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
    console.log("FRC: Starting image upload process for file:", file.name);

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
        console.log("FRC: Image preview ready. Dimensions:", currentImgSize);
        toast({ title: "Image Preview Ready", description: "Uploading to cloud storage..." });

        try {
          if (!currentUser?.uid) {
            console.error("FRC: User UID became undefined before cloud upload.");
            throw new Error("User not authenticated for cloud upload.");
          }
          if (!currentImgSize || !currentImgSize.width || !currentImgSize.height) {
            console.error("FRC: currentImgSize is invalid before cloud upload.", currentImgSize);
            throw new Error("Image dimensions are invalid.");
          }
          
          const imageName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const imagePath = `users/${currentUser.uid}/original_images/${imageName}`;
          const imageFileRef = storageRef(appFirebaseStorage, imagePath);
          console.log("FRC: Attempting to upload original image to:", imagePath);

          const uploadTask = await uploadBytes(imageFileRef, file);
          const downloadURL = await getDownloadURL(uploadTask.ref);
          const cloudStoragePath = uploadTask.ref.fullPath;
          console.log("FRC: Original image uploaded to Storage. Path:", cloudStoragePath, "URL:", downloadURL);

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
          console.log("FRC: Preparing to create roster document in Firestore with data:", rosterData);

          if (!db) { 
            console.error("FRC: Firestore 'db' instance is null before addDoc.");
            throw new Error("Firestore database service is not available.");
          }

          const rosterDocRef = await addDoc(collection(db, "rosters"), rosterData);
          setCurrentRosterDocId(rosterDocRef.id);
          console.log("FRC: Roster document created in Firestore. ID:", rosterDocRef.id);
          await fetchUserRosters(); // Refresh roster list

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
          console.log("FRC: handleImageUpload - finally block reached.");
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
      console.warn("FRC: Cannot convert display region: originalImageSize or imageDisplaySize is invalid.");
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
      console.error("FRC: Pre-condition fail in createRosterFromRegions. UID:", currentUser?.uid, "RosterID:", currentRosterDocId, "DB:", !!db, "Storage:", !!appFirebaseStorage);
      return;
    }
    
    setIsProcessing(true);
    console.log("FRC: Starting createRosterFromRegions. Regions to process:", drawnRegions.length);
    const newEditablePeople: EditablePersonInContext[] = [];
    const newPersonDocIds: string[] = [];
    
    const img = new Image();
    img.crossOrigin = "anonymous"; 
    console.log("FRC: createRosterFromRegions - Image object created, crossOrigin set to anonymous.");

    const imageLoadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => {
        console.log("FRC: Base image for cropping loaded successfully. URL:", imageDataUrl);
        resolve();
      }
      img.onerror = (errEvent) => {
        let specificErrorMessage = 'Image load failed.';
        let errorDetails: any = {};
         if (typeof errEvent === 'string') {
          specificErrorMessage = errEvent;
        } else if (errEvent instanceof Event) {
          specificErrorMessage = `Image load failed. Event type: ${errEvent.type}.`;
           for (const key in errEvent) {
             if (Object.prototype.hasOwnProperty.call(errEvent, key)) {
               try {
                errorDetails[`event_${key}`] = (errEvent as any)[key];
               } catch (e) {
                 // ignore properties that can't be accessed
               }
             }
           }
        } else if (typeof errEvent === 'object' && errEvent !== null) {
          try {
            specificErrorMessage = `Image load failed with object error. Check details.`;
             errorDetails = JSON.parse(JSON.stringify(errEvent, Object.getOwnPropertyNames(errEvent)));
          } catch (e) {
            specificErrorMessage = `Image load failed with non-serializable object error.`;
          }
        }
        console.error("FRC: Error loading image for cropping. URL:", imageDataUrl, "Specific error:", specificErrorMessage, "Details:", errorDetails, "Raw event:", errEvent);
        reject(new Error(`Failed to load base image for cropping. URL: ${imageDataUrl}. Error: ${specificErrorMessage}`));
      };
      
      try {
        console.log("FRC: Setting img.src for cropping to:", imageDataUrl);
        img.src = imageDataUrl; 
        if (imageDataUrl && !imageDataUrl.startsWith('data:')) { 
          console.log("FRC: Loading remote image for cropping. Ensure CORS is correctly configured on the server for:", new URL(imageDataUrl).origin);
        }
      } catch (srcError: any) {
        console.error("FRC: Error directly setting img.src for cropping. URL:", imageDataUrl, "Error:", srcError);
        reject(new Error(`Failed to set image source for cropping. URL: ${imageDataUrl}. Error: ${srcError.message || 'Unknown src assignment error'}`));
        return; 
      }
    });

    try {
      await imageLoadPromise;
      console.log("FRC: Proceeding with cropping regions.");
      for (let i = 0; i < drawnRegions.length; i++) {
        const region = drawnRegions[i];
        console.log(`FRC: Processing region ${i + 1}/${drawnRegions.length}:`, region);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.max(1, Math.floor(region.width)); 
        tempCanvas.height = Math.max(1, Math.floor(region.height));
        const ctx = tempCanvas.getContext('2d');

        if (!ctx) {
          console.warn("FRC: Could not get 2D context for cropping canvas for region index:", i);
          continue; 
        }
        
        ctx.drawImage(
          img, 
          Math.floor(region.x), Math.floor(region.y), Math.floor(region.width), Math.floor(region.height), 
          0, 0, tempCanvas.width, tempCanvas.height 
        );
        console.log(`FRC: Region ${i + 1} drawn to temp canvas.`);
        
        const faceImageDataURI = tempCanvas.toDataURL('image/png'); 
        
        const croppedFaceFileName = `${currentRosterDocId}_${Date.now()}_${i}.png`;
        const croppedFaceStoragePath = `users/${currentUser.uid}/cropped_faces/${croppedFaceFileName}`;
        const croppedFaceRef = storageRef(appFirebaseStorage, croppedFaceStoragePath);
        console.log(`FRC: Uploading cropped face ${i + 1} to Storage:`, croppedFaceStoragePath);
        
        const uploadResult = await uploadString(croppedFaceRef, faceImageDataURI, StringFormat.DATA_URL);
        const faceImageDownloadUrl = await getDownloadURL(uploadResult.ref);
        console.log(`FRC: Cropped face ${i + 1} uploaded. URL: ${faceImageDownloadUrl}`);
        
        const personData: Omit<Person, 'id'> = { 
          name: `Person ${roster.length + newEditablePeople.length + 1}`,
          aiName: `Person ${roster.length + newEditablePeople.length + 1}`, 
          notes: '',
          faceImageStoragePath: croppedFaceStoragePath, 
          originalRegion: region,
          addedBy: currentUser.uid,
          rosterIds: [currentRosterDocId],
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp(), 
        };
        console.log(`FRC: Preparing to add person ${i + 1} to Firestore with data:`, personData);
        const personDocRef = await addDoc(collection(db, "people"), personData);
        newPersonDocIds.push(personDocRef.id);
        console.log(`FRC: Person ${i + 1} added to Firestore. ID:`, personDocRef.id);

        newEditablePeople.push({
          id: personDocRef.id, 
          faceImageUrl: faceImageDownloadUrl, // Use download URL
          name: personData.name,
          aiName: personData.aiName, 
          notes: personData.notes,
          originalRegion: region,
          faceImageStoragePath: croppedFaceStoragePath, 
        });
      }

      if (newPersonDocIds.length > 0 && currentRosterDocId) {
        console.log("FRC: Updating roster document with new people IDs:", newPersonDocIds);
        const rosterDocToUpdateRef = doc(db, "rosters", currentRosterDocId);
        await updateDoc(rosterDocToUpdateRef, {
          peopleIds: arrayUnion(...newPersonDocIds),
          updatedAt: serverTimestamp()
        });
        console.log("FRC: Roster document updated.");
      }

      setRoster(prev => [...prev, ...newEditablepeople]); 
      setDrawnRegions([]); 
      toast({ title: "Roster Updated", description: `${newEditablePeople.length} person(s) added, cropped images uploaded, and data saved to cloud.` });
    } catch (error: any) {
      console.error("FRC: Error during roster creation process (after image load attempt):", error.message, error.stack, error);
      let errorDescription = "Could not process regions due to an internal error.";
      if (error instanceof FirestoreError) {
            errorDescription = `Firestore error: ${error.message} (Code: ${error.code}). Check Firestore rules and API status.`;
      } else if (error.message) {
        errorDescription = error.message;
      }
      toast({ title: "Roster Creation Failed", description: errorDescription, variant: "destructive" });
    } finally {
      console.log("FRC: createRosterFromRegions - finally block reached.");
      setIsProcessing(false);
    }
  }, [imageDataUrl, drawnRegions, roster.length, toast, currentUser, currentRosterDocId]);

  const selectPerson = useCallback((id: string | null) => {
    setSelectedPersonId(id);
  }, []);

  const updatePersonDetails = useCallback(async (personDocId: string, details: Partial<Pick<EditablePersonInContext, 'name' | 'notes'>>) => {
    if (!db || !currentUser?.uid) {
        toast({ title: "Error", description: "User not authenticated or database service unavailable. Check console.", variant: "destructive" });
        console.error("FRC: UpdatePersonDetails - Pre-condition fail. DB:", !!db, "UID:", currentUser?.uid);
        return;
    }
    console.log(`FRC: Updating person details for ID: ${personDocId} with:`, details);
    setRoster(prevRoster =>
      prevRoster.map(person =>
        person.id === personDocId ? { ...person, ...details } : person
      )
    );
    try {
        const personRef = doc(db, "people", personDocId);
        await updateDoc(personRef, {
            ...(details.name !== undefined && { name: details.name }), 
            ...(details.notes !== undefined && { notes: details.notes }),
            updatedAt: serverTimestamp()
        });
        console.log(`FRC: Person details for ID: ${personDocId} updated in Firestore.`);
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
      console.warn("FRC: getScaledRegionForDisplay - originalImageSize or imageDisplaySize invalid. Returning zero region.");
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
    console.log("FRC: Loading roster for editing, ID:", rosterId);
    setIsProcessing(true);
    clearAllData(false); // Clear current editor state first

    try {
      const rosterDocRef = doc(db, "rosters", rosterId);
      const rosterSnap = await getDoc(rosterDocRef);

      if (!rosterSnap.exists()) {
        toast({ title: "Not Found", description: "The selected roster could not be found.", variant: "destructive" });
        setIsProcessing(false);
        await fetchUserRosters(); // Refresh list in case it was deleted elsewhere
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

      // Get download URL for the original image
      const mainImageRef = storageRef(appFirebaseStorage, rosterData.originalImageStoragePath);
      const mainImageUrl = await getDownloadURL(mainImageRef);
      setImageDataUrl(mainImageUrl);

      // Fetch people associated with this roster
      const peopleForRoster: EditablePersonInContext[] = [];
      if (rosterData.peopleIds && rosterData.peopleIds.length > 0) {
        // Firestore 'in' query has a limit of 30 items per query.
        // If more people, batch the requests. For now, assume <30.
        const peopleQuery = query(collection(db, "people"), where("__name__", "in", rosterData.peopleIds));
        const peopleSnapshots = await getDocs(peopleQuery);
        
        for (const personDoc of peopleSnapshots.docs) {
          const personData = personDoc.data() as Person;
          let faceImgUrl = "https://placehold.co/100x100.png"; // Default placeholder
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
            originalRegion: personData.originalRegion,
            faceImageUrl: faceImgUrl,
            faceImageStoragePath: personData.faceImageStoragePath,
          });
        }
      }
      setRoster(peopleForRoster);
      if (peopleForRoster.length > 0) {
        setSelectedPersonId(peopleForRoster[0].id); // Select the first person by default
      } else {
        setSelectedPersonId(null);
      }

      toast({ title: "Roster Loaded", description: `${rosterData.rosterName} is ready for editing.` });

    } catch (error: any) {
      console.error("FRC: Error loading roster for editing:", error);
      toast({ title: "Load Failed", description: `Could not load the roster: ${error.message}`, variant: "destructive" });
      clearAllData(false); // Clear partially loaded state
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser, toast, fetchUserRosters, clearAllData]);


  const deleteRoster = useCallback(async (rosterId: string) => {
    if (!db || !appFirebaseStorage || !currentUser) {
        toast({ title: "Error", description: "Cannot delete: Not logged in or Firebase services unavailable.", variant: "destructive"});
        return;
    }
    console.log("FRC: Attempting to delete roster ID:", rosterId);
    setIsProcessing(true);
    try {
        const rosterDocRef = doc(db, "rosters", rosterId);
        const rosterSnap = await getDoc(rosterDocRef);

        if (!rosterSnap.exists()) {
            toast({ title: "Not Found", description: "Roster to delete was not found.", variant: "destructive" });
            return;
        }
        const rosterData = rosterSnap.data() as ImageSet;

        if (rosterData.ownerId !== currentUser.uid) {
            toast({ title: "Access Denied", description: "You cannot delete this roster.", variant: "destructive" });
            return;
        }

        const batch = writeBatch(db);

        // 1. Delete associated people documents
        if (rosterData.peopleIds && rosterData.peopleIds.length > 0) {
            // For simplicity, one by one. Batching people deletion could be complex if they are in multiple rosters.
            // A more robust solution would involve checking if a person is only in this roster before deleting.
            // For now, we assume people are unique to a roster or this is an acceptable simplification.
            for (const personId of rosterData.peopleIds) {
                const personDocRef = doc(db, "people", personId);
                // Optionally: Fetch person to get faceImageStoragePath for deletion from Storage
                const personSnap = await getDoc(personDocRef);
                if (personSnap.exists()) {
                    const personToDelete = personSnap.data() as Person;
                    if (personToDelete.faceImageStoragePath) {
                        const faceImageFileRef = storageRef(appFirebaseStorage, personToDelete.faceImageStoragePath);
                        try {
                            await deleteObject(faceImageFileRef);
                            console.log("FRC: Deleted face image from Storage:", personToDelete.faceImageStoragePath);
                        } catch (e) {
                             console.warn("FRC: Failed to delete face image from Storage (may not exist or permissions):", personToDelete.faceImageStoragePath, e);
                        }
                    }
                }
                batch.delete(personDocRef);
            }
        }
        
        // 2. Delete original image from Storage
        if (rosterData.originalImageStoragePath) {
            const originalImageFileRef = storageRef(appFirebaseStorage, rosterData.originalImageStoragePath);
             try {
                await deleteObject(originalImageFileRef);
                console.log("FRC: Deleted original image from Storage:", rosterData.originalImageStoragePath);
            } catch (e) {
                console.warn("FRC: Failed to delete original image from Storage (may not exist or permissions):", rosterData.originalImageStoragePath, e);
            }
        }
        
        // 3. Delete the roster document itself
        batch.delete(rosterDocRef);

        await batch.commit();
        console.log("FRC: Roster and associated data deleted successfully:", rosterId);
        toast({ title: "Roster Deleted", description: `${rosterData.rosterName} and its contents have been removed.` });

        // If the deleted roster was currently loaded in editor, clear editor
        if (currentRosterDocId === rosterId) {
            clearAllData(false);
        }
        await fetchUserRosters(); // Refresh the list of rosters

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
