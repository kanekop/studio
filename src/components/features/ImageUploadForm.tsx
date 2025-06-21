"use client";
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFaceRoster, useUI } from '@/contexts';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

const ImageUploadForm = () => {
  const { isProcessing } = useUI();
  const { handleImageUpload } = useFaceRoster();
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsDragging(false);
    if (acceptedFiles && acceptedFiles.length > 0) {
      handleImageUpload(acceptedFiles[0]);
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
          disabled={isProcessing}
          aria-hidden="true" 
        >
          {isProcessing ? 'Processing...' : 'Select Image'}
        </Button>
      </div>
    </div>
  );
};

export default ImageUploadForm;