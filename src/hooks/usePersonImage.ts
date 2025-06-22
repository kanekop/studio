import { useMemo } from 'react';
import { useStorageImage } from './useStorageImage';
import type { Person, FaceAppearance } from '@/shared/types';

interface UsePersonImageResult {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
  fallbackUrl: string;
}

const PLACEHOLDER_IMAGE = '/placeholder-avatar.png'; // Default placeholder image

export const usePersonImage = (person: Person | null): UsePersonImageResult => {
  const primaryImagePath = useMemo(() => {
    if (!person) return null;
    
    // Try to get the primary image path from face appearances
    const primaryAppearance = person.faceAppearances?.find(
      (appearance: FaceAppearance) => appearance.isPrimary
    );
    
    if (primaryAppearance?.faceImageStoragePath) {
      return primaryAppearance.faceImageStoragePath;
    }
    
    // Fallback to first available face image
    const firstAppearance = person.faceAppearances?.[0];
    if (firstAppearance?.faceImageStoragePath) {
      return firstAppearance.faceImageStoragePath;
    }
    
    // Fallback to general profile image path if available
    if (person.profileImagePath) {
      return person.profileImagePath;
    }
    
    return null;
  }, [person]);

  const { imageUrl, isLoading, error, retry } = useStorageImage(primaryImagePath);

  const fallbackUrl = useMemo(() => {
    return PLACEHOLDER_IMAGE;
  }, []);

  return {
    imageUrl: imageUrl || fallbackUrl,
    isLoading,
    error,
    retry,
    fallbackUrl,
  };
};

export const useFaceAppearanceImages = (
  faceAppearances: FaceAppearance[] | undefined
): Record<string, UsePersonImageResult> => {
  const imageResults = useMemo(() => {
    if (!faceAppearances) return {};
    
    const results: Record<string, UsePersonImageResult> = {};
    
    faceAppearances.forEach((appearance) => {
      if (appearance.faceImageStoragePath) {
        // Note: This would need to be implemented differently in a real hook
        // as we can't call hooks in a loop. This is a simplified version.
        // In practice, you'd need to restructure this or use a different approach.
        results[appearance.id] = {
          imageUrl: null,
          isLoading: false,
          error: null,
          retry: () => {},
          fallbackUrl: PLACEHOLDER_IMAGE,
        };
      }
    });
    
    return results;
  }, [faceAppearances]);

  return imageResults;
};