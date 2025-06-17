
"use client";
import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, History, LogIn } from 'lucide-react';
import ImageUploadForm from './ImageUploadForm';
import { useFaceRoster } from '@/contexts/FaceRosterContext';


const LandingPageUI = () => {
  const { currentUser } = useFaceRoster(); 

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* Left Column: Welcome Message & Instructions */}
        <div className="space-y-6">
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
        </div>

        {/* Right Column: Image Uploader & Load Roster / Login */}
        <div>
          <Card className="shadow-xl">
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
              
              {currentUser && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full group hover:border-primary"
                    disabled={true} 
                    aria-label="Display saved roster from previous session (To be implemented with Cloud)"
                  >
                    <History className="mr-2 h-5 w-5 text-primary group-hover:animate-spin" />
                    Load Saved Roster (Cloud - Coming Soon)
                  </Button>
                   <p className="text-xs text-center text-muted-foreground">
                    Loading rosters from your account will be available here.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LandingPageUI;
