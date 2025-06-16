
"use client";
import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, History } from 'lucide-react';
import ImageUploadForm from './ImageUploadForm';
import { useFaceRoster } from '@/contexts/FaceRosterContext';

const LandingPageUI = () => {
  const { loadFromLocalStorageAndInitialize } = useFaceRoster();

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
          </p>
          <div className="mt-4 p-4 border-l-4 border-accent bg-accent/10 rounded-md">
            <h2 className="text-xl font-headline font-semibold text-accent-foreground mb-2">How it works:</h2>
            <ul className="list-disc list-inside space-y-1 text-foreground/70">
              <li>Upload your image (PNG, JPG, WEBP).</li>
              <li>Click and drag to draw rectangles around faces.</li>
              <li>Click "Create Roster from Selections".</li>
              <li>Edit names and add notes for each person.</li>
              <li>Your work is automatically saved in your browser!</li>
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
            />
          </div>
        </div>

        {/* Right Column: Image Uploader & Load Roster */}
        <div>
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <UploadCloud className="mr-2 h-6 w-6 text-primary" /> Get Started
              </CardTitle>
              <CardDescription>
                Upload an image to begin or load your previous session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUploadForm />
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
                onClick={loadFromLocalStorageAndInitialize}
                aria-label="Display saved roster from previous session"
              >
                <History className="mr-2 h-5 w-5 text-primary group-hover:animate-spin" />
                Display Saved Roster
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LandingPageUI;
