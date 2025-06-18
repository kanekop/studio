"use client";
import React, { useState, useEffect, useMemo } from 'react';
import type { Person, FieldMergeChoices } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, User, Building, Smile, CalendarDays, Info, Combine, Users } from 'lucide-react';

interface MergePeopleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  person1: Person | null; 
  person2: Person | null; 
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
      const initialChoices: Partial<FieldMergeChoices> = {};
      (Object.keys(fieldChoices) as FieldChoiceKey[]).forEach(key => {
        const p1Value = person1[key as keyof Person];
        const p2Value = person2[key as keyof Person];

        if (p1Value && typeof p1Value === 'string' && p1Value.trim() !== '') {
          initialChoices[key] = 'person1';
        } else if (p2Value && typeof p2Value === 'string' && p2Value.trim() !== '') {
          initialChoices[key] = 'person2';
        } else {
          initialChoices[key] = 'person1'; 
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
        
        {/* スクロール領域 */}
        <div className="flex-1 overflow-y-auto px-1">
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
            
            <div className="py-3 space-y-1">
                <Label className="text-base font-semibold flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Appearances & Rosters
                </Label>
                <p className="text-sm text-muted-foreground">
                    All unique face appearances and roster associations from both individuals will be combined and saved to the merged profile.
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside pl-2">
                    <li>Appearances for {person1.name}: {person1.faceAppearances?.length || 0}.</li>
                    <li>Appearances for {person2.name}: {person2.faceAppearances?.length || 0}.</li>
                    <li>{person1.name} is in {person1.rosterIds?.length || 0} roster(s).</li>
                    <li>{person2.name} is in {person2.rosterIds?.length || 0} roster(s).</li>
                </ul>
            </div>
          </div>
        </div>
        
        {/* フッター部分（固定） */}
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