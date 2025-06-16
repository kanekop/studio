
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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
  imageDataUrl: string | null; // Can be local data URI or cloud download URL
  originalImageStoragePath: string | null; // Full path in Firebase Storage for the original image
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
      setCurrentUser(user);
      setIsLoading(false);
      if (!user) {
        clearAllData(false); // Clear editor state if user logs out
      }
    });
    return () => unsubscribe();
  }, []);


  const clearAllData = useCallback((showToast = true) => {
    // Note: Deleting from cloud storage is not handled here.
    // That would typically happen when a "Roster" entity is deleted from Firestore.
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
        // Set local preview first
        setImageDataUrl(localDataUrl);
        setOriginalImageSize({ width: img.width, height: img.height });
        toast({ title: "Image Preview Ready", description: "Uploading to cloud storage..." });

        // Then upload to Firebase Cloud Storage
        try {
          const storage = await import('@/lib/firebase').then(mod => mod.storage);
          if (!storage || !currentUser.uid) {
            throw new Error("Storage service or user ID is not available.");
          }
          
          const imageName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`; // Sanitize filename
          const imagePath = `users/${currentUser.uid}/original_images/${imageName}`;
          const imageFileRef = storageRef(storage, imagePath);

          const uploadTask = await uploadBytes(imageFileRef, file);
          const downloadURL = await getDownloadURL(uploadTask.ref);

          setOriginalImageStoragePath(uploadTask.ref.fullPath);
          setImageDataUrl(downloadURL); // Update to cloud URL
          
          toast({ title: "Upload Successful", description: "Image saved to cloud and ready for use." });
        } catch (uploadError: any) {
          console.error("Cloud upload error:", uploadError);
          toast({ title: "Cloud Upload Failed", description: uploadError.message || "Could not save image to cloud.", variant: "destructive" });
          // Revert to local data URL if cloud upload fails, so user can still work if they choose
          setImageDataUrl(localDataUrl);
          setOriginalImageStoragePath(null); // Ensure no stale path
        } finally {
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        toast({ title: "Image Load Error", description: "Could not load the image for preview.", variant: "destructive" });
        setIsProcessing(false);
      }
      img.src = localDataUrl;
    };
    reader.onerror = () => {
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
      console.warn("Cannot convert display region: originalImageSize or imageDisplaySize is invalid.");
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
    if (!originalImageStoragePath && !imageDataUrl.startsWith('data:')) {
        toast({ title: "Image Not Saved", description: "Original image must be saved to cloud first.", variant: "destructive" });
        // This case might occur if initial cloud upload failed and user tries to proceed.
        // Or if local state is somehow corrupted.
        return;
    }

    setIsProcessing(true);
    const newRosterItems: EditablePerson[] = [];
    const img = new Image();
    // Important for canvas operations on images from different origins (like Firebase Storage)
    img.crossOrigin = "anonymous"; 

    const imageLoadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => {
        console.error("Error loading image for cropping. URL:", imageDataUrl, "Error:", err);
        reject(new Error("Failed to load base image for cropping. Check console for details."));
      };
      img.src = imageDataUrl; // This could be a data: URL or an https:// cloud URL
    });

    try {
      await imageLoadPromise;
      for (let i = 0; i < drawnRegions.length; i++) {
        const region = drawnRegions[i];
        const tempCanvas = document.createElement('canvas');
        // Ensure cropped dimensions are at least 1x1 to avoid errors with toDataURL
        tempCanvas.width = Math.max(1, Math.floor(region.width)); 
        tempCanvas.height = Math.max(1, Math.floor(region.height));
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) continue;

        ctx.drawImage(
          img,
          Math.floor(region.x), Math.floor(region.y), Math.floor(region.width), Math.floor(region.height),
          0, 0, tempCanvas.width, tempCanvas.height
        );
        
        // For now, faceImageUrl is a data URL. Uploading cropped faces will be a separate step.
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
    } catch (error) {
      console.error("Error creating roster:", error);
      toast({ title: "Roster Creation Failed", description: (error as Error).message || "Could not process regions.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [imageDataUrl, drawnRegions, roster.length, toast, originalImageStoragePath]);

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

