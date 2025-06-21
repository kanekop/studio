
"use client";
import React from 'react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { useImage } from '@/contexts/ImageContext';
import LandingPageUI from '@/components/features/LandingPageUI';
import EditorUI from '@/components/features/EditorUI';
import { Skeleton } from '@/components/ui/skeleton';

const AppContent = () => {
  const { currentUser, isLoading, isProcessing } = useFaceRoster();
  const { imageDataUrl } = useImage();

  if (isLoading) { // Now isLoading refers to auth state loading
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <svg className="animate-spin h-16 w-16 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-lg text-foreground">Loading application...</p>
      </div>
    );
  }
  
  // If user is not logged in, always show LandingPageUI (which will link to login/signup)
  // This will be refined later to show ImageSet lists if logged in and no active image.
  if (!currentUser) {
    return <LandingPageUI />;
  }

  // If logged in:
  if (isProcessing) { // Image processing for editor
     return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-lg text-foreground">Processing image...</p>
      </div>
    );
  }

  if (!imageDataUrl) { // No active image in editor, show landing page (or ImageSet list later)
    return <LandingPageUI />;
  }

  // Logged in and has an image loaded in the editor
  return <EditorUI />;
}

export default function Home() {
  // FaceRosterProvider is in (main)/layout.tsx
  return <AppContent />;
}
