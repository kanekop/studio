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
import { UploadCloud, File as FileIcon, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/shared/utils/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FirebaseStorageRepository } from '@/infrastructure/firebase/repositories/FirebaseStorageRepository';
import { FirebaseRosterRepository } from '@/infrastructure/firebase/repositories/FirebaseRosterRepository';
import { ImageSet, Region } from '@/shared/types';
import { generateThumbnail, extractExifData, ImageMetadata } from '@/shared/utils/image-processing';
import { FaceRegionSelector } from './FaceRegionSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CreateRosterDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void;
}

interface FaceRegion extends Region {
  id: string;
}

export const CreateRosterDialog: React.FC<CreateRosterDialogProps> = ({ isOpen, onOpenChange, onSuccess }) => {
  const [rosterName, setRosterName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentTab, setCurrentTab] = useState('upload');
  const [faceRegions, setFaceRegions] = useState<FaceRegion[]>([]);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImageFile(file);
      
      // Extract EXIF data
      const metadata = await extractExifData(file);
      setImageMetadata(metadata);
      
      // Auto-fill date if available
      if (metadata?.capturedAt && !description) {
        const date = new Date(metadata.capturedAt);
        const dateStr = date.toLocaleDateString('ja-JP', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        setDescription(`撮影日: ${dateStr}`);
      }
    }
  }, [description]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageMetadata(null);
    setFaceRegions([]);
    setCurrentTab('upload');
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
        faceRegions: faceRegions, // Add face regions
        ...(imageMetadata && {
          imageMetadata: {
            capturedAt: imageMetadata.capturedAt,
            location: imageMetadata.location,
            cameraInfo: imageMetadata.cameraInfo,
          }
        }),
      };
      
      const createdRoster = await rosterRepo.createRoster(newRosterData);

      // 3. Generate and upload thumbnail
      try {
        const thumbnail = await generateThumbnail(imageFile);
        await rosterRepo.uploadThumbnail(currentUser.uid, createdRoster.id, thumbnail);
      } catch (thumbnailError) {
        console.warn('Failed to generate thumbnail:', thumbnailError);
        // Continue even if thumbnail generation fails
      }

      toast({
        title: "名簿を作成しました",
        description: "新しい名簿が正常に作成されました。",
      });

      // Reset form state
      setRosterName('');
      setDescription('');
      setTags('');
      setImageFile(null);
      setFaceRegions([]);
      setCurrentTab('upload');
      
      onOpenChange(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to create roster:", error);
      toast({
        title: "エラー",
        description: "名簿の作成に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const isUploadDisabled = !imageFile || !rosterName || isCreating;

  const handleNextTab = () => {
    if (currentTab === 'upload' && imageFile) {
      setCurrentTab('faces');
    } else if (currentTab === 'faces') {
      setCurrentTab('details');
    }
  };

  const handlePrevTab = () => {
    if (currentTab === 'details') {
      setCurrentTab('faces');
    } else if (currentTab === 'faces') {
      setCurrentTab('upload');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>新規名簿作成</DialogTitle>
          <DialogDescription>
            画像をアップロードして名簿を作成します
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" disabled={isCreating}>1. 画像選択</TabsTrigger>
            <TabsTrigger value="faces" disabled={!imageFile || isCreating}>2. 顔選択</TabsTrigger>
            <TabsTrigger value="details" disabled={!imageFile || isCreating}>3. 詳細設定</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            {/* Upload Tab */}
            <TabsContent value="upload" className="mt-4 space-y-4">
              {!imageFile ? (
                <div 
                  {...getRootProps()}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted",
                    isDragActive && "border-primary bg-primary/10"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">クリックしてアップロード</span> またはドラッグ&ドロップ
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP (最大 10MB)</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-6 w-6 text-gray-500" />
                      <span className="text-sm font-medium truncate">{imageFile.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleRemoveImage}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {imageMetadata && (
                    <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
                      {imageMetadata.capturedAt && (
                        <p>撮影日時: {new Date(imageMetadata.capturedAt).toLocaleString('ja-JP')}</p>
                      )}
                      {imageMetadata.location && (
                        <p>撮影場所: {imageMetadata.location.placeName || `${imageMetadata.location.latitude.toFixed(6)}, ${imageMetadata.location.longitude.toFixed(6)}`}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Face Selection Tab */}
            <TabsContent value="faces" className="mt-4">
              {imageFile && (
                <FaceRegionSelector
                  imageFile={imageFile}
                  onRegionsChange={setFaceRegions}
                />
              )}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="roster-name">名簿名 *</Label>
                <Input 
                  id="roster-name" 
                  placeholder="例：営業会議 2025/01"
                  value={rosterName}
                  onChange={(e) => setRosterName(e.target.value)} 
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="roster-description">説明</Label>
                <Textarea 
                  id="roster-description" 
                  placeholder="この名簿についての説明を入力..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="roster-tags">タグ（カンマ区切り）</Label>
                <Input 
                  id="roster-tags" 
                  placeholder="例：会議, 営業部, 2025年"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              {faceRegions.length > 0 && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    {faceRegions.length}個の顔領域が選択されています
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2">
          {currentTab !== 'upload' && (
            <Button
              variant="outline"
              onClick={handlePrevTab}
              disabled={isCreating}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              前へ
            </Button>
          )}
          
          {currentTab !== 'details' ? (
            <Button
              onClick={handleNextTab}
              disabled={!imageFile || isCreating}
            >
              次へ
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
                キャンセル
              </Button>
              <Button onClick={handleCreateRoster} disabled={isUploadDisabled}>
                {isCreating ? "作成中..." : "作成"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};