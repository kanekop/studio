"use client";
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useImage, useUI } from '@/contexts';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

const ImageUploadForm = () => {
  const { isProcessing } = useUI();
  const { handleImageUpload, isUploading } = useImage();
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsDragging(false);
    if (acceptedFiles && acceptedFiles.length > 0) {
      try {
        console.log('ImageUploadForm: Starting upload for file:', acceptedFiles[0].name);
        await handleImageUpload(acceptedFiles[0]);
        console.log('ImageUploadForm: Upload completed successfully');
      } catch (error) {
        console.error('ImageUploadForm: Upload failed:', error);
      }
    }
  }, [handleImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    multiple: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  return (
    <div
      {...getRootProps()}
      className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                  ${isDragActive || isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-accent'}`}
      aria-label="Image upload area"
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-3 text-center">
        <Upload className={`h-10 w-10 ${isDragActive || isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        {isDragActive ? (
          <p className="text-primary font-semibold">Drop the image here...</p>
        ) : (
          <>
            <p className="text-sm text-foreground/80">
              <span className="font-semibold text-accent">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP (Max 10MB)
            </p>
          </>
        )}
        <Button
          type="button"
          variant="default"
          size="sm"
          className="mt-2 pointer-events-none"
          disabled={isProcessing || isUploading}
          aria-hidden="true" 
        >
          {isProcessing || isUploading ? 'Processing...' : 'Select Image'}
        </Button>
      </div>
    </div>
  );
};

export default ImageUploadForm;