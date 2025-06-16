
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser, UserMetadata, IdTokenResult } from 'firebase/auth'; // Import UserMetadata and IdTokenResult
import { auth } from '@/lib/firebase'; // Firebase auth instance
import { onAuthStateChanged } from 'firebase/auth';

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

// More complete mock user for development environment
const mockDevUser: FirebaseUser = {
  uid: 'dev-mock-user-uid-67890',
  email: 'dev-user@example.com',
  displayName: 'Development User',
  photoURL: null,
  phoneNumber: null, // Added from UserInfo
  providerId: 'mockProvider', // Added from UserInfo
  emailVerified: true,
  isAnonymous: false,
  metadata: { // UserMetadata
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  } as UserMetadata,
  providerData: [], // UserInfo[]
  refreshToken: 'mock-dev-refresh-token',
  tenantId: null,
  delete: async () => { console.log('MockUser: delete method called'); },
  getIdToken: async (forceRefresh?: boolean) => { console.log('MockUser: getIdToken called, forceRefresh:', forceRefresh); return 'mock-dev-id-token'; },
  getIdTokenResult: async (forceRefresh?: boolean) => {
    console.log('MockUser: getIdTokenResult called, forceRefresh:', forceRefresh);
    return {
      token: 'mock-dev-id-token',
      authTime: new Date(Date.now() - 3600 * 1000).toISOString(),
      expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(),
      issuedAtTime: new Date().toISOString(),
      signInProvider: 'mockProvider',
      signInSecondFactor: null,
      claims: { mockUser: true, role: 'developer' },
    } as IdTokenResult;
  },
  reload: async () => { console.log('MockUser: reload method called'); },
  toJSON: () => ({ uid: 'dev-mock-user-uid-67890', email: 'dev-user@example.com', displayName: 'Development User' }),
};


export const FaceRosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [drawnRegions, setDrawnRegions] = useState<Region[]>([]);
  const [roster, setRoster] = useState<EditablePerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log(`FaceRosterContext useEffect: NODE_ENV is "${process.env.NODE_ENV}"`);
    if (process.env.NODE_ENV === 'development') {
      console.log("DEV MODE: Attempting to apply mock user.", mockDevUser);
      setCurrentUser(mockDevUser);
      setIsLoading(false);
      console.log("DEV MODE: Mock user applied. isLoading set to false. currentUser:", mockDevUser);
      return () => {
        // No-op cleanup for dev mode, prevents auth listener cleanup if effect re-runs.
        console.log("DEV MODE: useEffect cleanup (no-op).");
      };
    }

    // Production: Use Firebase Auth
    console.log("PRODUCTION MODE: Setting up Firebase Auth listener.");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Firebase Auth state changed. User:", user ? user.uid : null);
      setCurrentUser(user);
      setIsLoading(false);
      if (!user) {
        // Clear editor state if user logs out or is not found (in production)
        setImageDataUrl(null);
        setOriginalImageSize(null);
        setDrawnRegions([]);
        setRoster([]);
        setSelectedPersonId(null);
        console.log("Production mode: User is null, editor state cleared.");
      }
    });
    return () => {
      console.log("PRODUCTION MODE: Cleaning up Firebase Auth listener.");
      unsubscribe();
    };
  }, []);


  const clearAllData = useCallback((showToast = true) => {
    setImageDataUrl(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
    setRoster([]);
    setSelectedPersonId(null);
    if (showToast) {
      toast({ title: "Editor Cleared", description: "Current image and roster have been cleared from the editor." });
    }
  }, [toast]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!currentUser && process.env.NODE_ENV !== 'development') {
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

    clearAllData(false); // Clear previous editor state before loading new image
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImageDataUrl(dataUrl);
        setOriginalImageSize({ width: img.width, height: img.height });
        setIsProcessing(false);
        toast({ title: "Image Ready", description: "You can now draw regions on the image." });
      };
      img.onerror = () => {
        toast({ title: "Image Load Error", description: "Could not load the image.", variant: "destructive" });
        setIsProcessing(false);
      }
      img.src = dataUrl;
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
    setIsProcessing(true);
    const newRosterItems: EditablePerson[] = [];
    const img = new Image();

    const imageLoadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load base image for cropping."));
      img.src = imageDataUrl;
    });

    try {
      await imageLoadPromise;
      for (let i = 0; i < drawnRegions.length; i++) {
        const region = drawnRegions[i];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.max(1, region.width); 
        tempCanvas.height = Math.max(1, region.height);
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) continue;

        ctx.drawImage(
          img,
          region.x, region.y, region.width, region.height,
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
      setRoster(prev => [...prev, ...newRosterItems]); // Append to existing roster if any
      setDrawnRegions([]); 
      toast({ title: "Roster Updated", description: `${newRosterItems.length} person(s) added to the current roster.` });
    } catch (error) {
      console.error("Error creating roster:", error);
      toast({ title: "Roster Creation Failed", description: (error as Error).message || "Could not process regions.", variant: "destructive" });
    } finally {
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
    // No toast here, as it was removed in previous step. Re-add if desired for immediate feedback.
    // toast({ title: "Details Updated", description: "Person's details have been updated for this session." });
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
      currentUser, imageDataUrl, originalImageSize, drawnRegions, roster, selectedPersonId, isLoading, isProcessing,
      handleImageUpload, addDrawnRegion, clearDrawnRegions, createRosterFromRegions,
      selectPerson, updatePersonDetails, clearAllData, 
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

    