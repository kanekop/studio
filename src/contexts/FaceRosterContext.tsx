
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Person, Region, DisplayRegion, StoredAppState } from '@/types';
import { loadStateFromLocalStorage, saveStateToLocalStorage, clearStateFromLocalStorage } from '@/lib/localStorage';
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface FaceRosterContextType {
  imageDataUrl: string | null;
  originalImageSize: { width: number; height: number } | null;
  drawnRegions: Region[];
  roster: Person[];
  selectedPersonId: string | null;
  isLoading: boolean;
  isProcessing: boolean; // For long operations like roster creation

  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (displayRegion: Omit<DisplayRegion, 'id'>, imageDisplaySize: { width: number; height: number }) => void;
  clearDrawnRegions: () => void;
  createRosterFromRegions: () => Promise<void>;
  selectPerson: (id: string | null) => void;
  updatePersonDetails: (id: string, details: Partial<Pick<Person, 'name' | 'notes'>>) => void;
  clearAllData: (showToast?: boolean) => void;
  loadFromLocalStorageAndInitialize: () => void;
  getScaledRegionForDisplay: (originalRegion: Region, imageDisplaySize: { width: number; height: number }) => DisplayRegion;
}

const FaceRosterContext = createContext<FaceRosterContextType | undefined>(undefined);

export const FaceRosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [drawnRegions, setDrawnRegions] = useState<Region[]>([]);
  const [roster, setRoster] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Initial loading from localStorage
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  const hasLoadedFromStorage = useRef(false);

  const clearAllData = useCallback((showToast = true) => {
    setImageDataUrl(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
    setRoster([]);
    setSelectedPersonId(null);
    clearStateFromLocalStorage();
    if (showToast) {
      toast({ title: "Data Cleared", description: "Image and roster have been cleared." });
    }
  }, [toast]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "File Too Large", description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({ title: "Invalid File Type", description: "Please upload a PNG, JPG, or WEBP image.", variant: "destructive" });
      return;
    }

    clearAllData(false); // Clear previous data without toast
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImageDataUrl(dataUrl);
        setOriginalImageSize({ width: img.width, height: img.height });
        setIsProcessing(false);
        toast({ title: "Image Uploaded", description: "You can now draw regions on the image." });
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
  }, [toast, clearAllData]);
  
  const loadFromLocalStorageAndInitialize = useCallback(() => {
    setIsLoading(true);
    const storedState = loadStateFromLocalStorage();
    if (storedState) {
      setImageDataUrl(storedState.imageDataUrl || null);
      setOriginalImageSize(storedState.originalImageSize || null);
      setRoster(storedState.roster || []);
      // drawnRegions are not typically saved as they are transient before roster creation.
      // If needed, they could be added to StoredAppState.
      toast({ title: "Data Restored", description: "Previously saved roster has been loaded." });
    } else {
      // toast({ title: "No Saved Data", description: "No previously saved roster found." });
    }
    setIsLoading(false);
    hasLoadedFromStorage.current = true;
  }, [toast]);


  useEffect(() => {
    if (!hasLoadedFromStorage.current) {
      loadFromLocalStorageAndInitialize();
    }
  }, [loadFromLocalStorageAndInitialize]);

  useEffect(() => {
    if (!isLoading && hasLoadedFromStorage.current) { // Only save after initial load and if not loading
      saveStateToLocalStorage({ imageDataUrl, originalImageSize, roster });
    }
  }, [imageDataUrl, originalImageSize, roster, isLoading]);

  const convertDisplayToOriginalRegion = (
    displayRegion: Omit<DisplayRegion, 'id'>,
    imageDisplaySize: { width: number; height: number }
  ): Region => {
    if (!originalImageSize || !imageDisplaySize.width || !imageDisplaySize.height) {
      return { ...displayRegion };
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
    if (!originalImageSize) return;
    const originalRegion = convertDisplayToOriginalRegion(displayRegion, imageDisplaySize);
    setDrawnRegions(prev => [...prev, originalRegion]);
  }, [originalImageSize]);

  const clearDrawnRegions = useCallback(() => {
    setDrawnRegions([]);
  }, []);

  const createRosterFromRegions = useCallback(async () => {
    if (!imageDataUrl || drawnRegions.length === 0) {
      toast({ title: "No Regions", description: "Please draw regions on the image first.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    const newRoster: Person[] = [];
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
        tempCanvas.width = Math.max(1, region.width); // Ensure canvas has at least 1x1 dimensions
        tempCanvas.height = Math.max(1, region.height);
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) continue;

        ctx.drawImage(
          img,
          region.x, region.y, region.width, region.height,
          0, 0, tempCanvas.width, tempCanvas.height
        );
        
        const faceImageUrl = tempCanvas.toDataURL('image/png');
        newRoster.push({
          id: `${Date.now()}-${i}`,
          faceImageUrl,
          name: `Person ${roster.length + newRoster.length + 1}`,
          aiName: `Person ${roster.length + newRoster.length + 1}`,
          notes: '',
          originalRegion: region,
        });
      }
      setRoster(prev => [...prev, ...newRoster]);
      setDrawnRegions([]); // Clear regions after processing
      toast({ title: "Roster Created", description: `${newRoster.length} person(s) added to the roster.` });
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

  const updatePersonDetails = useCallback((id: string, details: Partial<Pick<Person, 'name' | 'notes'>>) => {
    setRoster(prevRoster =>
      prevRoster.map(person =>
        person.id === id ? { ...person, ...details } : person
      )
    );
    toast({ title: "Details Updated", description: "Person's details have been saved." });
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
      imageDataUrl, originalImageSize, drawnRegions, roster, selectedPersonId, isLoading, isProcessing,
      handleImageUpload, addDrawnRegion, clearDrawnRegions, createRosterFromRegions,
      selectPerson, updatePersonDetails, clearAllData, loadFromLocalStorageAndInitialize, getScaledRegionForDisplay
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

