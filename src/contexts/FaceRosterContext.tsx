"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, db, storage as appFirebaseStorage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRefStandard, uploadBytes, getDownloadURL, uploadString, StringFormat, deleteObject } from 'firebase/storage';
import { doc, setDoc, addDoc, updateDoc, collection, serverTimestamp, arrayUnion, arrayRemove, query, where, getDocs, orderBy, getDoc, writeBatch, deleteDoc, runTransaction, FirestoreError, Timestamp } from 'firebase/firestore';

import type { Person, Region, DisplayRegion, ImageSet, EditablePersonInContext, FaceAppearance, FieldMergeChoices, SuggestedMergePair, Connection, AdvancedSearchParams } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { suggestPeopleMerges, type SuggestMergeInput, type SuggestMergeOutput } from '@/ai/flows/suggest-people-merges-flow';
import type { EditPersonFormData } from '@/components/features/EditPersonDialog';


const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const FIRESTORE_IN_QUERY_LIMIT = 30;

export type PeopleSortOptionValue = 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc';


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
  peopleSortOption: PeopleSortOptionValue;
  selectedPeopleIdsForDeletion: string[];
  allUserConnections: Connection[];
  isLoadingAllUserConnections: boolean;
  peopleSearchQuery: string;
  peopleCompanyFilter: string | null;
  filteredPeople: Person[];
  advancedSearchParams: AdvancedSearchParams;
  availableHobbies: string[];
  availableConnectionTypes: string[];

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
    fieldChoices: FieldMergeChoices,
    chosenPrimaryPhotoPath: string | null
  ) => Promise<void>;
  fetchMergeSuggestions: () => Promise<void>;
  clearMergeSuggestions: () => void;
  setPeopleSortOption: (option: PeopleSortOptionValue) => void;
  togglePersonSelectionForDeletion: (personId: string) => void;
  clearPeopleSelectionForDeletion: () => void;
  deleteSelectedPeople: () => Promise<void>;
  updateGlobalPersonDetails: (personId: string, details: EditPersonFormData) => Promise<boolean>;

  addConnection: (fromPersonId: string, toPersonId: string, types: string[], reasons: string[], strength?: number, notes?: string) => Promise<string | null>;
  updateConnection: (connectionId: string, updates: Partial<Omit<Connection, 'id' | 'fromPersonId' | 'toPersonId' | 'createdAt'>>) => Promise<boolean>;
  deleteConnection: (connectionId: string) => Promise<boolean>;
  setPeopleSearchQuery: (query: string) => void;
  setPeopleCompanyFilter: (company: string | null) => void;
  getUniqueCompanies: () => string[];
  setAdvancedSearchParams: (params: AdvancedSearchParams) => void;
  clearAllSearchFilters: () => void;
  getAvailableHobbies: () => string[];
  getAvailableConnectionTypes: () => string[];
}

const FaceRosterContext = createContext<FaceRosterContextType | undefined>(undefined);

async function imageStoragePathToDataURI(path: string): Promise<string | undefined> {
  if (!appFirebaseStorage || !path) return undefined;
  try {
    const fileRef = storageRefStandard(appFirebaseStorage, path);
    const url = await getDownloadURL(fileRef);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image from URL ${url}: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
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
  const [isProcessing, setIsProcessingState] = useState<boolean>(false);
  const [currentRosterDocId, setCurrentRosterDocId] = useState<string | null>(null);
  const [userRosters, setUserRosters] = useState<ImageSet[]>([]);
  const [isLoadingUserRosters, setIsLoadingUserRosters] = useState<boolean>(false);
  const [allUserPeople, setAllUserPeople] = useState<Person[]>([]);
  const [isLoadingAllUserPeople, setIsLoadingAllUserPeople] = useState<boolean>(false);
  const [globallySelectedPeopleForMerge, setGloballySelectedPeopleForMerge] = useState<string[]>([]);
  const [mergeSuggestions, setMergeSuggestions] = useState<SuggestedMergePair[]>([]);
  const [isLoadingMergeSuggestions, setIsLoadingMergeSuggestions] = useState<boolean>(false);
  const [peopleSortOption, setPeopleSortOptionState] = useState<PeopleSortOptionValue>('createdAt_desc');
  const [selectedPeopleIdsForDeletion, setSelectedPeopleIdsForDeletion] = useState<string[]>([]);
  const [allUserConnections, setAllUserConnections] = useState<Connection[]>([]);
  const [isLoadingAllUserConnections, setIsLoadingAllUserConnections] = useState<boolean>(false);
  const [peopleSearchQuery, setPeopleSearchQueryState] = useState<string>('');
  const [peopleCompanyFilter, setPeopleCompanyFilterState] = useState<string | null>(null);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [advancedSearchParams, setAdvancedSearchParamsState] = useState<AdvancedSearchParams>({});
  const [availableHobbies, setAvailableHobbies] = useState<string[]>([]);
  const [availableConnectionTypes, setAvailableConnectionTypes] = useState<string[]>([]);

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
      const err = error as FirestoreError;
      if (err.code === 'failed-precondition' && err.message?.includes('query requires an index')) {
        toast({ title: "Database Index Required", description: `A database index is needed for rosters. Error: ${err.message}. The console may provide a link to create it.`, variant: "destructive", duration: 15000 });
      } else if (err.code) {
        toast({ title: "Error Loading Rosters", description: `Could not fetch your saved rosters. Error: ${err.message} (Code: ${err.code})`, variant: "destructive" });
      } else {
        toast({ title: "Error Loading Rosters", description: `Could not fetch your saved rosters. Error: ${(error as Error).message}`, variant: "destructive" });
      }
      setUserRosters([]);
    } finally {
      setIsLoadingUserRosters(false);
    }
  }, [currentUser, toast]);

  const fetchAllConnectionsForAllUserPeople = useCallback(async (peopleIds: string[]) => {
    if (!db || !currentUser || peopleIds.length === 0) {
      setAllUserConnections([]);
      return;
    }
    setIsLoadingAllUserConnections(true);
    const fetchedConnectionsMap = new Map<string, Connection>();

    try {
      // Fetch connections in chunks to avoid Firestore limits
      const idChunks: string[][] = [];
      for (let i = 0; i < peopleIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
        idChunks.push(peopleIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT));
      }

      for (const chunk of idChunks) {
        if (chunk.length === 0) continue;

        const fromQuery = query(collection(db, "connections"), where("fromPersonId", "in", chunk));
        const toQuery = query(collection(db, "connections"), where("toPersonId", "in", chunk));

        const [fromSnapshot, toSnapshot] = await Promise.all([getDocs(fromQuery), getDocs(toQuery)]);

        fromSnapshot.forEach(doc => {
          if (!fetchedConnectionsMap.has(doc.id)) {
            fetchedConnectionsMap.set(doc.id, { id: doc.id, ...doc.data() } as Connection);
          }
        });
        toSnapshot.forEach(doc => {
          if (!fetchedConnectionsMap.has(doc.id)) {
            fetchedConnectionsMap.set(doc.id, { id: doc.id, ...doc.data() } as Connection);
          }
        });
      }
      setAllUserConnections(Array.from(fetchedConnectionsMap.values()));
    } catch (error: any) {
      console.error("FRC: Error fetching connections for all user people:", error);
      toast({ title: "Error Loading Connections", description: `Could not fetch connections data: ${error.message}`, variant: "destructive" });
      setAllUserConnections([]);
    } finally {
      setIsLoadingAllUserConnections(false);
    }
  }, [currentUser, toast]);


  const fetchAllUserPeople = useCallback(async () => {
    if (!currentUser || !db) {
      setAllUserPeople([]);
      setAllUserConnections([]);
      return;
    }
    setIsLoadingAllUserPeople(true);
    try {
      const q = query(
        collection(db, "people"),
        where("addedBy", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      let fetchedPeopleDocs: Person[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPeopleDocs.push({ id: doc.id, ...doc.data() } as Person);
      });

      const [sortField, sortDirection] = peopleSortOption.split('_') as [('createdAt' | 'name'), ('asc' | 'desc')];

      fetchedPeopleDocs.sort((a, b) => {
        let valA, valB;

        if (sortField === 'name') {
          valA = a.name?.toLowerCase() || '';
          valB = b.name?.toLowerCase() || '';
        } else {
          const timeA = (a.createdAt as Timestamp)?.toMillis?.();
          const timeB = (b.createdAt as Timestamp)?.toMillis?.();
          valA = typeof timeA === 'number' ? timeA : 0;
          valB = typeof timeB === 'number' ? timeB : 0;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        const numA = Number(valA);
        const numB = Number(valB);
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      });

      setAllUserPeople(fetchedPeopleDocs);
      if (fetchedPeopleDocs.length > 0) {
        const peopleIds = fetchedPeopleDocs.map(p => p.id);
        await fetchAllConnectionsForAllUserPeople(peopleIds);
      } else {
        setAllUserConnections([]);
      }

    } catch (error) {
      console.error("FRC: Error fetching all user people:", error);
      setAllUserPeople([]);
      setAllUserConnections([]);
    } finally {
      setIsLoadingAllUserPeople(false);
    }
  }, [currentUser, peopleSortOption, fetchAllConnectionsForAllUserPeople, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
      if (!user) {
        clearAllData(false);
        setUserRosters([]);
        setAllUserPeople([]);
        setAllUserConnections([]);
        setGloballySelectedPeopleForMerge([]);
        setMergeSuggestions([]);
        setSelectedPeopleIdsForDeletion([]);
        setPeopleSortOptionState('createdAt_desc');
        setPeopleSearchQueryState('');
        setPeopleCompanyFilterState(null);
        setFilteredPeople([]);
      }
    });
    return () => unsubscribe();
  }, [clearAllData]);

  useEffect(() => {
    if (currentUser) {
      fetchUserRosters();
      fetchAllUserPeople();
    }
  }, [currentUser, peopleSortOption, fetchUserRosters, fetchAllUserPeople]);

  // 拡張されたフィルタリングロジック
  useEffect(() => {
    let filtered = [...allUserPeople];

    // 基本的な名前検索（後方互換性のため維持）
    if (peopleSearchQuery.trim()) {
      const query = peopleSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(person =>
        person.name?.toLowerCase().includes(query) || false
      );
    }

    // 基本的な会社フィルター（後方互換性のため維持）
    if (peopleCompanyFilter && peopleCompanyFilter !== '__all__' && peopleCompanyFilter !== '') {
      filtered = filtered.filter(person =>
        person.company === peopleCompanyFilter
      );
    }

    // 高度な検索パラメータによるフィルタリング
    const params = advancedSearchParams;

    // 名前での検索（拡張版）
    if (params.name?.trim()) {
      const query = params.name.toLowerCase().trim();
      filtered = filtered.filter(person =>
        person.name?.toLowerCase().includes(query) || false
      );
    }

    // 会社での検索（拡張版）
    if (params.company && params.company !== '__all__' && params.company !== '') {
      filtered = filtered.filter(person =>
        person.company === params.company
      );
    }

    // メモでの検索
    if (params.notes?.trim()) {
      const query = params.notes.toLowerCase().trim();
      filtered = filtered.filter(person =>
        person.notes?.toLowerCase().includes(query) || false
      );
    }

    // 趣味でのフィルタリング
    if (params.hobbies && params.hobbies.length > 0) {
      filtered = filtered.filter(person => {
        if (!person.hobbies) return false;
        const personHobbies = person.hobbies.toLowerCase();
        return params.hobbies?.some(hobby => 
          personHobbies.includes(hobby.toLowerCase())
        ) || false;
      });
    }

    // 誕生日範囲でのフィルタリング
    if (params.birthdayRange) {
      filtered = filtered.filter(person => {
        if (!person.birthday) return false;
        try {
          const personBirthday = new Date(person.birthday);
          const { start, end } = params.birthdayRange!;
          return personBirthday >= start && personBirthday <= end;
        } catch {
          return false;
        }
      });
    }

    // 初対面日範囲でのフィルタリング
    if (params.firstMetRange) {
      filtered = filtered.filter(person => {
        if (!person.firstMet) return false;
        try {
          const personFirstMet = new Date(person.firstMet);
          const { start, end } = params.firstMetRange!;
          return personFirstMet >= start && personFirstMet <= end;
        } catch {
          return false;
        }
      });
    }

    // コネクションタイプでのフィルタリング
    if (params.connectionTypes && params.connectionTypes.length > 0) {
      filtered = filtered.filter(person => {
        const personConnections = allUserConnections.filter(conn => 
          conn.fromPersonId === person.id || conn.toPersonId === person.id
        );
        return personConnections.some(conn => 
          conn.types.some(type => params.connectionTypes?.includes(type))
        );
      });
    }

    // コネクション有無でのフィルタリング
    if (params.hasConnections === true) {
      filtered = filtered.filter(person => {
        return allUserConnections.some(conn => 
          conn.fromPersonId === person.id || conn.toPersonId === person.id
        );
      });
    }

    setFilteredPeople(filtered);
  }, [allUserPeople, peopleSearchQuery, peopleCompanyFilter, advancedSearchParams, allUserConnections]);

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
    setIsProcessingState(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const localDataUrl = e.target?.result as string;
      if (!localDataUrl) {
        toast({ title: "File Read Error", description: "Could not read file data for preview.", variant: "destructive" });
        setIsProcessingState(false);
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
          setIsProcessingState(false);
        }
      };
      img.onerror = (errEv) => {
        console.error("FRC: img.onerror triggered during initial load/preview. Error:", errEv);
        toast({ title: "Image Load Error", description: "Could not load the image for preview.", variant: "destructive" });
        setIsProcessingState(false);
      }
      img.src = localDataUrl;
    };
    reader.onerror = (errEv) => {
      console.error("FRC: reader.onerror triggered. Error:", errEv);
      toast({ title: "File Read Error", description: "Could not read the file.", variant: "destructive" });
      setIsProcessingState(false);
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
    if (originalRegion.width === 0 && originalRegion.height === 0) {
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

    setIsProcessingState(true);
    const img = new Image();
    if (imageDataUrl.startsWith('http://') || imageDataUrl.startsWith('https://')) {
      img.crossOrigin = "anonymous";
    }

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

    type UploadedFaceInfo = {
      personId: string;
      defaultName: string;
      faceImageStoragePath: string;
      faceImageUrlForUI: string;
      originalRegion: Region;
    };

    try {
      await imageLoadPromise;
      let personCounter = roster.length;

      const faceProcessingPromises = drawnRegions.map(async (region, index) => {
        personCounter++;
        const defaultName = `Person ${personCounter}`;
        const newPersonId = doc(collection(db!, "people")).id;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.max(1, Math.floor(region.width));
        tempCanvas.height = Math.max(1, Math.floor(region.height));
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) {
          console.warn(`FRC: Could not get 2D context for canvas for region ${index}, skipping.`);
          return null;
        }
        ctx.drawImage(img, Math.floor(region.x), Math.floor(region.y), Math.floor(region.width), Math.floor(region.height), 0, 0, tempCanvas.width, tempCanvas.height);
        const faceImageDataURI = tempCanvas.toDataURL('image/png');

        const croppedFaceFileName = `${currentRosterDocId}_${newPersonId}_${Date.now()}.png`;
        const faceImageStoragePath = `users/${currentUser!.uid}/cropped_faces/${croppedFaceFileName}`;
        const croppedFaceRef = storageRefStandard(appFirebaseStorage!, faceImageStoragePath);

        try {
          const uploadResult = await uploadString(croppedFaceRef, faceImageDataURI, StringFormat.DATA_URL);
          const downloadURL = await getDownloadURL(uploadResult.ref);
          return {
            personId: newPersonId,
            defaultName,
            faceImageStoragePath,
            faceImageUrlForUI: downloadURL,
            originalRegion: region
          } as UploadedFaceInfo;
        } catch (uploadError) {
          console.error(`FRC: Error uploading face image for new person (ID: ${newPersonId}) or getting URL:`, uploadError);
          toast({ title: "Image Upload Failed", description: `Could not save image for ${defaultName}.`, variant: "destructive" });
          return null;
        }
      });

      const successfullyUploadedFaces = (await Promise.all(faceProcessingPromises)).filter(res => res !== null) as UploadedFaceInfo[];

      if (successfullyUploadedFaces.length === 0 && drawnRegions.length > 0) {
        toast({ title: "Processing Error", description: "Could not process any of the selected regions for saving.", variant: "destructive" });
        setIsProcessingState(false);
        return;
      }
      if (successfullyUploadedFaces.length === 0) {
        setIsProcessingState(false);
        return;
      }

      const batch = writeBatch(db!);
      const newPersonIdsForRosterUpdate: string[] = [];
      const newPeopleForUI: EditablePersonInContext[] = [];

      successfullyUploadedFaces.forEach(faceInfo => {
        const newAppearance: FaceAppearance = {
          rosterId: currentRosterDocId!,
          faceImageStoragePath: faceInfo.faceImageStoragePath,
          originalRegion: faceInfo.originalRegion,
        };
        const newPersonDataForDb: Omit<Person, 'id' | 'knownAcquaintances' | 'spouse'> = {
          name: faceInfo.defaultName,
          aiName: faceInfo.defaultName,
          notes: '', company: '', hobbies: '', birthday: '', firstMet: '', firstMetContext: '',
          faceAppearances: [newAppearance],
          primaryFaceAppearancePath: newAppearance.faceImageStoragePath,
          addedBy: currentUser!.uid,
          rosterIds: [currentRosterDocId!],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const personDocRef = doc(db!, "people", faceInfo.personId);
        batch.set(personDocRef, newPersonDataForDb);
        newPersonIdsForRosterUpdate.push(faceInfo.personId);

        newPeopleForUI.push({
          id: faceInfo.personId,
          isNew: false,
          name: faceInfo.defaultName,
          aiName: faceInfo.defaultName,
          notes: '',
          company: '',
          hobbies: '',
          birthday: '',
          firstMet: '',
          firstMetContext: '',
          faceImageUrl: faceInfo.faceImageUrlForUI,
          currentRosterAppearance: newAppearance,
        });
      });

      const rosterRef = doc(db!, "rosters", currentRosterDocId!);
      batch.update(rosterRef, {
        peopleIds: arrayUnion(...newPersonIdsForRosterUpdate),
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      setRoster(prev => [...prev, ...newPeopleForUI]);
      setDrawnRegions([]);

      if (newPeopleForUI.length > 0) {
        setSelectedPersonId(newPeopleForUI[0].id);
        await fetchUserRosters();
        await fetchAllUserPeople();
        toast({ title: "Roster Updated", description: `${newPeopleForUI.length} new person/people saved to the roster.` });
      } else if (drawnRegions.length > 0) {
        toast({ title: "Save Incomplete", description: "Some new people could not be saved due to image processing or upload errors.", variant: "destructive" });
      }

    } catch (error: any) {
      console.error("FRC: Error during batch roster creation:", error);
      toast({ title: "Roster Creation Failed", description: `Could not save new people: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessingState(false);
    }
  }, [imageDataUrl, drawnRegions, roster.length, toast, currentUser, currentRosterDocId, fetchAllUserPeople, fetchUserRosters]);


  const selectPerson = useCallback((id: string | null) => {
    setSelectedPersonId(id);
  }, []);

  const updatePersonDetails = useCallback(async (
    personIdToUpdate: string,
    details: Partial<Omit<EditablePersonInContext, 'id' | 'currentRosterAppearance' | 'faceImageUrl' | 'isNew' | 'tempFaceImageDataUri' | 'tempOriginalRegion'>>
  ) => {
    if (!db || !currentUser?.uid || !currentRosterDocId) {
      toast({ title: "Error", description: "User not authenticated, or database service unavailable.", variant: "destructive" });
      return;
    }

    setIsProcessingState(true);
    const localPersonEntry = roster.find(p => p.id === personIdToUpdate);
    if (!localPersonEntry) {
      toast({ title: "Error", description: "Person to update not found in current roster view.", variant: "destructive" });
      setIsProcessingState(false);
      return;
    }
    if (localPersonEntry.isNew) {
      toast({ title: "Error", description: "Cannot update 'new' person directly. This should have been handled by createRosterFromRegions.", variant: "destructive" });
      setIsProcessingState(false);
      return;
    }


    const finalName = (details.name || localPersonEntry.name || `Unnamed Person`).trim();
    if (!finalName) {
      toast({ title: "Validation Error", description: "Person's name cannot be empty.", variant: "destructive" });
      setIsProcessingState(false);
      return;
    }

    try {
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

      setRoster(prevRoster =>
        prevRoster.map(p =>
          p.id === personIdToUpdate
            ? {
              ...p,
              name: finalName,
              notes: details.notes !== undefined ? details.notes : p.notes,
              company: details.company !== undefined ? details.company : p.company,
              hobbies: details.hobbies !== undefined ? details.hobbies : p.hobbies,
              birthday: details.birthday !== undefined ? details.birthday : p.birthday,
              firstMet: details.firstMet !== undefined ? details.firstMet : p.firstMet,
              firstMetContext: details.firstMetContext !== undefined ? details.firstMetContext : p.firstMetContext,
            }
            : p
        )
      );
      await fetchAllUserPeople();
      toast({ title: "Details Saved", description: `${finalName}'s information updated.` });

    } catch (error: any) {
      console.error(`FRC: Error updating person details (ID: ${personIdToUpdate}) in Firestore:`, error);
      toast({ title: "Save Failed", description: `Could not save changes for ${finalName || 'person'}: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessingState(false);
    }
  }, [currentUser, currentRosterDocId, toast, roster, fetchAllUserPeople]);

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
    setIsProcessingState(true);
    clearAllData(false);

    try {
      const rosterDocRef = doc(db, "rosters", rosterId);
      const rosterSnap = await getDoc(rosterDocRef);

      if (!rosterSnap.exists()) {
        toast({ title: "Not Found", description: "The selected roster could not be found.", variant: "destructive" });
        setIsProcessingState(false);
        await fetchUserRosters();
        return;
      }

      const rosterData = rosterSnap.data() as ImageSet;
      if (rosterData.ownerId !== currentUser.uid) {
        toast({ title: "Access Denied", description: "You do not have permission to load this roster.", variant: "destructive" });
        setIsProcessingState(false);
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
        for (let i = 0; i < rosterData.peopleIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
          peopleChunks.push(rosterData.peopleIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT));
        }

        for (const chunk of peopleChunks) {
          if (chunk.length === 0) continue;
          const peopleQuery = query(collection(db, "people"), where("__name__", "in", chunk));
          const peopleSnapshots = await getDocs(peopleQuery);

          for (const personDoc of peopleSnapshots.docs) {
            const personData = { id: personDoc.id, ...personDoc.data() } as Person;

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
                toast({ title: "Image Load Error", description: `Could not load face for ${personData.name}.`, variant: "destructive" });
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
      setIsProcessingState(false);
    }
  }, [currentUser, toast, fetchUserRosters, clearAllData]);


  const deleteRoster = useCallback(async (rosterId: string) => {
    if (!db || !appFirebaseStorage || !currentUser) {
      toast({ title: "Error", description: "Cannot delete: Not logged in or Firebase services unavailable.", variant: "destructive" });
      return;
    }
    setIsProcessingState(true);
    try {
      const rosterDocRef = doc(db, "rosters", rosterId);
      const rosterSnap = await getDoc(rosterDocRef);

      if (!rosterSnap.exists()) {
        toast({ title: "Not Found", description: "Roster to delete was not found.", variant: "destructive" });
        setIsProcessingState(false);
        await fetchUserRosters();
        return;
      }
      const rosterData = rosterSnap.data() as ImageSet;

      if (rosterData.ownerId !== currentUser.uid) {
        toast({ title: "Access Denied", description: "You cannot delete this roster.", variant: "destructive" });
        setIsProcessingState(false);
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
                primaryFaceAppearancePath: (personData.primaryFaceAppearancePath === appearanceToDelete?.faceImageStoragePath)
                  ? (remainingAppearances?.[0]?.faceImageStoragePath || null)
                  : personData.primaryFaceAppearancePath,
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
        try { await deleteObject(storageRefStandard(appFirebaseStorage, rosterData.originalImageStoragePath)); } catch (e: any) { console.warn("FRC: Failed to delete original image from Storage:", rosterData.originalImageStoragePath, e.message); }
      }

      batch.delete(rosterDocRef);
      await batch.commit();

      for (const path of faceImagesToDelete) {
        try { await deleteObject(storageRefStandard(appFirebaseStorage, path)); } catch (e: any) { console.warn("FRC: Failed to delete a face image during roster deletion (post-commit):", path, e.message); }
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
      setIsProcessingState(false);
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
          toast({ title: "Selection Limit", description: "You can only select two people to merge at a time.", variant: "default" });
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
    fieldChoices: FieldMergeChoices,
    chosenPrimaryPhotoPath: string | null
  ) => {
    if (!db || !currentUser) {
      toast({ title: "Merge Error", description: "User not authenticated or database unavailable.", variant: "destructive" });
      return;
    }
    setIsProcessingState(true);

    try {
      await runTransaction(db, async (transaction) => {
        const targetPersonRef = doc(db, "people", targetPersonId);
        const sourcePersonRef = doc(db, "people", sourcePersonId);
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

        let finalPrimaryFacePath = chosenPrimaryPhotoPath;
        if (!finalPrimaryFacePath && mergedFaceAppearances.length > 0) {
          finalPrimaryFacePath = mergedFaceAppearances[0].faceImageStoragePath;
        } else if (!finalPrimaryFacePath) {
          finalPrimaryFacePath = null;
        }


        transaction.update(targetPersonRef, {
          name: mergedName,
          notes: mergedNotes,
          company: mergedCompany || "",
          hobbies: mergedHobbies || "",
          birthday: mergedBirthday || "",
          firstMet: mergedFirstMet || "",
          firstMetContext: mergedFirstMetContext || "",
          faceAppearances: mergedFaceAppearances,
          primaryFaceAppearancePath: finalPrimaryFacePath,
          rosterIds: mergedRosterIds,
          updatedAt: serverTimestamp()
        });

        transaction.delete(sourcePersonRef);
      });

      const connectionsBatch = writeBatch(db);
      const fromConnectionsQuery = query(collection(db, "connections"), where("fromPersonId", "==", sourcePersonId));
      const toConnectionsQuery = query(collection(db, "connections"), where("toPersonId", "==", sourcePersonId));

      const [fromConnectionsSnapshot, toConnectionsSnapshot] = await Promise.all([
        getDocs(fromConnectionsQuery),
        getDocs(toConnectionsQuery)
      ]);

      fromConnectionsSnapshot.forEach(connDoc => {
        const connData = connDoc.data();
        if (connData.toPersonId === targetPersonId) {
          connectionsBatch.delete(connDoc.ref);
        } else {
          connectionsBatch.update(connDoc.ref, { fromPersonId: targetPersonId, updatedAt: serverTimestamp() });
        }
      });

      toConnectionsSnapshot.forEach(connDoc => {
        const connData = connDoc.data();
        if (connData.fromPersonId === targetPersonId) {
          if (!fromConnectionsSnapshot.docs.some(d => d.id === connDoc.id && d.data().toPersonId === targetPersonId)) {
            connectionsBatch.delete(connDoc.ref);
          }
        } else {
          connectionsBatch.update(connDoc.ref, { toPersonId: targetPersonId, updatedAt: serverTimestamp() });
        }
      });
      await connectionsBatch.commit();


      const batchForRosterUpdates = writeBatch(db);
      const sourceRosterIdsFromDataSource = allUserPeople.find(p => p.id === sourcePersonId)?.rosterIds || [];

      for (const rosterId of sourceRosterIdsFromDataSource) {
        const rosterRef = doc(db, "rosters", rosterId);
        batchForRosterUpdates.update(rosterRef, {
          peopleIds: arrayRemove(sourcePersonId)
        });
        batchForRosterUpdates.update(rosterRef, {
          peopleIds: arrayUnion(targetPersonId)
        });
      }
      await batchForRosterUpdates.commit();


      const sourceName = allUserPeople.find(p => p.id === sourcePersonId)?.name || "Deleted Person";
      const targetPersonFromAll = allUserPeople.find(p => p.id === targetPersonId);
      const targetNameAfterMerge = (fieldChoices.name === 'person1' ? targetPersonFromAll?.name : sourceName) || (targetPersonFromAll?.name || "Merged Person");

      toast({ title: "Merge Successful", description: `${sourceName} has been merged into ${targetNameAfterMerge}. Connections updated.` });

      await fetchAllUserPeople();
      await fetchUserRosters();
      clearGlobalMergeSelection();

    } catch (error: any) {
      console.error("FRC: Error merging people:", error);
      toast({ title: "Merge Failed", description: `Could not merge people: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessingState(false);
    }
  }, [db, currentUser, toast, fetchAllUserPeople, fetchUserRosters, clearGlobalMergeSelection, allUserPeople]);

  const fetchMergeSuggestions = useCallback(async () => {
    if (!currentUser || allUserPeople.length < 2) {
      setMergeSuggestions([]);
      if (allUserPeople.length < 2 && currentUser) {
        toast({ title: "Not Enough People", description: "Need at least two people registered to suggest merges.", variant: "default" });
      }
      return;
    }
    setIsLoadingMergeSuggestions(true);
    setMergeSuggestions([]);

    try {
      const peopleWithImageDataPromises = allUserPeople.map(async (p) => {
        let faceImageDataUri: string | undefined = undefined;
        const pathToUse = p.primaryFaceAppearancePath || p.faceAppearances?.[0]?.faceImageStoragePath;
        if (pathToUse) {
          faceImageDataUri = await imageStoragePathToDataURI(pathToUse);
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
      const validSuggestions = suggestions.filter(s => 
        s.person1Id && s.person1Name && s.person2Id && s.person2Name && s.reason
      ).map(s => ({
        person1Id: s.person1Id!,
        person1Name: s.person1Name!,
        person2Id: s.person2Id!,
        person2Name: s.person2Name!,
        reason: s.reason!,
        confidence: s.confidence
      }));
      setMergeSuggestions(validSuggestions);

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

  const clearMergeSuggestions = useCallback(() => {
    setMergeSuggestions([]);
  }, []);

  const setPeopleSortOption = useCallback((option: PeopleSortOptionValue) => {
    setPeopleSortOptionState(option);
  }, []);

  const togglePersonSelectionForDeletion = useCallback((personId: string) => {
    setSelectedPeopleIdsForDeletion(prevSelected => {
      if (prevSelected.includes(personId)) {
        return prevSelected.filter(id => id !== personId);
      } else {
        return [...prevSelected, personId];
      }
    });
  }, []);

  const clearPeopleSelectionForDeletion = useCallback(() => {
    setSelectedPeopleIdsForDeletion([]);
  }, []);

  const deleteSelectedPeople = useCallback(async () => {
    if (!db || !appFirebaseStorage || !currentUser) {
      toast({ title: "Error", description: "Cannot delete: Not logged in or Firebase services unavailable.", variant: "destructive" });
      return;
    }
    if (selectedPeopleIdsForDeletion.length === 0) {
      toast({ title: "No Selection", description: "No people selected for deletion.", variant: "default" });
      return;
    }

    setIsProcessingState(true);
    const numPeopleToDelete = selectedPeopleIdsForDeletion.length;
    const imagesToDeleteFromStorage: string[] = [];
    const firestoreBatch = writeBatch(db);
    let successfullyProcessedFirestore = false;

    try {
      for (const personId of selectedPeopleIdsForDeletion) {
        const personDocRef = doc(db, "people", personId);
        const personSnap = await getDoc(personDocRef);

        if (!personSnap.exists()) {
          console.warn(`FRC: Person ${personId} not found for deletion during batch preparation. Skipping.`);
          continue;
        }
        const personData = personSnap.data() as Person;

        personData.faceAppearances?.forEach(appearance => {
          if (appearance.faceImageStoragePath) {
            imagesToDeleteFromStorage.push(appearance.faceImageStoragePath);
          }
        });

        if (personData.rosterIds && personData.rosterIds.length > 0) {
          for (const rosterId of personData.rosterIds) {
            const rosterRef = doc(db, "rosters", rosterId);
            firestoreBatch.update(rosterRef, {
              peopleIds: arrayRemove(personId),
              updatedAt: serverTimestamp()
            });
          }
        }

        const connectionsToDeleteQuery1 = query(collection(db, "connections"), where("fromPersonId", "==", personId));
        const connectionsToDeleteQuery2 = query(collection(db, "connections"), where("toPersonId", "==", personId));
        const [connSnapshot1, connSnapshot2] = await Promise.all([getDocs(connectionsToDeleteQuery1), getDocs(connectionsToDeleteQuery2)]);
        connSnapshot1.forEach(doc => firestoreBatch.delete(doc.ref));
        connSnapshot2.forEach(doc => firestoreBatch.delete(doc.ref));

        firestoreBatch.delete(personDocRef);
      }

      await firestoreBatch.commit();
      successfullyProcessedFirestore = true;
      toast({ title: "Database Update Complete", description: `Successfully processed ${numPeopleToDelete} person(s) and their connections in the database.` });

    } catch (error: any) {
      console.error(`FRC: Error during Firestore batch deletion:`, error);
      toast({ title: "Database Deletion Failed", description: `Could not delete people from database: ${error.message}. Some people may not have been deleted.`, variant: "destructive" });

      setIsProcessingState(false);
      await fetchAllUserPeople();
      await fetchUserRosters();
      return;
    }


    if (successfullyProcessedFirestore) {
      let imagesSuccessfullyDeletedCount = 0;
      const uniqueImagesToDelete = Array.from(new Set(imagesToDeleteFromStorage));
      for (const path of uniqueImagesToDelete) {
        try {
          await deleteObject(storageRefStandard(appFirebaseStorage, path));
          imagesSuccessfullyDeletedCount++;
        } catch (storageError: any) {
          console.warn(`FRC: Failed to delete face image ${path} from Storage:`, storageError.message);
        }
      }
      if (uniqueImagesToDelete.length > 0) {
        toast({ title: "Image Cleanup Complete", description: `Attempted to delete ${uniqueImagesToDelete.length} associated image(s). ${imagesSuccessfullyDeletedCount} successful.` });
      }
    }


    clearPeopleSelectionForDeletion();
    await fetchAllUserPeople();
    await fetchUserRosters();
    setIsProcessingState(false);

  }, [db, appFirebaseStorage, currentUser, selectedPeopleIdsForDeletion, toast, clearPeopleSelectionForDeletion, fetchAllUserPeople, fetchUserRosters]);


  const updateGlobalPersonDetails = useCallback(async (personId: string, details: EditPersonFormData): Promise<boolean> => {
    if (!db || !currentUser) {
      toast({ title: "Error", description: "User not authenticated or database service unavailable.", variant: "destructive" });
      return false;
    }

    setIsProcessingState(true);
    try {
      const personDocRef = doc(db, "people", personId);
      const updateData: Partial<Omit<Person, 'id' | 'knownAcquaintances' | 'spouse'>> & { updatedAt: any } = {
        name: details.name,
        company: details.company || "",
        hobbies: details.hobbies || "",
        birthday: details.birthday || "",
        firstMet: details.firstMet || "",
        firstMetContext: details.firstMetContext || "",
        notes: details.notes || "",
        primaryFaceAppearancePath: details.primaryFaceAppearancePath || null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(personDocRef, updateData as any);
      toast({ title: "Details Updated", description: `${details.name}'s information has been saved.` });
      await fetchAllUserPeople();
      return true;
    } catch (error: any) {
      console.error(`FRC: Error updating global person details (ID: ${personId}):`, error);
      toast({ title: "Save Failed", description: `Could not save changes for ${details.name}: ${error.message}`, variant: "destructive" });
      return false;
    } finally {
      setIsProcessingState(false);
    }
  }, [currentUser, db, toast, fetchAllUserPeople]);

  const addConnection = useCallback(async (
    fromPersonId: string,
    toPersonId: string,
    types: string[],
    reasons: string[],
    strength?: number,
    notes?: string
  ): Promise<string | null> => {
    if (!db || !currentUser) {
      toast({ title: "Error", description: "User not authenticated or database service unavailable.", variant: "destructive" });
      return null;
    }
    setIsProcessingState(true);
    try {
      const connectionData: Omit<Connection, 'id'> = {
        fromPersonId,
        toPersonId,
        types,
        reasons,
        strength: strength ?? null,
        notes: notes ?? "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "connections"), connectionData);
      toast({ title: "Connection Added", description: "The new connection has been saved." });
      if (allUserPeople.length > 0) {
        const peopleIds = allUserPeople.map(p => p.id);
        await fetchAllConnectionsForAllUserPeople(peopleIds);
      }
      return docRef.id;
    } catch (error: any) {
      console.error("FRC: Error adding connection:", error);
      toast({ title: "Connection Failed", description: `Could not save the connection: ${error.message}`, variant: "destructive" });
      return null;
    } finally {
      setIsProcessingState(false);
    }
  }, [db, currentUser, toast, allUserPeople, fetchAllConnectionsForAllUserPeople]);

  const updateConnection = useCallback(async (
    connectionId: string,
    updates: Partial<Omit<Connection, 'id' | 'fromPersonId' | 'toPersonId' | 'createdAt'>>
  ): Promise<boolean> => {
    if (!db || !currentUser) {
      toast({ title: "Error", description: "User not authenticated or database service unavailable.", variant: "destructive" });
      return false;
    }
    setIsProcessingState(true);
    try {
      const connectionRef = doc(db, "connections", connectionId);
      const updateData = { ...updates, updatedAt: serverTimestamp() };
      await updateDoc(connectionRef, updateData);
      toast({ title: "Connection Updated", description: "The connection details have been saved." });

      // Optimistically update local state or refetch
      setAllUserConnections(prev =>
        prev.map(conn => conn.id === connectionId ? { ...conn, ...updateData, updatedAt: new Date() } as Connection : conn)
      );
      // Or, to ensure full consistency, you could refetch after a short delay if optimistic update is complex
      // setTimeout(() => fetchAllConnectionsForAllUserPeople(allUserPeople.map(p => p.id)), 500);

      return true;
    } catch (error: any) {
      console.error(`FRC: Error updating connection ${connectionId}:`, error);
      toast({ title: "Update Failed", description: `Could not update connection: ${error.message}`, variant: "destructive" });
      return false;
    } finally {
      setIsProcessingState(false);
    }
  }, [db, currentUser, toast, allUserPeople, fetchAllConnectionsForAllUserPeople]);

  const deleteConnection = useCallback(async (connectionId: string): Promise<boolean> => {
    if (!db || !currentUser) {
      toast({ title: "Error", description: "User not authenticated or database service unavailable.", variant: "destructive" });
      return false;
    }
    setIsProcessingState(true);
    try {
      const connectionRef = doc(db, "connections", connectionId);
      await deleteDoc(connectionRef);
      toast({ title: "Connection Deleted", description: "The connection has been removed." });
      setAllUserConnections(prev => prev.filter(conn => conn.id !== connectionId));
      return true;
    } catch (error: any) {
      console.error(`FRC: Error deleting connection ${connectionId}:`, error);
      toast({ title: "Delete Failed", description: `Could not delete connection: ${error.message}`, variant: "destructive" });
      return false;
    } finally {
      setIsProcessingState(false);
    }
  }, [db, currentUser, toast]);

  const setPeopleSearchQuery = useCallback((query: string) => {
    setPeopleSearchQueryState(query);
  }, []);

  const setPeopleCompanyFilter = useCallback((company: string | null) => {
    setPeopleCompanyFilterState(company);
  }, []);

  const getUniqueCompanies = useCallback(() => {
    if (!allUserPeople.length) return [];
    const companies = new Set<string>();
    allUserPeople.forEach(p => p.company && companies.add(p.company));
    return Array.from(companies);
  }, [allUserPeople]);

  const setAdvancedSearchParams = useCallback((params: AdvancedSearchParams) => {
    setAdvancedSearchParamsState(params);
  }, []);

  const clearAllSearchFilters = useCallback(() => {
    setPeopleSearchQueryState('');
    setPeopleCompanyFilterState(null);
    setAdvancedSearchParamsState({});
  }, []);

  const getAvailableHobbies = useCallback(() => {
    if (!allUserPeople.length) return [];
    const hobbies = new Set<string>();
    allUserPeople.forEach(person => {
      if (person.hobbies) {
        // 趣味はカンマ区切りで複数入力される可能性があるため分割
        const personHobbies = person.hobbies.split(',').map(h => h.trim()).filter(h => h);
        personHobbies.forEach(hobby => hobbies.add(hobby));
      }
    });
    return Array.from(hobbies).sort();
  }, [allUserPeople]);

  const getAvailableConnectionTypes = useCallback(() => {
    if (!allUserConnections.length) return [];
    const types = new Set<string>();
    allUserConnections.forEach(conn => {
      conn.types.forEach(type => types.add(type));
    });
    return Array.from(types).sort();
  }, [allUserConnections]);

  // Update available options when data changes
  useEffect(() => {
    setAvailableHobbies(getAvailableHobbies());
    setAvailableConnectionTypes(getAvailableConnectionTypes());
  }, [allUserPeople, allUserConnections, getAvailableHobbies, getAvailableConnectionTypes]);

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
      peopleSortOption,
      selectedPeopleIdsForDeletion,
      allUserConnections,
      isLoadingAllUserConnections,
      peopleSearchQuery,
      peopleCompanyFilter,
      filteredPeople,
      advancedSearchParams,
      availableHobbies,
      availableConnectionTypes,
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
      clearMergeSuggestions,
      setPeopleSortOption,
      togglePersonSelectionForDeletion,
      clearPeopleSelectionForDeletion,
      deleteSelectedPeople,
      updateGlobalPersonDetails,
      addConnection,
      updateConnection,
      deleteConnection,
      setPeopleSearchQuery,
      setPeopleCompanyFilter,
      getUniqueCompanies,
      setAdvancedSearchParams,
      clearAllSearchFilters,
      getAvailableHobbies,
      getAvailableConnectionTypes,
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


