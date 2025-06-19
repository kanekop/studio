"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { SmilePlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserDropdown from './UserDropdown';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link'; // Import Link
import { Trash2, Home, LogOut, UserCircle } from 'lucide-react'; // Added Users icon
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const AppHeader = () => {
  const context = useFaceRoster();
  const { toast } = useToast();
  const { currentUser, imageDataUrl } = context;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      // Context's onAuthStateChanged will handle state update and redirection if needed
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log you out. Please try again.", variant: "destructive" });
    }
  };

  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-40">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-headline font-bold flex items-center hover:opacity-90 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-7 w-7">
            <path d="M12 2a10 10 0 0 0-9.95 9.276c.02.04.038.081.058.122A10.001 10.001 0 0 0 12 22a10 10 0 0 0 10-10c0-.283-.012-.564-.035-.842L21.965 11A10 10 0 0 0 12 2Z" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <path d="M9 9h.01" /><path d="M15 9h.01" />
          </svg>
          FaceRoster
        </Link>

        <div className="flex items-center gap-2">
          {currentUser && (
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20">
              <Link href="/people">
                <Users className="mr-2 h-4 w-4" /> People List
              </Link>
            </Button>
          )}
          {currentUser && imageDataUrl && (
            <>
              <Button variant="destructive" onClick={() => context.clearAllData(true)} size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Clear Editor
              </Button>
            </>
          )}
          {currentUser && (
            <Button variant="ghost" onClick={handleLogout} size="sm" className="text-primary-foreground hover:bg-primary-foreground/20">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          )}
          {!currentUser && !context.isLoading && (
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20">
              <Link href="/login">
                <UserCircle className="mr-2 h-4 w-4" /> Login / Sign Up
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
