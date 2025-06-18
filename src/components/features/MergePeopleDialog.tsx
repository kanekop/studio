
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import type { Person, FieldMergeChoices } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, User, Building, Smile, CalendarDays, Info, Combine } from 'lucide-react';

interface MergePeopleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  person1: Person | null; // Target person (first selected)
  person2: Person | null; // Source person (second selected)
  onConfirmMerge: (
    targetPersonId: string,
    sourcePersonId: string,
    fieldChoices: FieldMergeChoices
  ) => void;
}

type FieldChoiceKey = keyof FieldMergeChoices;

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

  useEffect(() => {
    if (isOpen && person1 && person2) {
      // Initialize choices: if person1 has a value, prefer it. Otherwise, if person2 has it, prefer that.
      // This helps pre-select if one person has more complete data.
      const initialChoices: Partial<FieldMergeChoices> = {};
      (Object.keys(fieldChoices) as FieldChoiceKey[]).forEach(key => {
        if (person1[key as keyof Person]) {
          initialChoices[key] = 'person1';
        } else if (person2[key as keyof Person]) {
          initialChoices[key] = 'person2';
        } else {
          initialChoices[key] = 'person1'; // Default if both are empty
        }
      });
      setFieldChoices(initialChoices as FieldMergeChoices);
    }
  }, [isOpen, person1, person2]);


  const handleChoiceChange = (field: FieldChoiceKey, value: 'person1' | 'person2') => {
    setFieldChoices(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (person1 && person2) {
      onConfirmMerge(person1.id, person2.id, fieldChoices);
    }
    onOpenChange(false); // Close dialog after submit
  };

  if (!person1 || !person2) {
    return null; // Or some loading/error state if dialog is open without people
  }

  const renderFieldChoice = (
    fieldKey: FieldChoiceKey, 
    label: string, 
    Icon?: React.ElementType, 
    isTextArea: boolean = false
  ) => {
    const val1 = person1[fieldKey as keyof Person] as string || "";
    const val2 = person2[fieldKey as keyof Person] as string || "";
    const chosenValue = fieldChoices[fieldKey] === 'person1' ? val1 : val2;

    return (
      <div className="space-y-2 py-3">
        <Label className="text-base font-semibold flex items-center">
          {Icon && <Icon className="mr-2 h-5 w-5 text-primary" />}
          {label}
        </Label>
        <RadioGroup
          value={fieldChoices[fieldKey]}
          onValueChange={(value: 'person1' | 'person2') => handleChoiceChange(fieldKey, value)}
          className="grid grid-cols-2 gap-x-4"
        >
          <div className="space-y-1 p-2 border rounded-md hover:border-primary/50 transition-colors data-[state=checked]:border-primary data-[state=checked]:ring-1 data-[state=checked]:ring-primary">
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
          <div className="space-y-1 p-2 border rounded-md hover:border-primary/50 transition-colors data-[state=checked]:border-primary data-[state=checked]:ring-1 data-[state=checked]:ring-primary">
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
        <div className="mt-1 p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Selected for merge:</p>
            <p className={`text-sm font-medium ${chosenValue ? 'text-primary' : 'text-muted-foreground italic'}`}>
                {chosenValue || 'Will be empty'}
            </p>
        </div>
      </div>
    );
  };

  const mergedNotesPreview = useMemo(() => {
    let notes = fieldChoices.name === 'person1' ? (person1.notes || "") : (person2.notes || "");
    const otherPerson = fieldChoices.name === 'person1' ? person2 : person1;
    const otherPersonsNotes = fieldChoices.name === 'person1' ? person2.notes : person1.notes;

    if (otherPersonsNotes) {
        notes += `${notes ? "\n\n" : ""}Merged from ${otherPerson.name} (ID: ${otherPerson.id}):\n${otherPersonsNotes}`;
    }
    return notes || "No notes will be set.";
  }, [person1, person2, fieldChoices.name]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline flex items-center">
            <Combine className="mr-2 h-7 w-7 text-primary"/>
            Confirm Merge: {person1.name} & {person2.name}
          </DialogTitle>
          <DialogDescription>
            Review the information below. Choose which version to keep for each field.
            Information from '{person2.name}' will be merged into '{person1.name}'.
            '{person2.name}' will be deleted after the merge. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <div className="space-y-4 py-4">
            {renderFieldChoice('name', 'Name', User)}
            <Separator />
            {renderFieldChoice('company', 'Company', Building)}
            <Separator />
            {renderFieldChoice('hobbies', 'Hobbies', Smile, true)}
            <Separator />
            {renderFieldChoice('birthday', 'Birthday', CalendarDays)}
            <Separator />
            {renderFieldChoice('firstMet', 'First Met Date', CalendarDays)}
            <Separator />
            {renderFieldChoice('firstMetContext', 'First Met Context', Info, true)}
            <Separator />
            <div className="space-y-2 py-3">
              <Label className="text-base font-semibold flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" />
                Notes
              </Label>
              <div className="p-3 bg-muted/50 rounded-md">
                 <p className="text-xs text-muted-foreground mb-1">Current notes for {person1.name}:</p>
                 <p className="text-sm whitespace-pre-wrap mb-2 p-2 border rounded bg-background">{person1.notes || <span className="italic">Not set</span>}</p>
                 <p className="text-xs text-muted-foreground mb-1">Current notes for {person2.name}:</p>
                 <p className="text-sm whitespace-pre-wrap mb-2 p-2 border rounded bg-background">{person2.notes || <span className="italic">Not set</span>}</p>
                <p className="text-xs text-muted-foreground mt-2 mb-1">Notes after merge (will be saved to {fieldChoices.name === 'person1' ? person1.name : person2.name}):</p>
                <p className="text-sm font-medium whitespace-pre-wrap p-2 border border-primary/30 rounded bg-background/70">{mergedNotesPreview}</p>
              </div>
            </div>
             <Separator />
            <div className="py-3 space-y-1">
                <Label className="text-base font-semibold flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Appearances & Rosters
                </Label>
                <p className="text-sm text-muted-foreground">
                    All unique face appearances and roster associations from both individuals will be combined and saved to the merged profile.
                </p>
                <p className="text-xs text-muted-foreground">
                    Total appearances for {person1.name}: {person1.faceAppearances?.length || 0}.
                    Total appearances for {person2.name}: {person2.faceAppearances?.length || 0}.
                </p>
                 <p className="text-xs text-muted-foreground">
                    {person1.name} is in {person1.rosterIds?.length || 0} roster(s).
                    {person2.name} is in {person2.rosterIds?.length || 0} roster(s).
                </p>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} className="bg-destructive hover:bg-destructive/90">
            <Combine className="mr-2 h-4 w-4" />
            Confirm and Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MergePeopleDialog;
