import { useCallback } from 'react';
import { ref as storageRefStandard, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage as appFirebaseStorage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useAsyncOperation } from './useAsyncOperation';
import { useToast } from './use-toast';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface UploadResult {
  downloadURL: string;
  storagePath: string;
  originalFile: File;
}

interface UseImageUploadOptions {
  folder?: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { folder = 'uploads', onSuccess, onError } = options;

  const validateFile = useCallback((file: File): void => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(`サポートされていないファイル形式です。対応形式: ${ALLOWED_FILE_TYPES.join(', ')}`);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`ファイルサイズが大きすぎます。最大サイズ: ${MAX_FILE_SIZE_MB}MB`);
    }
  }, []);

  const uploadOperation = useCallback(async (file: File): Promise<UploadResult> => {
    if (!currentUser?.uid) {
      throw new Error('ユーザーがログインしていません');
    }

    if (!appFirebaseStorage) {
      throw new Error('Firebase Storage が初期化されていません');
    }

    // Validate file
    validateFile(file);

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const storagePath = `users/${currentUser.uid}/${folder}/${fileName}`;

    // Upload file
    const storageRef = storageRefStandard(appFirebaseStorage, storagePath);
    const uploadResult = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);

    const result: UploadResult = {
      downloadURL,
      storagePath,
      originalFile: file,
    };

    // Call success callback if provided
    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  }, [currentUser?.uid, folder, validateFile, onSuccess]);

  const { execute: upload, isLoading, error, data, reset } = useAsyncOperation(uploadOperation);

  const uploadWithToast = useCallback(async (file: File): Promise<UploadResult | null> => {
    try {
      const result = await upload(file);
      toast({
        title: "アップロード完了",
        description: "画像が正常にアップロードされました",
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';
      toast({
        title: "アップロードエラー",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
      
      return null;
    }
  }, [upload, toast, onError]);

  return {
    upload: uploadWithToast,
    uploadRaw: upload,
    isUploading: isLoading,
    error,
    uploadResult: data,
    reset,
    validateFile,
  };
};