
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import type { Person, FieldMergeChoices, FaceAppearance } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, User, Building, Smile, CalendarDays, Info, Combine, Users, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import NextImage from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { storage } from '@/lib/firebase';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';

interface MergePeopleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  person1: Person | null; 
  person2: Person | null; 
  onConfirmMerge: (
    targetPersonId: string,
    sourcePersonId: string,
    fieldChoices: FieldMergeChoices,
    chosenPrimaryPhotoPath: string | null 
  ) => void;
}

type FieldChoiceKey = keyof FieldMergeChoices;

interface AppearanceWithUrl extends FaceAppearance {
  displayUrl?: string;
  isLoadingUrl?: boolean;
  originalPersonId: string; // To know if it came from person1 or person2
}

const MergePeopleDialog: React.FC<MergePeopleDialogProps> = ({
  isOpen,
  onOpenChange,
  person1,
  person2,
  onConfirmMerge,
}) => {
  const [fieldChoices, setFieldChoices] = useState<FieldMergeChoices>({
    name: 'person1',
    company: 'person1',
    hobbies: 'person1',
    birthday: 'person1',
    firstMet: 'person1',
    firstMetContext: 'person1',
  });
  const [selectedPrimaryPhotoPath, setSelectedPrimaryPhotoPath] = useState<string | null>(null);
  const [combinedAppearancesWithUrls, setCombinedAppearancesWithUrls] = useState<AppearanceWithUrl[]>([]);
  const [isLoadingCombinedImages, setIsLoadingCombinedImages] = useState(false);

  const uniqueCombinedAppearances = useMemo(() => {
    if (!person1 || !person2) return [];
    const allApps: AppearanceWithUrl[] = [];
    const seenPaths = new Set<string>();

    (person1.faceAppearances || []).forEach(app => {
      if (app.faceImageStoragePath && !seenPaths.has(app.faceImageStoragePath)) {
        allApps.push({ ...app, originalPersonId: person1.id, isLoadingUrl: true });
        seenPaths.add(app.faceImageStoragePath);
      }
    });
    (person2.faceAppearances || []).forEach(app => {
      if (app.faceImageStoragePath && !seenPaths.has(app.faceImageStoragePath)) {
        allApps.push({ ...app, originalPersonId: person2.id, isLoadingUrl: true });
        seenPaths.add(app.faceImageStoragePath);
      }
    });
    return allApps;
  }, [person1, person2]);


  useEffect(() => {
    if (isOpen && person1 && person2) {
      // Initialize field choices
      const initialChoices: Partial<FieldMergeChoices> = {};
      (Object.keys(fieldChoices) as FieldChoiceKey[]).forEach(key => {
        const p1Value = person1[key as keyof Person];
        const p2Value = person2[key as keyof Person];
        if (p1Value && typeof p1Value === 'string' && p1Value.trim() !== '') initialChoices[key] = 'person1';
        else if (p2Value && typeof p2Value === 'string' && p2Value.trim() !== '') initialChoices[key] = 'person2';
        else initialChoices[key] = 'person1';
      });
      setFieldChoices(initialChoices as FieldMergeChoices);

      // Initialize primary photo path
      let initialPhotoPath: string | null = null;
      if (person1.primaryFaceAppearancePath) initialPhotoPath = person1.primaryFaceAppearancePath;
      else if (person2.primaryFaceAppearancePath) initialPhotoPath = person2.primaryFaceAppearancePath;
      else if (person1.faceAppearances?.[0]?.faceImageStoragePath) initialPhotoPath = person1.faceAppearances[0].faceImageStoragePath;
      else if (person2.faceAppearances?.[0]?.faceImageStoragePath) initialPhotoPath = person2.faceAppearances[0].faceImageStoragePath;
      setSelectedPrimaryPhotoPath(initialPhotoPath);
      
      // Fetch display URLs for combined face appearances
      const fetchAppearanceUrls = async () => {
        if (uniqueCombinedAppearances.length > 0) {
          setIsLoadingCombinedImages(true);
          setCombinedAppearancesWithUrls(uniqueCombinedAppearances); // Set with isLoadingUrl = true

          const updatedAppearances = await Promise.all(
            uniqueCombinedAppearances.map(async (appearance) => {
              if (appearance.faceImageStoragePath && storage) {
                try {
                  const url = await getDownloadURL(storageRef(storage, appearance.faceImageStoragePath));
                  return { ...appearance, displayUrl: url, isLoadingUrl: false };
                } catch (error) {
                  console.error(`Error fetching image URL for ${appearance.faceImageStoragePath}:`, error);
                  return { ...appearance, displayUrl: "https://placehold.co/100x100.png?text=Error", isLoadingUrl: false };
                }
              }
              return { ...appearance, displayUrl: "https://placehold.co/100x100.png?text=No+Path", isLoadingUrl: false };
            })
          );
          setCombinedAppearancesWithUrls(updatedAppearances);
          setIsLoadingCombinedImages(false);
        } else {
          setCombinedAppearancesWithUrls([]);
          setIsLoadingCombinedImages(false);
        }
      };
      fetchAppearanceUrls();

    } else if (!isOpen) {
      setCombinedAppearancesWithUrls([]); // Clear when dialog closes
    }
  }, [isOpen, person1, person2, uniqueCombinedAppearances]);


  const handleChoiceChange = (field: FieldChoiceKey, value: 'person1' | 'person2') => {
    setFieldChoices(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (person1 && person2) {
      onConfirmMerge(person1.id, person2.id, fieldChoices, selectedPrimaryPhotoPath);
    }
    onOpenChange(false); 
  };

  if (!person1 || !person2) {
    return null; 
  }

  const renderFieldChoice = (
    fieldKey: FieldChoiceKey, 
    label: string, 
    IconComponent?: React.ElementType, 
    isTextArea: boolean = false
  ) => {
    const val1 = person1[fieldKey as keyof Person] as string || "";
    const val2 = person2[fieldKey as keyof Person] as string || "";
    const chosenValue = fieldChoices[fieldKey] === 'person1' ? val1 : val2;

    return (
      <div className="space-y-2 py-3">
        <Label className="text-base font-semibold flex items-center">
          {IconComponent && <IconComponent className="mr-2 h-5 w-5 text-primary" />}
          {label}
        </Label>
        <RadioGroup
          value={fieldChoices[fieldKey]}
          onValueChange={(value: 'person1' | 'person2') => handleChoiceChange(fieldKey, value)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2"
        >
          <div className={`space-y-1 p-3 border rounded-md hover:border-primary/50 transition-colors ${fieldChoices[fieldKey] === 'person1' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'bg-card'}`}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="person1" id={`${fieldKey}-p1`} />
              <Label htmlFor={`${fieldKey}-p1`} className="font-normal cursor-pointer flex-grow">
                Keep <strong className="text-primary">{person1.name}'s</strong> version:
              </Label>
            </div>
            <p className={`text-sm ml-6 ${isTextArea ? 'whitespace-pre-wrap' : 'truncate'} ${val1 ? 'text-foreground' : 'text-muted-foreground italic'}`}>
              {val1 || 'Not set'}
            </p>
          </div>
          <div className={`space-y-1 p-3 border rounded-md hover:border-primary/50 transition-colors ${fieldChoices[fieldKey] === 'person2' ? 'border-accent ring-1 ring-accent bg-accent/5' : 'bg-card'}`}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="person2" id={`${fieldKey}-p2`} />
              <Label htmlFor={`${fieldKey}-p2`} className="font-normal cursor-pointer flex-grow">
                Use <strong className="text-accent">{person2.name}'s</strong> version:
              </Label>
            </div>
            <p className={`text-sm ml-6 ${isTextArea ? 'whitespace-pre-wrap' : 'truncate'} ${val2 ? 'text-foreground' : 'text-muted-foreground italic'}`}>
              {val2 || 'Not set'}
            </p>
          </div>
        </RadioGroup>
        <div className="mt-2 p-3 bg-muted/30 rounded-md">
            <p className="text-xs text-muted-foreground">Selected for merge:</p>
            <p className={`text-sm font-medium ${chosenValue ? (fieldChoices[fieldKey] === 'person1' ? 'text-primary' : 'text-accent') : 'text-muted-foreground italic'}`}>
                {chosenValue || 'Will be empty'}
            </p>
        </div>
      </div>
    );
  };

  const mergedNotesPreview = useMemo(() => {
    let notes = "";
    const p1Notes = person1.notes || "";
    const p2Notes = person2.notes || "";
    
    const chosenNameForNotes = fieldChoices.name === 'person1' ? person1.name : person2.name;
    const otherNameForNotes = fieldChoices.name === 'person1' ? person2.name : person1.name;
    const otherIdForNotes = fieldChoices.name === 'person1' ? person2.id : person1.id;
    
    notes = fieldChoices.name === 'person1' ? p1Notes : p2Notes;
    const otherPersonsNotes = fieldChoices.name === 'person1' ? p2Notes : p1Notes;

    if (otherPersonsNotes) {
        notes += `${notes ? "\n\n" : ""}Merged from ${otherNameForNotes} (ID: ${otherIdForNotes}):\n${otherPersonsNotes}`;
    }
    return notes || "No notes will be set.";
  }, [person1, person2, fieldChoices.name]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl !max-h-[90vh] !flex !flex-col !overflow-hidden">
        {/* ヘッダー部分（固定） */}
        <div className="shrink-0 border-b pb-4">
          <h2 className="text-2xl font-headline flex items-center mb-2">
            <Combine className="mr-2 h-7 w-7 text-primary"/>
            Confirm Merge: {person1.name} & {person2.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Review the information below. Choose which version to keep for each field.
            Information from '{person2.name}' will be merged into '{person1.name}'.
            '{person2.name}' will be deleted after the merge. This action cannot be undone.
          </p>
        </div>
        
        <ScrollArea className="flex-1 overflow-y-auto px-1">
          <div className="space-y-4 divide-y divide-border pr-2">
            {renderFieldChoice('name', 'Name', User)}
            {renderFieldChoice('company', 'Company', Building)}
            {renderFieldChoice('hobbies', 'Hobbies', Smile, true)}
            {renderFieldChoice('birthday', 'Birthday', CalendarDays)}
            {renderFieldChoice('firstMet', 'First Met Date', CalendarDays)}
            {renderFieldChoice('firstMetContext', 'First Met Context', Info, true)}
            
            <div className="space-y-2 py-3">
              <Label className="text-base font-semibold flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" />
                Notes
              </Label>
              <div className="p-3 bg-muted/30 rounded-md space-y-3">
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Current notes for <strong className="text-primary">{person1.name}</strong>:</p>
                    <p className="text-sm whitespace-pre-wrap p-2 border rounded bg-card min-h-[40px]">{person1.notes || <span className="italic">Not set</span>}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Current notes for <strong className="text-accent">{person2.name}</strong>:</p>
                    <p className="text-sm whitespace-pre-wrap p-2 border rounded bg-card min-h-[40px]">{person2.notes || <span className="italic">Not set</span>}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mt-2 mb-1">Notes after merge (will be saved to {fieldChoices.name === 'person1' ? person1.name : person2.name}):</p>
                    <p className="text-sm font-medium whitespace-pre-wrap p-2 border border-primary/30 rounded bg-card/70 min-h-[60px]">{mergedNotesPreview}</p>
                </div>
              </div>
            </div>
            
            <div className="py-3 space-y-2">
                <Label className="text-base font-semibold flex items-center">
                    <ImageIcon className="mr-2 h-5 w-5 text-primary" />
                    Main Display Photo for Merged Profile
                </Label>
                {isLoadingCombinedImages && combinedAppearancesWithUrls.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {[...Array(Math.min(combinedAppearancesWithUrls.length, 5))].map((_, i) => <Skeleton key={`skel-${i}`} className="h-24 w-full rounded-md" />)}
                    </div>
                ) : combinedAppearancesWithUrls.length > 0 ? (
                    <RadioGroup
                        value={selectedPrimaryPhotoPath || ""}
                        onValueChange={(value) => setSelectedPrimaryPhotoPath(value)}
                        className="space-y-2"
                    >
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {combinedAppearancesWithUrls.map((appearance) => (
                                <Label
                                    key={appearance.faceImageStoragePath}
                                    htmlFor={appearance.faceImageStoragePath + "-merge"}
                                    className={cn(
                                        "cursor-pointer rounded-md border-2 border-transparent transition-all hover:opacity-80 relative aspect-square flex items-center justify-center",
                                        selectedPrimaryPhotoPath === appearance.faceImageStoragePath && "border-primary ring-2 ring-primary"
                                    )}
                                >
                                    <RadioGroupItem
                                        value={appearance.faceImageStoragePath}
                                        id={appearance.faceImageStoragePath + "-merge"}
                                        className="sr-only"
                                    />
                                    {appearance.isLoadingUrl ? (
                                        <Skeleton className="h-full w-full rounded-md" />
                                    ) : (
                                        <NextImage
                                            src={appearance.displayUrl || "https://placehold.co/100x100.png?text=Loading"}
                                            alt={`Face from Roster ${appearance.rosterId.substring(0,6)} of ${appearance.originalPersonId === person1.id ? person1.name : person2.name}`}
                                            layout="fill"
                                            objectFit="cover"
                                            className="rounded-md"
                                        />
                                    )}
                                    {selectedPrimaryPhotoPath === appearance.faceImageStoragePath && (
                                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center rounded-md">
                                            <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
                                        </div>
                                    )}
                                    <span className="absolute bottom-0.5 left-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded-sm text-center truncate">
                                       Orig: {appearance.originalPersonId === person1.id ? person1.name.split(" ")[0] : person2.name.split(" ")[0]}
                                    </span>
                                </Label>
                            ))}
                        </div>
                    </RadioGroup>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">No face images available from either person.</p>
                )}
            </div>

            <div className="py-3 space-y-1">
                <Label className="text-base font-semibold flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Other Appearances & Rosters
                </Label>
                <p className="text-sm text-muted-foreground">
                    All unique face appearances and roster associations from both individuals will be combined and saved to the merged profile.
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside pl-2">
                    <li>Appearances for {person1.name}: {person1.faceAppearances?.length || 0}.</li>
                    <li>Appearances for {person2.name}: {person2.faceAppearances?.length || 0}.</li>
                    <li>Combined unique appearances: {uniqueCombinedAppearances.length}.</li>
                    <li>{person1.name} is in {person1.rosterIds?.length || 0} roster(s).</li>
                    <li>{person2.name} is in {person2.rosterIds?.length || 0} roster(s).</li>
                </ul>
            </div>
          </div>
        </ScrollArea>
        
        <div className="shrink-0 border-t pt-4">
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} className="bg-destructive hover:bg-destructive/90">
              <Combine className="mr-2 h-4 w-4" />
              Confirm and Merge
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MergePeopleDialog;

    