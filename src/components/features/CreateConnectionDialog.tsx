
"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Person, Connection, ProcessedConnectionFormData } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import {
  Link2, Users, FileText, Save, Sparkles, ArrowRight, FileEdit,
  Handshake, Smile, Briefcase, GraduationCap, Heart, Gem, Home, UserCircle as UserIcon, Users2, Award, Clipboard
} from 'lucide-react';
import { cn } from '@/lib/utils';


const createConnectionFormSchema = z.object({
  customTypes: z.string().optional(),
  reasons: z.string().optional(),
  strength: z.string().optional(),
  notes: z.string().optional(),
});


interface CreateConnectionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sourcePerson: Person | null;
  targetPerson: Person | null;
  allUserPeople: Person[]; // Added prop
  editingConnection?: Connection | null;
  onSave: (data: ProcessedConnectionFormData, editingConnectionId?: string) => Promise<void>;
  isProcessing: boolean;
}

const commonRelations = [
  { key: 'colleague', label: 'Colleague', icon: Briefcase, category: 'common' },
  { key: 'friend', label: 'Friend', icon: Smile, category: 'common' },
  { key: 'acquaintance', label: 'Acquaintance', icon: Handshake, category: 'common' },
  { key: 'club_member', label: 'Club Member', icon: Users, category: 'common' },
];

const hierarchicalRelations = [
  { key: 'parent', label: 'Parent (of Target)', icon: Home, category: 'hierarchical' },
  { key: 'child', label: 'Child (of Target)', icon: UserIcon, category: 'hierarchical' },
  { key: 'manager', label: 'Manager (of Target)', icon: Award, category: 'hierarchical' },
  { key: 'reports_to', label: 'Reports to (Target)', icon: Clipboard, category: 'hierarchical' },
  { key: 'mentor', label: 'Mentor (to Target)', icon: GraduationCap, category: 'hierarchical' },
  { key: 'mentee', label: 'Mentee (of Target)', icon: GraduationCap, category: 'hierarchical' },
];

const specialRelations = [
  { key: 'spouse', label: 'Spouse', icon: Heart, category: 'special' },
  { key: 'partner', label: 'Partner', icon: Gem, category: 'special' },
  { key: 'family_member', label: 'Family Member', icon: Users2, category: 'special' },
];

const allPredefinedRelations = [...commonRelations, ...hierarchicalRelations, ...specialRelations];

const mutuallyExclusivePairs: [string, string][] = [
  ['parent', 'child'],
  ['manager', 'reports_to'],
  ['mentor', 'mentee'],
  ['spouse', 'partner'],
];


const CreateConnectionDialog: React.FC<CreateConnectionDialogProps> = ({
  isOpen,
  onOpenChange,
  sourcePerson,
  targetPerson,
  allUserPeople, // Use this prop
  editingConnection,
  onSave,
  isProcessing,
}) => {
  const [selectedPredefinedTypes, setSelectedPredefinedTypes] = useState<string[]>([]);
  const [currentStrength, setCurrentStrength] = useState<number | undefined>(undefined);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isDirty: formIsDirty },
  } = useForm<z.infer<typeof createConnectionFormSchema>>({
    resolver: zodResolver(createConnectionFormSchema),
    defaultValues: {
      customTypes: "",
      reasons: "",
      strength: "",
      notes: "",
    }
  });

  const isEditMode = !!editingConnection;

  // フォームの初期化
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && editingConnection) {
      const predefined = editingConnection.types.filter(type => allPredefinedRelations.some(rel => rel.key === type));
      const custom = editingConnection.types.filter(type => !allPredefinedRelations.some(rel => rel.key === type));

      setSelectedPredefinedTypes(predefined);
      reset({
        customTypes: custom.join(', '),
        reasons: editingConnection.reasons.join('\n'),
        strength: editingConnection.strength?.toString() ?? "",
        notes: editingConnection.notes || "",
      });
      setCurrentStrength(editingConnection.strength ?? undefined);
    } else {
      reset({ customTypes: "", reasons: "", strength: "", notes: "" });
      setSelectedPredefinedTypes([]);
      setCurrentStrength(undefined);
    }
  }, [isOpen, editingConnection, isEditMode, reset]);

  const processAndSubmit = async (formData: z.infer<typeof createConnectionFormSchema>) => {
    const customTypesArray = formData.customTypes?.split(',')
      .map(t => t.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(t => t) || [];

    const finalTypes = Array.from(new Set([...selectedPredefinedTypes, ...customTypesArray]));

    const reasonsArray = formData.reasons?.split(/[\n,]+/)
      .map(r => r.trim())
      .filter(r => r) || [];

    const strengthNum = currentStrength;

    const processedData: ProcessedConnectionFormData = {
      types: finalTypes,
      reasons: reasonsArray,
      strength: strengthNum,
      notes: formData.notes || "",
    };
    await onSave(processedData, editingConnection?.id);
  };

  const handlePredefinedTypeChange = (newlySelectedOrDeselectedTypes: string[]) => {
    let currentSelectionState = [...selectedPredefinedTypes];
    let finalSelection = [...newlySelectedOrDeselectedTypes];

    const typeJustChanged = finalSelection.length > currentSelectionState.length
      ? finalSelection.find(t => !currentSelectionState.includes(t))
      : currentSelectionState.find(t => !finalSelection.includes(t));


    if (typeJustChanged && finalSelection.includes(typeJustChanged)) {
      for (const pair of mutuallyExclusivePairs) {
        if (pair.includes(typeJustChanged)) {
          const otherInPair = pair.find(type => type !== typeJustChanged);
          if (otherInPair && finalSelection.includes(otherInPair)) {
            finalSelection = finalSelection.filter(type => type !== otherInPair);
          }
        }
      }
    }
    setSelectedPredefinedTypes(finalSelection);
  };


  if (!sourcePerson || !targetPerson) return null;

  const isFormActuallyDirty = formIsDirty ||
    selectedPredefinedTypes.join(',') !== (editingConnection?.types.filter(type => allPredefinedRelations.some(rel => rel.key === type)).join(',') ?? "") ||
    currentStrength !== (editingConnection?.strength ?? undefined);


  const renderRelationToggleItems = (relations: typeof commonRelations) => (
    <ToggleGroup
      type="multiple"
      variant="outline"
      value={selectedPredefinedTypes}
      onValueChange={handlePredefinedTypeChange}
      className="flex-wrap justify-start gap-2"
      disabled={isProcessing}
    >
      {relations.map(rel => (
        <ToggleGroupItem
          key={rel.key}
          value={rel.key}
          aria-label={rel.label}
          className="data-[state=on]:bg-accent/20 data-[state=on]:border-accent data-[state=on]:text-accent-foreground"
        >
          <rel.icon className="mr-2 h-4 w-4" /> {rel.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  const displaySourcePersonName = useMemo(() =>
    isEditMode && editingConnection ? allUserPeople.find(p => p.id === editingConnection.fromPersonId)?.name ?? 'Source' : sourcePerson.name
    , [isEditMode, editingConnection, allUserPeople, sourcePerson.name]);

  const displayTargetPersonName = useMemo(() =>
    isEditMode && editingConnection ? allUserPeople.find(p => p.id === editingConnection.toPersonId)?.name ?? 'Target' : targetPerson.name
    , [isEditMode, editingConnection, allUserPeople, targetPerson.name]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl !max-h-[90vh] !flex !flex-col">
        <DialogHeader className="shrink-0 text-center sm:text-left">
          <DialogTitle className="font-headline text-xl flex items-center justify-center sm:justify-start">
            {isEditMode ? <FileEdit className="mr-2 h-6 w-6 text-primary" /> : <Link2 className="mr-2 h-6 w-6 text-primary" />}
            {isEditMode ? "Edit Connection" : "Create Connection"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 my-2 rounded-md bg-muted/50 border text-sm shadow-inner">
          <div className="flex items-center justify-center text-foreground font-medium text-base">
            <span className="flex items-center"><Users className="mr-1.5 h-5 w-5 text-primary" />{displaySourcePersonName}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground mx-3" />
            <span className="flex items-center">{displayTargetPersonName}<Users className="ml-1.5 h-5 w-5 text-primary" /></span>
          </div>
          <DialogDescription className="text-center sm:text-left mt-1">
            Define the relationship of <strong className="text-primary">{displaySourcePersonName}</strong> towards <strong className="text-primary">{displayTargetPersonName}</strong>.
          </DialogDescription>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto px-1 py-2 pr-3 -mr-2">
          <form onSubmit={handleSubmit(processAndSubmit)} id="connection-form" className="space-y-6">

            <section className="space-y-4">
              <h3 className="text-md font-semibold mb-2 flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary/80" />Relationship Categories</h3>

              <div className="p-3 rounded-md border-l-[3px] border-[#3B82F6] bg-[rgba(59,130,246,0.05)] space-y-2">
                <Label className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1 block">Common</Label>
                {renderRelationToggleItems(commonRelations)}
              </div>

              <div className="p-3 rounded-md border-l-[3px] border-[#FB923C] bg-[rgba(251,146,60,0.05)] space-y-2">
                <Label className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1 block">Hierarchical (Source's role to Target)</Label>
                {renderRelationToggleItems(hierarchicalRelations)}
              </div>

              <div className="p-3 rounded-md border-l-[3px] border-[#EC4899] bg-[rgba(236,72,153,0.05)] space-y-2">
                <Label className="text-sm font-medium text-pink-700 dark:text-pink-400 mb-1 block">Special</Label>
                {renderRelationToggleItems(specialRelations)}
              </div>
            </section>

            <div>
              <Label htmlFor="customTypes" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Sparkles className="mr-1.5 h-4 w-4" />Custom Relationship Types
              </Label>
              <Input
                id="customTypes"
                {...register('customTypes')}
                placeholder="e.g., project_lead, teammate (comma-separated)"
                disabled={isProcessing}
              />
              {errors.customTypes && <p className="text-xs text-destructive mt-1">{errors.customTypes.message}</p>}
            </div>

            <hr className="my-4 border-border" />

            <h3 className="text-md font-semibold mb-1 flex items-center"><FileText className="mr-2 h-5 w-5 text-primary/80" />Optional Details</h3>

            <div>
              <Label htmlFor="reasons" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                Context / Reasons
              </Label>
              <Textarea
                id="reasons"
                {...register('reasons')}
                placeholder="e.g., Worked at Globex Corp (Project Alpha).&#10;University alumni - Class of 2010. (Separate with new lines or commas)"
                className="min-h-[80px]"
                disabled={isProcessing}
              />
              {errors.reasons && <p className="text-xs text-destructive mt-1">{errors.reasons.message}</p>}
            </div>

            <div>
              <Label htmlFor="strength" className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                Strength of Connection (1-5): {currentStrength !== undefined ? currentStrength : "Not set"}
              </Label>
              <Controller
                name="strength"
                control={control}
                render={({ field }) => (
                  <Slider
                    id="strength"
                    min={1}
                    max={5}
                    step={1}
                    value={currentStrength !== undefined ? [currentStrength] : []}
                    onValueChange={(value) => {
                      setCurrentStrength(value[0]);
                      field.onChange(value[0]?.toString() || "");
                    }}
                    disabled={isProcessing}
                    className="my-3"
                  />
                )}
              />
              {errors.strength && <p className="text-xs text-destructive mt-1">{errors.strength.message}</p>}
            </div>

            <div>
              <Label htmlFor="notes" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                Private Notes
              </Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Any additional private notes about this connection"
                className="min-h-[80px]"
                disabled={isProcessing}
              />
              {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes.message}</p>}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="shrink-0 pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isProcessing}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="connection-form" disabled={isProcessing || (!isEditMode && !isFormActuallyDirty && selectedPredefinedTypes.length === 0) || (isEditMode && !isFormActuallyDirty)} className="min-w-[100px]">
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                {isEditMode ? "Save Changes" : "Save Connection"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateConnectionDialog;
