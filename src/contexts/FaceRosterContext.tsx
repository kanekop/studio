
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db, storage as appFirebaseStorage } from '@/lib/firebase'; // Direct import with alias for storage and db
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL, uploadString, StringFormat } from 'firebase/storage'; 
import { doc, setDoc, addDoc, updateDoc, collection, serverTimestamp, arrayUnion } from 'firebase/firestore';

import type { Person, Region, DisplayRegion } from '@/types'; // Person type from types/index.ts
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// This type is for the local React state, used to drive the UI.
// It might hold temporary data URIs for newly cropped images or fetched download URLs.
interface EditablePersonInContext {
  id: string; // Firestore document ID for this person
  faceImageUrl: string; // Data URI for new, or download URL for existing
  name: string;
  aiName?: string;
  notes?: string;
  originalRegion: Region;
  faceImageStoragePath?: string; // Storage path for the cropped face, once saved
}


interface FaceRosterContextType {
  currentUser: FirebaseUser | null;
  imageDataUrl: string | null; 
  originalImageStoragePath: string | null; 
  originalImageSize: { width: number; height: number } | null;
  drawnRegions: Region[];
  roster: EditablePersonInContext[]; // Uses EditablePersonInContext
  selectedPersonId: string | null;
  isLoading: boolean; 
  isProcessing: boolean;
  currentRosterDocId: string | null;

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  createRosterFromRegions: () => Promise<void>;
  selectPerson: (id: string | null) => void;
  updatePersonDetails: (id: string, details: Partial<Pick<EditablePersonInContext, 'name' | 'notes'>>) => void;
  clearAllData: (showToast?: boolean) => void; 
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
}

const FaceRosterContext = createContext<FaceRosterContextType | undefined>(undefined);

// Helper function to convert data URI to Blob
async function dataUriToBlob(dataURI: string): Promise<Blob> {
  const response = await fetch(dataURI);
  const blob = await response.blob();
  return blob;
}


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
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("FRC: Auth state changed, user:", user ? user.uid : null);
      setCurrentUser(user);
      setIsLoading(false);
      if (!user) {
        clearAllData(false); 
      }
      // TODO: When user logs in, load their existing rosters from Firestore.
    });
    return () => unsubscribe();
  }, []);


  const clearAllData = useCallback((showToast = true) => {
    setImageDataUrl(null);
    setOriginalImageStoragePath(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
    setRoster([]);
    setSelectedPersonId(null);
    setCurrentRosterDocId(null); // Reset current roster ID
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
      toast({ title: "Firebase Error", description: "Database or Storage service not available.", variant: "destructive" });
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
      const img = new Image();
      img.onload = async () => {
        const currentImgSize = { width: img.width, height: img.height };
        setImageDataUrl(localDataUrl); // Show local preview first
        setOriginalImageSize(currentImgSize);
        toast({ title: "Image Preview Ready", description: "Uploading to cloud storage..." });

        try {
          if (!currentUser?.uid) throw new Error("User not authenticated for cloud upload.");
          
          const imageName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const imagePath = `users/${currentUser.uid}/original_images/${imageName}`;
          const imageFileRef = storageRef(appFirebaseStorage, imagePath);

          const uploadTask = await uploadBytes(imageFileRef, file);
          const downloadURL = await getDownloadURL(uploadTask.ref);
          const cloudStoragePath = uploadTask.ref.fullPath;

          setOriginalImageStoragePath(cloudStoragePath);
          setImageDataUrl(downloadURL); // Switch to cloud URL for display
          
          // Create Roster document in Firestore
          const rosterData = {
            ownerId: currentUser.uid,
            rosterName: `Roster - ${new Date().toLocaleDateString()}`, // Placeholder name
            originalImageStoragePath: cloudStoragePath,
            originalImageDimensions: currentImgSize,
            peopleIds: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          const rosterDocRef = await addDoc(collection(db, "rosters"), rosterData);
          setCurrentRosterDocId(rosterDocRef.id);

          toast({ title: "Upload Successful", description: "Image saved to cloud and new roster created." });
        } catch (uploadError: any) {
          console.error("FRC: Cloud upload or Firestore roster creation error:", uploadError);
          toast({ title: "Operation Failed", description: `Error: ${uploadError.message || 'Could not save image or create roster.'}`, variant: "destructive" });
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
  }, [toast, currentUser, clearAllData]);
  

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
      toast({ title: "Error", description: "User not authenticated, roster not initialized, or Firebase services unavailable.", variant: "destructive" });
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
        let errorDetails: any = {}; // Keep errorDetails for potential future use
        if (typeof errEvent === 'string') {
          specificErrorMessage = errEvent;
        } else if (errEvent instanceof Event) {
          specificErrorMessage = `Image load failed. Event type: ${errEvent.type}.`;
          const target = errEvent.target as HTMLImageElement;
          errorDetails = { 
            type: errEvent.type, 
            targetCurrentSrc: target?.currentSrc,
           };
        } else if (typeof errEvent === 'object' && errEvent !== null) {
          try {
            specificErrorMessage = `Image load failed with object error.`;
             errorDetails = JSON.parse(JSON.stringify(errEvent, Object.getOwnPropertyNames(errEvent)));
          } catch (e) {
            specificErrorMessage = `Image load failed with non-serializable object error.`;
          }
        }
        console.error("FRC: Error loading image for cropping. URL:", imageDataUrl, "Specific error:", specificErrorMessage, "Details:", errorDetails, "Raw event:", errEvent);
        reject(new Error(`Failed to load base image for cropping. URL: ${imageDataUrl}. Error: ${specificErrorMessage}`));
      };
      
      try {
        img.src = imageDataUrl; 
        if (!imageDataUrl.startsWith('data:')) { 
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
      for (let i = 0; i < drawnRegions.length; i++) {
        const region = drawnRegions[i];
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
        
        const faceImageDataURI = tempCanvas.toDataURL('image/png'); 
        
        // Upload cropped face to Cloud Storage
        const croppedFaceFileName = `${currentRosterDocId}_${Date.now()}_${i}.png`;
        const croppedFaceStoragePath = `users/${currentUser.uid}/cropped_faces/${croppedFaceFileName}`;
        const croppedFaceRef = storageRef(appFirebaseStorage, croppedFaceStoragePath);
        
        // Firebase SDK v9+ for uploadString expects data_url (which is our base64 string)
        // and StringFormat.DATA_URL. No need to convert to Blob manually here.
        await uploadString(croppedFaceRef, faceImageDataURI, StringFormat.DATA_URL);
        // const croppedFaceDownloadURL = await getDownloadURL(croppedFaceRef); // We'll store path, fetch URL on demand

        // Create Person document in Firestore
        const personData: Omit<Person, 'id'> = { // Matches the type in types/index.ts, minus id
          name: `Person ${roster.length + newEditablePeople.length + 1}`,
          aiName: `Person ${roster.length + newEditablePeople.length + 1}`, 
          notes: '',
          faceImageStoragePath: croppedFaceStoragePath, // Store the storage path
          originalRegion: region,
          // Fields from PRD:
          addedBy: currentUser.uid,
          rosterIds: [currentRosterDocId],
          createdAt: serverTimestamp(), // Firestore server timestamp
          updatedAt: serverTimestamp(), // Firestore server timestamp
          // company: "", // Example of other fields from PRD
          // hobbies: [],
          // birthday: null, // Use Timestamp or string
          // firstMet: null,
          // firstMetContext: "",
          // knownAcquaintances: [],
          // spouse: null,
        };
        const personDocRef = await addDoc(collection(db, "people"), personData);
        newPersonDocIds.push(personDocRef.id);

        newEditablePeople.push({
          id: personDocRef.id, // Use Firestore ID
          faceImageUrl: faceImageDataURI, // Use dataURI for immediate display
          name: personData.name,
          aiName: personData.aiName, 
          notes: personData.notes,
          originalRegion: region,
          faceImageStoragePath: croppedFaceStoragePath, // Keep for reference if needed
        });
      }

      // Update roster document with new people IDs
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
      toast({ title: "Roster Creation Failed", description: (error as Error).message || "Could not process regions due to an internal error.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [imageDataUrl, drawnRegions, roster.length, toast, currentUser, currentRosterDocId]);

  const selectPerson = useCallback((id: string | null) => {
    setSelectedPersonId(id);
  }, []);

  const updatePersonDetails = useCallback(async (personDocId: string, details: Partial<Pick<EditablePersonInContext, 'name' | 'notes'>>) => {
    if (!db || !currentUser?.uid) {
        toast({ title: "Error", description: "User not authenticated or database service unavailable.", variant: "destructive" });
        return;
    }
    // Update local state first for responsiveness
    setRoster(prevRoster =>
      prevRoster.map(person =>
        person.id === personDocId ? { ...person, ...details } : person
      )
    );
    // Then update Firestore
    try {
        const personRef = doc(db, "people", personDocId);
        await updateDoc(personRef, {
            ...(details.name && { name: details.name }),
            ...(details.notes && { notes: details.notes }),
            updatedAt: serverTimestamp()
        });
        toast({ title: "Details Updated", description: "Person's information saved to cloud." });
    } catch (error: any) {
        console.error("FRC: Error updating person details in Firestore:", error);
        toast({ title: "Update Failed", description: `Could not save changes to cloud: ${error.message}`, variant: "destructive" });
        // Optionally, revert local state here if Firestore update fails
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
      handleImageUpload, 
      addDrawnRegion, 
      clearDrawnRegions, 
      createRosterFromRegions,
      selectPerson, 
      updatePersonDetails, 
      clearAllData, 
      getScaledRegionForDisplay
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

    