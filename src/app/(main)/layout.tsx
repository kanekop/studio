
"use client"; // This needs to be a client component because FaceRosterProvider is a client component
import React from 'react';
import { FaceRosterProvider } from '@/contexts/FaceRosterContext';
import { AppHeader } from '@/components/features/AppHeader';
import { Toaster } from "@/components/ui/toaster";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <FaceRosterProvider>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <Toaster />
      </div>
    </FaceRosterProvider>
  );
}
