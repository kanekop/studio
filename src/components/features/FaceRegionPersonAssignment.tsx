"use client";

import React, { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, Search } from 'lucide-react';
import { Person, Region, ImageSet } from '@/shared/types';
import { usePeople } from '@/contexts/PeopleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FirebaseStorageRepository } from '@/infrastructure/firebase/repositories/FirebaseStorageRepository';
import { PeopleService } from '@/domain/services/PeopleService';
import { FirebaseRosterRepository } from '@/infrastructure/firebase/repositories/FirebaseRosterRepository';
import { cn } from '@/shared/utils/utils';

interface FaceRegionPersonAssignmentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  region: Region;
  imageUrl: string;
  roster: ImageSet;
  onSuccess?: () => void;
}

export const FaceRegionPersonAssignment: React.FC<FaceRegionPersonAssignmentProps> = ({
  isOpen,
  onOpenChange,
  region,
  imageUrl,
  roster,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonNotes, setNewPersonNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropping, setIsCropping] = useState(true);

  const { currentUser } = useAuth();
  const { people, addPerson, updatePerson } = usePeople();
  const { toast } = useToast();

  // Filter people based on search
  const filteredPeople = searchQuery
    ? people.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : people;

  // Crop face image when dialog opens
  useEffect(() => {
    if (isOpen && imageUrl && region) {
      cropFaceImage();
    }
  }, [isOpen, imageUrl, region]);

  const cropFaceImage = async () => {
    setIsCropping(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Create canvas for cropping
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas size to region size
      canvas.width = region.width;
      canvas.height = region.height;

      // Draw cropped region
      ctx.drawImage(
        img,
        region.x, region.y, region.width, region.height,
        0, 0, region.width, region.height
      );

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          'image/jpeg',
          0.9
        );
      });

      // Create object URL for preview
      const url = URL.createObjectURL(blob);
      setCroppedImageUrl(url);
    } catch (error) {
      console.error('Failed to crop face image:', error);
      toast({
        title: 'エラー',
        description: '顔画像の切り出しに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsCropping(false);
    }
  };

  const handleAssignPerson = async () => {
    if (!currentUser || !croppedImageUrl) return;
    
    setIsProcessing(true);
    try {
      let personId: string;
      
      if (mode === 'existing' && selectedPersonId) {
        // Use existing person
        personId = selectedPersonId;
      } else if (mode === 'new' && newPersonName.trim()) {
        // Create new person
        const newPerson = await addPerson({
          name: newPersonName.trim(),
          notes: newPersonNotes.trim(),
          addedBy: currentUser.uid,
          rosterIds: [roster.id],
          faceAppearances: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        personId = newPerson.id;
      } else {
        throw new Error('人物を選択するか、新規作成してください');
      }

      // Convert blob URL to blob
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();

      // Upload cropped face image
      const storageRepo = new FirebaseStorageRepository();
      const facePath = `users/${currentUser.uid}/faces/${roster.id}_${Date.now()}.jpg`;
      await storageRepo.upload(facePath, blob);

      // Update person with face appearance
      const person = people.find(p => p.id === personId);
      if (person) {
        const updatedPerson = {
          ...person,
          faceAppearances: [
            ...person.faceAppearances,
            {
              id: `face_${Date.now()}`,
              rosterId: roster.id,
              faceImageStoragePath: facePath,
              originalRegion: region,
              isPrimary: person.faceAppearances.length === 0, // First appearance is primary
            }
          ],
          rosterIds: person.rosterIds.includes(roster.id) 
            ? person.rosterIds 
            : [...person.rosterIds, roster.id],
        };
        
        // If this is the first face appearance, set it as primary
        if (person.faceAppearances.length === 0) {
          updatedPerson.primaryFaceAppearancePath = facePath;
        }
        
        await updatePerson(personId, updatedPerson);
      }

      // Update roster with person ID
      const rosterRepo = new FirebaseRosterRepository();
      const updatedPeopleIds = roster.peopleIds.includes(personId)
        ? roster.peopleIds
        : [...roster.peopleIds, personId];
      
      await rosterRepo.updateRoster(roster.id, {
        peopleIds: updatedPeopleIds,
      });

      toast({
        title: '成功',
        description: '顔画像を人物に紐付けました',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to assign person:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '人物の紐付けに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl);
      }
    };
  }, [croppedImageUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>顔画像の人物登録</DialogTitle>
          <DialogDescription>
            選択した顔を既存の人物に紐付けるか、新規人物として登録します
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Cropped face preview */}
          <div className="flex justify-center">
            {isCropping ? (
              <Skeleton className="w-32 h-32 rounded-lg" />
            ) : croppedImageUrl ? (
              <img
                src={croppedImageUrl}
                alt="切り出された顔"
                className="w-32 h-32 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Mode selection */}
          <RadioGroup value={mode} onValueChange={(value: 'existing' | 'new') => setMode(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing" className="font-normal cursor-pointer">
                既存の人物に紐付ける
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="font-normal cursor-pointer">
                新規人物として登録
              </Label>
            </div>
          </RadioGroup>

          {mode === 'existing' ? (
            <div className="space-y-4">
              {/* Search existing people */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="名前や会社名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* People list */}
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                {filteredPeople.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">人物が見つかりません</p>
                ) : (
                  filteredPeople.map((person) => (
                    <div
                      key={person.id}
                      onClick={() => setSelectedPersonId(person.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        selectedPersonId === person.id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-gray-100 border border-transparent"
                      )}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{person.name}</p>
                        {person.company && (
                          <p className="text-sm text-gray-500">{person.company}</p>
                        )}
                      </div>
                      {person.faceAppearances.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {person.faceAppearances.length}枚の顔
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* New person form */}
              <div>
                <Label htmlFor="new-name">名前 *</Label>
                <Input
                  id="new-name"
                  placeholder="山田 太郎"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="new-notes">メモ</Label>
                <Textarea
                  id="new-notes"
                  placeholder="この人物についてのメモ..."
                  value={newPersonNotes}
                  onChange={(e) => setNewPersonNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            キャンセル
          </Button>
          <Button
            onClick={handleAssignPerson}
            disabled={
              isProcessing ||
              isCropping ||
              (mode === 'existing' && !selectedPersonId) ||
              (mode === 'new' && !newPersonName.trim())
            }
          >
            {isProcessing ? (
              <>処理中...</>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                登録
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};