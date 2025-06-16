
"use client";
import React from 'react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import LandingPageUI from '@/components/features/LandingPageUI';
import EditorUI from '@/components/features/EditorUI';
import { Skeleton } from '@/components/ui/skeleton';

const AppContent = () => {
  const { imageDataUrl, isLoading, isProcessing } = useFaceRoster();

  if (isLoading) {
    // Skeleton loader for initial app load
    return (
      <div className="space-y-8 mt-8">
        <Skeleton className="h-12 w-1/2 mx-auto" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  if (isProcessing) {
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


  if (!imageDataUrl) {
    return <LandingPageUI />;
  }

  return <EditorUI />;
}

export default function Home() {
  // FaceRosterProvider is in (main)/layout.tsx
  return <AppContent />;
}
