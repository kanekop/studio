
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Firebase auth instance
import { onAuthStateChanged } from 'firebase/auth';

import type { Person, Region, DisplayRegion } from '@/types';
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// This interface is for the current in-memory Person being edited.
// It uses faceImageUrl (data URL) for immediate display.
// The src/types/Person interface uses faceImageStoragePath for DB persistence.
interface EditablePerson extends Omit<Person, 'id' | 'faceImageStoragePath' | 'originalRegion'> {
  id: string;
  faceImageUrl: string; // Data URL for local display before upload
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
  roster: EditablePerson[]; // Using internal EditablePerson
  selectedPersonId: string | null;
  isLoading: boolean; // For auth state loading and initial data loading later
  isProcessing: boolean; // For long operations like roster creation

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  createRosterFromRegions: () => Promise<void>;
  selectPerson: (id: string | null) => void;
  updatePersonDetails: (id: string, details: Partial<Pick<EditablePerson, 'name' | 'notes'>>) => void;
  clearAllData: (showToast?: boolean) => void; // Resets current editor state
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
}

const FaceRosterContext = createContext<FaceRosterContextType | undefined>(undefined);

// Mock user for development environment
const mockDevUser: FirebaseUser = {
  uid: 'dev-user-uid-12345',
  email: 'dev@example.com',
  displayName: 'Dev User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: 'dev-refresh-token',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'dev-id-token',
  getIdTokenResult: async () => ({
    token: 'dev-id-token',
    expirationTime: '',
    authTime: '',
    issuedAtTime: '',
    signInProvider: null,
    signInSecondFactor: null,
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => ({}),
  providerId: 'password' // Or any relevant provider ID
};


export const FaceRosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [drawnRegions, setDrawnRegions] = useState<Region[]>([]);
  const [roster, setRoster] = useState<EditablePerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // True until auth state is determined
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    // Skip Firebase auth and use mock user in development
    if (process.env.NODE_ENV === 'development') {
      console.log("DEV MODE: Skipping Firebase Auth, using mock user.");
      setCurrentUser(mockDevUser);
      setIsLoading(false);
      return; // Skip Firebase auth listener
    }

    // Production: Use Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
      if (!user) {
        setImageDataUrl(null);
        setOriginalImageSize(null);
        setDrawnRegions([]);
        setRoster([]);
        setSelectedPersonId(null);
      }
    });
    return () => unsubscribe();
  }, []);


  const clearAllData = useCallback((showToast = true) => {
    setImageDataUrl(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
    setRoster([]);
    setSelectedPersonId(null);
    if (showToast) {
      toast({ title: "Editor Cleared", description: "Current image and roster have been cleared." });
    }
  }, [toast]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!currentUser && process.env.NODE_ENV !== 'development') { // Allow upload for mock user in dev
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

    setImageDataUrl(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
    setRoster([]);
    setSelectedPersonId(null);
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
  }, [toast, currentUser]);
  

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
    const newRoster: EditablePerson[] = [];
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
        newRoster.push({
          id: `${Date.now()}-${i}`, 
          faceImageUrl: faceImageUrlData,
          name: `Person ${roster.length + newRoster.length + 1}`,
          aiName: `Person ${roster.length + newRoster.length + 1}`, 
          notes: '',
          originalRegion: region,
        });
      }
      setRoster(prev => [...prev, ...newRoster]);
      setDrawnRegions([]); 
      toast({ title: "Roster Updated", description: `${newRoster.length} person(s) added to the current roster.` });
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
    toast({ title: "Details Updated", description: "Person's details have been updated for the current session." });
  }, [toast]);

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

