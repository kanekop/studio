
"use client"; // This needs to be a client component because our providers are client components
import React from 'react';
import { AppProviders } from '@/contexts';
import { AppHeader } from '@/components/features/AppHeader.improved';
import { Toaster } from "@/components/ui/toaster";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <Toaster />
      </div>
    </AppProviders>
  );
}
