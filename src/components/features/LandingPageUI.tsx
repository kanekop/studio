
"use client";
import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, History, LogIn, Trash2, Edit3, FileImage } from 'lucide-react';
import ImageUploadForm from './ImageUploadForm';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { Skeleton } from '@/components/ui/skeleton';
import type { ImageSet } from '@/types';
import { format } from 'date-fns';


const LandingPageUI = () => {
  const { currentUser, userRosters, isLoadingUserRosters, loadRosterForEditing, isProcessing, deleteRoster, imageDataUrl } = useFaceRoster(); 

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Check if it's a Firebase Timestamp object
    if (timestamp.seconds && timestamp.nanoseconds) {
      return format(timestamp.toDate(), 'PPpp');
    }
    // Check if it's a string date
    if (typeof timestamp === 'string') {
      try {
        return format(new Date(timestamp), 'PPpp');
      } catch (e) {
        return 'Invalid Date';
      }
    }
    // Check if it's already a Date object
    if (timestamp instanceof Date) {
        return format(timestamp, 'PPpp');
    }
    return 'Unknown Date Format';
  };


  // Don't render landing page content if editor is active
  if (imageDataUrl && currentUser) {
    return null; 
  }


  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Left Column: Welcome Message & Instructions OR Roster List */}
        <div className="space-y-6">
          {!currentUser ? (
            <>
              <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">
                Welcome to FaceRoster!
              </h1>
              <p className="text-lg text-foreground/80">
                Easily create visual rosters from your meeting screenshots or group photos.
                Upload an image, mark the faces, and build your personalized roster in minutes.
                Login to save your work to the cloud.
              </p>
              <div className="mt-4 p-4 border-l-4 border-accent bg-accent/10 rounded-md">
                <h2 className="text-xl font-headline font-semibold text-accent-foreground mb-2">How it works:</h2>
                <ul className="list-disc list-inside space-y-1 text-foreground/70">
                  <li>Login or create an account.</li>
                  <li>Upload your image (PNG, JPG, WEBP).</li>
                  <li>Click and drag to draw rectangles around faces.</li>
                  <li>Click "Create Roster from Selections".</li>
                  <li>Edit names and add notes for each person.</li>
                  <li>Your work will be saved to your account.</li>
                </ul>
              </div>
               <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
                <Image
                  src="https://placehold.co/600x338.png"
                  alt="FaceRoster app explanation image"
                  width={600}
                  height={338}
                  className="object-cover w-full h-full"
                  data-ai-hint="team meeting video"
                  priority 
                />
              </div>
            </>
          ) : (
            // Logged In: Show "Your Saved Rosters"
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center">
                  <History className="mr-2 h-6 w-6 text-primary" /> Your Saved Rosters
                </CardTitle>
                <CardDescription>
                  Select a roster to continue editing or view its details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingUserRosters ? (
                  <>
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-12 w-full rounded-md" />
                  </>
                ) : userRosters.length > 0 ? (
                  <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {userRosters.map((roster) => (
                      <li key={roster.id} className="p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-primary-foregroundtruncate max-w-xs">{roster.rosterName}</h3>
                            <p className="text-xs text-muted-foreground">
                              Created: {formatDate(roster.createdAt)}
                            </p>
                             <p className="text-xs text-muted-foreground">
                              People: {roster.peopleIds?.length || 0}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => loadRosterForEditing(roster.id)}
                              disabled={isProcessing}
                              className="group"
                            >
                              <Edit3 className="mr-1.5 h-4 w-4 group-hover:animate-pulse" /> Load
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              onClick={() => deleteRoster(roster.id)} // Implement deleteRoster in context
                              disabled={isProcessing}
                            >
                              <Trash2 className="h-4 w-4" />
                               <span className="sr-only">Delete Roster</span>
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    You have no saved rosters yet. Upload an image to create one!
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Image Uploader / Login */}
        <div>
          <Card className="shadow-xl sticky top-24"> {/* Sticky for better UX if roster list is long */}
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <UploadCloud className="mr-2 h-6 w-6 text-primary" /> 
                {currentUser ? "Start a New Roster" : "Get Started"}
              </CardTitle>
              <CardDescription>
                {currentUser ? "Upload an image to begin a new roster." : "Login or sign up to save and manage your rosters."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentUser ? (
                <ImageUploadForm />
              ) : (
                <div className="text-center space-y-4 py-4">
                    <p className="text-muted-foreground">Please login to create and manage your rosters.</p>
                    <Button asChild className="w-full">
                        <a href="/login">
                            <LogIn className="mr-2 h-5 w-5" /> Login / Sign Up
                        </a>
                    </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LandingPageUI;
