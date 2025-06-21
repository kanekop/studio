"use client";
import React from 'react';
import ImageCanvas from './ImageCanvas';
import { Button } from '@/components/ui/button';
import { Eraser, Users, RotateCcw } from 'lucide-react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { useImage } from '@/contexts/ImageContext';
import { Card, CardContent } from '@/components/ui/card';

const ImageWorkspace = () => {
  const { isProcessing, createRosterFromRegions } = useFaceRoster();
  const { addDrawnRegion, clearDrawnRegions, drawnRegions, imageDataUrl, originalImageStoragePath, originalImageSize } = useImage();
  
  // FaceRosterContextからcreateRosterFromRegions関数をインポートして使用
  const handleCreateRoster = async () => {
    if (!imageDataUrl || !originalImageStoragePath || !originalImageSize || drawnRegions.length === 0) {
      console.error('ImageWorkspace: Missing required data for roster creation');
      return;
    }

    try {
      await createRosterFromRegions(
        drawnRegions,
        imageDataUrl,
        originalImageStoragePath,
        originalImageSize
      );
    } catch (error) {
      console.error('ImageWorkspace: Error creating roster:', error);
    }
  };

  return (
    <Card className="flex-grow flex flex-col shadow-lg">
      <CardContent className="p-4 md:p-6 flex-grow flex flex-col gap-4">
        <div className="flex-grow relative min-h-[300px] md:min-h-[400px]">
          <ImageCanvas onRegionDrawn={addDrawnRegion} />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center pt-2">
          <Button
            onClick={clearDrawnRegions}
            variant="outline"
            disabled={drawnRegions.length === 0 || isProcessing}
            aria-label="Clear all drawn regions"
            className="group"
          >
            <RotateCcw className="mr-2 h-4 w-4 group-hover:animate-spin" /> Clear Regions
          </Button>
          <Button
            onClick={handleCreateRoster}
            disabled={drawnRegions.length === 0 || isProcessing || !imageDataUrl}
            aria-label="Create roster from selected regions"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" /> Create Roster from Selections
              </>
            )}
          </Button>
        </div>
        {drawnRegions.length > 0 && (
          <p className="text-sm text-center text-muted-foreground mt-2">
            {drawnRegions.length} region(s) selected. Click "Create Roster" to process.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ImageWorkspace;