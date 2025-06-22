'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/infrastructure/firebase/config';
import { useAuth } from './AuthContext';
import { 
  Region, 
  DisplayRegion, 
  EditablePersonInContext 
} from '@/shared/types';

interface ImageSize {
  width: number;
  height: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ImageContextType {
  imageDataUrl: string | null;
  originalImageStoragePath: string | null;
  originalImageSize: { width: number; height: number } | null;
  drawnRegions: Region[];
  isUploading: boolean;
  
  handleImageUpload: (file: File) => Promise<void>;
  addDrawnRegion: (region: DisplayRegion, size: ImageSize) => void;
  clearDrawnRegions: () => void;
  getScaledRegionForDisplay: (region: Region, size: ImageSize) => DisplayRegion;
  clearImage: () => void;
  setImageFromExisting: (dataUrl: string, storagePath: string, size: { width: number; height: number }) => void;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

interface ImageProviderProps {
  children: ReactNode;
}

export const ImageProvider: React.FC<ImageProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [originalImageStoragePath, setOriginalImageStoragePath] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [drawnRegions, setDrawnRegions] = useState<Region[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file: File): Promise<void> => {
    console.log('ImageContext: handleImageUpload called with file:', file.name, file.size);
    
    if (!currentUser) {
      console.error('ImageContext: User not authenticated');
      throw new Error('ユーザーが認証されていません');
    }

    // ファイルサイズとタイプの検証
    if (file.size > MAX_FILE_SIZE) {
      console.error('ImageContext: File size too large:', file.size);
      throw new Error('ファイルサイズが10MBを超えています');
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      console.error('ImageContext: Unsupported file type:', file.type);
      throw new Error('サポートされていないファイル形式です');
    }

    console.log('ImageContext: Starting upload process...');
    setIsUploading(true);

    try {
      // ファイルをFirebase Storageにアップロード
      const fileName = `${Date.now()}_${file.name}`;
      const imageRef = storageRef(storage, `users/${currentUser.uid}/rosters/${fileName}`);
      
      console.log('ImageContext: Uploading to storage path:', `users/${currentUser.uid}/rosters/${fileName}`);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      console.log('ImageContext: Upload successful, download URL:', downloadURL);
      
      // 画像サイズを取得
      const img = new Image();
      img.onload = () => {
        console.log('ImageContext: Image loaded, size:', img.width, 'x', img.height);
        setOriginalImageSize({ width: img.width, height: img.height });
      };
      img.src = downloadURL;

      console.log('ImageContext: Setting image data URL and storage path');
      setImageDataUrl(downloadURL);
      setOriginalImageStoragePath(`users/${currentUser.uid}/rosters/${fileName}`);
      setDrawnRegions([]);
      
      console.log('ImageContext: Upload process completed successfully');
    } catch (error) {
      console.error('ImageContext: Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const addDrawnRegion = (region: DisplayRegion, size: ImageSize): void => {
    // 表示座標を実座標に変換
    const scaleX = originalImageSize ? originalImageSize.width / size.width : 1;
    const scaleY = originalImageSize ? originalImageSize.height / size.height : 1;

    const actualRegion: Region = {
      x: region.x * scaleX,
      y: region.y * scaleY,
      width: region.width * scaleX,
      height: region.height * scaleY,
      id: `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    setDrawnRegions(prev => [...prev, actualRegion]);
  };

  const clearDrawnRegions = (): void => {
    setDrawnRegions([]);
  };

  const getScaledRegionForDisplay = (region: Region, size: ImageSize): DisplayRegion => {
    if (!originalImageSize) {
      return { id: 'default', x: 0, y: 0, width: 0, height: 0 };
    }

    const scaleX = size.width / originalImageSize.width;
    const scaleY = size.height / originalImageSize.height;

    return {
      id: region.id || 'scaled',
      x: region.x * scaleX,
      y: region.y * scaleY,
      width: region.width * scaleX,
      height: region.height * scaleY,
    };
  };

  const clearImage = (): void => {
    setImageDataUrl(null);
    setOriginalImageStoragePath(null);
    setOriginalImageSize(null);
    setDrawnRegions([]);
  };

  const setImageFromExisting = (
    dataUrl: string, 
    storagePath: string, 
    size: { width: number; height: number }
  ): void => {
    setImageDataUrl(dataUrl);
    setOriginalImageStoragePath(storagePath);
    setOriginalImageSize(size);
  };

  const value: ImageContextType = {
    imageDataUrl,
    originalImageStoragePath,
    originalImageSize,
    drawnRegions,
    isUploading,
    handleImageUpload,
    addDrawnRegion,
    clearDrawnRegions,
    getScaledRegionForDisplay,
    clearImage,
    setImageFromExisting,
  };

  return (
    <ImageContext.Provider value={value}>
      {children}
    </ImageContext.Provider>
  );
};

export const useImage = (): ImageContextType => {
  const context = useContext(ImageContext);
  if (context === undefined) {
    throw new Error('useImage must be used within an ImageProvider');
  }
  return context;
};