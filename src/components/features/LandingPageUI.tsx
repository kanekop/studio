"use client";
import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, History, LogIn, Trash2, Edit3, FileImage } from 'lucide-react';
import ImageUploadForm from './ImageUploadForm';
import { useAuth, useFaceRoster, useImage } from '@/contexts';
import { Skeleton } from '@/components/ui/skeleton';
import type { ImageSet } from '@/types';
import { format } from 'date-fns';


const LandingPageUI = () => {
  const { currentUser } = useAuth();
  const { userRosters, isLoadingUserRosters, loadRosterForEditing, deleteRoster } = useFaceRoster();
  const { imageDataUrl } = useImage();

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
              <div className="space-y-4 pt-4">
                <h2 className="text-2xl font-semibold">How it works:</h2>
                <ol className="list-decimal list-inside space-y-2 text-foreground/80">
                  <li>Upload an image with people's faces</li>
                  <li>Mark each face using simple click-and-drag</li>
                  <li>Add names and details for each person</li>
                  <li>Save your roster for future reference</li>
                </ol>
              </div>
            </>
          ) : (
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center">
                  <History className="mr-2 h-6 w-6 text-primary" /> Your Saved Rosters
                </CardTitle>
                <CardDescription>
                  Select a roster to continue editing or view its details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUserRosters ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : userRosters.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {userRosters.map((roster) => (
                      <div
                        key={roster.id}
                        className="border rounded-lg p-4 hover:bg-accent/10 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold flex items-center">
                              <FileImage className="mr-2 h-4 w-4" />
                              {roster.rosterName || 'Untitled Roster'}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {roster.description || 'No description'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Created: {formatDate(roster.createdAt)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              People: {roster.peopleIds?.length || 0}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadRosterForEditing(roster.id!)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteRoster(roster.id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    You have no saved rosters yet.
                    <br />
                    Upload an image to create one!
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Image Uploader / Login */}
        <div>
          <Card className="shadow-xl sticky top-24">
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