"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { cn } from '@/shared/utils/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FirebaseStorageRepository } from '@/infrastructure/firebase/repositories/FirebaseStorageRepository';
import { FirebaseRosterRepository } from '@/infrastructure/firebase/repositories/FirebaseRosterRepository';
import { ImageSet } from '@/shared/types';

interface CreateRosterDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const CreateRosterDialog: React.FC<CreateRosterDialogProps> = ({ isOpen, onOpenChange }) => {
  const [rosterName, setRosterName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setImageFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleRemoveImage = () => {
    setImageFile(null);
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = reject;
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error("Could not read file for dimensions."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCreateRoster = async () => {
    if (!imageFile || !rosterName || !currentUser) return;

    setIsCreating(true);
    try {
      // Get image dimensions before upload
      const dimensions = await getImageDimensions(imageFile);

      // 1. Upload image to Storage
      const storageRepo = new FirebaseStorageRepository();
      const storagePath = `users/${currentUser.uid}/rosters/${Date.now()}_${imageFile.name}`;
      const downloadURL = await storageRepo.upload(storagePath, imageFile);

      // 2. Create roster document in Firestore
      const rosterRepo = new FirebaseRosterRepository();
      const newRosterData: Omit<ImageSet, 'id' | 'createdAt' | 'updatedAt'> = {
        ownerId: currentUser.uid,
        rosterName,
        description,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        originalImageStoragePath: storagePath,
        originalImageSize: dimensions,
        people: [],
        peopleIds: [],
      };
      
      await rosterRepo.createRoster(newRosterData);

      toast({
        title: "Roster Created!",
        description: "Your new roster has been successfully created.",
      });

      onOpenChange(false);
      // TODO: Reset state after closing
    } catch (error) {
      console.error("Failed to create roster:", error);
      toast({
        title: "Error",
        description: "Could not create the roster. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const isUploadDisabled = !imageFile || !rosterName || isCreating;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New Roster</DialogTitle>
          <DialogDescription>
            Upload an image and provide details to create a new roster.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {!imageFile ? (
            <div 
              {...getRootProps()}
              className={cn(
                "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted",
                isDragActive && "border-primary bg-primary/10"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG or WEBP (MAX. 10MB)</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <FileIcon className="h-6 w-6 text-gray-500" />
                <span className="text-sm font-medium truncate">{imageFile.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleRemoveImage}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="roster-name">Roster Name *</Label>
            <Input 
              id="roster-name" 
              placeholder="e.g., Team Offsite 2024"
              value={rosterName}
              onChange={(e) => setRosterName(e.target.value)} 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="roster-description">Description</Label>
            <Textarea 
              id="roster-description" 
              placeholder="A brief description of the event or photo."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="roster-tags">Tags (comma-separated)</Label>
            <Input 
              id="roster-tags" 
              placeholder="e.g., Conference, 2024"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>Cancel</Button>
          <Button onClick={handleCreateRoster} disabled={isUploadDisabled}>
            {isCreating ? "Creating..." : "Upload & Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 