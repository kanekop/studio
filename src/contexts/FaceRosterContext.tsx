
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, storage as appFirebaseStorage } from '@/lib/firebase'; // Direct import with alias
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; 

import type { Person, Region, DisplayRegion } from '@/types';
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface EditablePerson extends Omit<Person, 'id' | 'faceImageStoragePath' | 'originalRegion'> {
  id: string;
  faceImageUrl: string; 
  name: string;
  aiName?: string;
  notes?: string;
  originalRegion: Region;
}


interface FaceRosterContextType {
  currentUser: FirebaseUser | null;
  imageDataUrl: string | null; 
  originalImageStoragePath: string | null; 
  originalImageSize: { width: number; height: number } | null;
  drawnRegions: Region[];
  roster: EditablePerson[];
  selectedPersonId: string | null;
  isLoading: boolean; 
  isProcessing: boolean;

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  createRosterFromRegions: () => Promise<void>;
  selectPerson: (id: string | null) => void;
  updatePersonDetails: (id: string, details: Partial<Pick<EditablePerson, 'name' | 'notes'>>) => void;
  clearAllData: (showToast?: boolean) => void; 
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
}

const FaceRosterContext = createContext<FaceRosterContextType | undefined>(undefined);

export const FaceRosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [originalImageStoragePath, setOriginalImageStoragePath] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [drawnRegions, setDrawnRegions] = useState<Region[]>([]);
  const [roster, setRoster] = useState<EditablePerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("FRC: Auth state changed, user:", user ? user.uid : null);
      setCurrentUser(user);
      setIsLoading(false);
      if (!user) {
        clearAllData(false); 
      }
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
    if (showToast) {
      toast({ title: "Editor Cleared", description: "Current image and roster have been cleared from the editor." });
    }
  }, [toast]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in to upload images.", variant: "destructive" });
      console.warn("FRC: Image upload attempted without logged-in user.");
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
    console.log("FRC: Started handleImageUpload, isProcessing: true");

    const reader = new FileReader();
    reader.onload = (e) => {
      const localDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        setImageDataUrl(localDataUrl);
        setOriginalImageSize({ width: img.width, height: img.height });
        toast({ title: "Image Preview Ready", description: "Uploading to cloud storage..." });
        console.log("FRC: Image loaded locally. Attempting cloud upload for user:", currentUser?.uid);

        try {
          if (!currentUser?.uid) {
            throw new Error("User is not authenticated for cloud upload.");
          }
          if (!appFirebaseStorage) { 
            throw new Error("Firebase Storage service instance is not available.");
          }
          
          const imageName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const imagePath = `users/${currentUser.uid}/original_images/${imageName}`;
          console.log("FRC: Cloud upload path:", imagePath);
          const imageFileRef = storageRef(appFirebaseStorage, imagePath);

          console.log("FRC: Starting uploadBytes...");
          const uploadTask = await uploadBytes(imageFileRef, file);
          console.log("FRC: uploadBytes completed. Path:", uploadTask.ref.fullPath, "Starting getDownloadURL...");
          const downloadURL = await getDownloadURL(uploadTask.ref);
          console.log("FRC: getDownloadURL completed:", downloadURL);

          setOriginalImageStoragePath(uploadTask.ref.fullPath);
          setImageDataUrl(downloadURL); 
          
          toast({ title: "Upload Successful", description: "Image saved to cloud and ready for use." });
        } catch (uploadError: any) {
          console.error("FRC: Cloud upload error:", uploadError.message, uploadError.code, uploadError.stack, uploadError);
          toast({ title: "Cloud Upload Failed", description: `Error: ${uploadError.message || 'Could not save image to cloud.'}`, variant: "destructive" });
          setImageDataUrl(localDataUrl); 
          setOriginalImageStoragePath(null); 
        } finally {
          console.log("FRC: Cloud upload 'finally' block reached. Setting isProcessing to false.");
          setIsProcessing(false);
        }
      };
      img.onerror = (errEv) => {
        console.error("FRC: img.onerror triggered during initial load/preview. Error:", errEv);
        toast({ title: "Image Load Error", description: "Could not load the image for preview.", variant: "destructive" });
        setIsProcessing(false);
        console.log("FRC: img.onerror, isProcessing: false");
      }
      img.src = localDataUrl;
    };
    reader.onerror = (errEv) => {
      console.error("FRC: reader.onerror triggered. Error:", errEv);
      toast({ title: "File Read Error", description: "Could not read the file.", variant: "destructive"});
      setIsProcessing(false);
      console.log("FRC: reader.onerror, isProcessing: false");
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
    
    setIsProcessing(true);
    console.log("FRC: Started createRosterFromRegions, isProcessing: true. Image URL:", imageDataUrl);
    const newRosterItems: EditablePerson[] = [];
    const img = new Image();
    img.crossOrigin = "anonymous"; 

    const imageLoadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => { console.log("FRC: Base image loaded for cropping."); resolve(); };
      img.onerror = (errEvent) => {
        let specificErrorMessage = 'Generic image load error. Check browser console for CORS details.';
        let errorDetails = {};
        if (typeof errEvent === 'string') {
          specificErrorMessage = errEvent;
        } else if (errEvent instanceof Event) {
          specificErrorMessage = `Image load failed. Event type: ${errEvent.type}.`;
          errorDetails = { type: errEvent.type, target: errEvent.target ? 'has target' : 'no target' };
        } else if (typeof errEvent === 'object' && errEvent !== null) {
          try {
            specificErrorMessage = `Image load failed with object error.`;
            errorDetails = JSON.parse(JSON.stringify(errEvent)); // Attempt to serialize for logging
          } catch (e) {
            specificErrorMessage = `Image load failed with non-serializable object error.`;
          }
        }
        console.error("FRC: Error loading image for cropping. URL:", imageDataUrl, "Specific error:", specificErrorMessage, "Details:", errorDetails, "Raw event:", errEvent);
        reject(new Error(`Failed to load base image for cropping. URL: ${imageDataUrl}. Error: ${specificErrorMessage}`));
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
          console.warn("FRC: Could not get 2D context for cropping canvas for region:", i);
          continue;
        }

        ctx.drawImage(
          img,
          Math.floor(region.x), Math.floor(region.y), Math.floor(region.width), Math.floor(region.height),
          0, 0, tempCanvas.width, tempCanvas.height
        );
        
        const faceImageUrlData = tempCanvas.toDataURL('image/png'); 
        newRosterItems.push({
          id: `${Date.now()}-${i}`, 
          faceImageUrl: faceImageUrlData, 
          name: `Person ${roster.length + newRosterItems.length + 1}`,
          aiName: `Person ${roster.length + newRosterItems.length + 1}`, 
          notes: '',
          originalRegion: region,
        });
      }
      setRoster(prev => [...prev, ...newRosterItems]); 
      setDrawnRegions([]); 
      toast({ title: "Roster Updated", description: `${newRosterItems.length} person(s) added to the current roster.` });
    } catch (error: any) {
      console.error("FRC: Error creating roster from regions:", error.message, error.stack, error);
      toast({ title: "Roster Creation Failed", description: (error as Error).message || "Could not process regions.", variant: "destructive" });
    } finally {
      console.log("FRC: createRosterFromRegions 'finally' block. Setting isProcessing to false.");
      setIsProcessing(false);
    }
  }, [imageDataUrl, drawnRegions, roster.length, toast]);

  const selectPerson = useCallback((id: string | null) => {
    setSelectedPersonId(id);
  }, []);

  const updatePersonDetails = useCallback((id: string, details: Partial<Pick<EditablePerson, 'name' | 'notes'>>) => {
    setRoster(prevRoster =>
      prevRoster.map(person =>
        person.id === id ? { ...person, ...details } : person
      )
    );
  }, []);

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

