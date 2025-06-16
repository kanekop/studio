
"use client";
import React from 'react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { Button } from '@/components/ui/button';
import { Trash2, Home, Save } from 'lucide-react';

const AppHeader = () => {
  const context = useFaceRoster();

  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-headline font-bold flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-7 w-7">
            <path d="M12 2a10 10 0 0 0-9.95 9.276c.02.04.038.081.058.122A10.001 10.001 0 0 0 12 22a10 10 0 0 0 10-10c0-.283-.012-.564-.035-.842L21.965 11A10 10 0 0 0 12 2Z"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <path d="M9 9h.01"/><path d="M15 9h.01"/>
          </svg>
          FaceRoster
        </h1>
        {context && context.imageDataUrl && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={context.saveAndReturnToLanding} size="sm" className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground">
              <Home className="mr-2 h-4 w-4" /> Save &amp; Exit to Home
            </Button>
            <Button variant="destructive" onClick={() => context.clearAllData(true)} size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
