
"use client";
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Person } from '@/types'; 
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
    Link2, Users, FileText, Save, Sparkles, ArrowRight,
    Handshake, Smile, Briefcase, GraduationCap, Heart, Gem, Home, UserCircle as UserIcon // Renamed to avoid conflict
} from 'lucide-react';
import { cn } from '@/lib/utils';


// Zod schema for internal form validation
const createConnectionFormSchema = z.object({
  customTypes: z.string().optional(),
  reasons: z.string().optional(),
  strength: z.string().optional(), 
  notes: z.string().optional(),
});


export interface ProcessedConnectionFormData {
    types: string[];
    reasons: string[];
    strength?: number;
    notes?: string;
}

interface CreateConnectionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sourcePerson: Person | null;
  targetPerson: Person | null;
  onSave: (data: ProcessedConnectionFormData) => Promise<void>; 
  isProcessing: boolean;
}

const commonRelations = [
  { key: 'colleague', label: 'Colleague', icon: Briefcase },
  { key: 'friend', label: 'Friend', icon: Smile },
  { key: 'acquaintance', label: 'Acquaintance', icon: Handshake },
];

const hierarchicalRelations = [
  { key: 'parent', label: 'Parent (of Target)', icon: Home }, 
  { key: 'child', label: 'Child (of Target)', icon: UserIcon }, 
  { key: 'manager', label: 'Manager (of Target)', icon: Users }, 
  { key: 'reports_to', label: 'Reports to (Target)', icon: Users }, 
  { key: 'mentor', label: 'Mentor (to Target)', icon: GraduationCap },
  { key: 'mentee', label: 'Mentee (of Target)', icon: GraduationCap },
];

const specialRelations = [
  { key: 'spouse', label: 'Spouse', icon: Heart },
  { key: 'partner', label: 'Partner', icon: Gem },
];


const CreateConnectionDialog: React.FC<CreateConnectionDialogProps> = ({
  isOpen,
  onOpenChange,
  sourcePerson,
  targetPerson,
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

  useEffect(() => {
    if (isOpen) {
      reset({ customTypes: "", reasons: "", strength: "", notes: "" });
      setSelectedPredefinedTypes([]);
      setCurrentStrength(undefined);
    }
  }, [isOpen, reset]);
  
  const processAndSubmit = async (formData: z.infer<typeof createConnectionFormSchema>) => {
    const customTypesArray = formData.customTypes?.split(',')
        .map(t => t.trim())
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
    await onSave(processedData);
  };

  if (!sourcePerson || !targetPerson) return null;
  
  const isFormActuallyDirty = formIsDirty || selectedPredefinedTypes.length > 0 || currentStrength !== undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl !max-h-[90vh] !flex !flex-col">
        <DialogHeader className="shrink-0 text-center sm:text-left">
          <DialogTitle className="font-headline text-xl flex items-center justify-center sm:justify-start">
            <Link2 className="mr-2 h-6 w-6 text-primary" />
            Create Connection
          </DialogTitle>
          <DialogDescription className="text-center sm:text-left">
            Define the relationship from <strong className="text-accent">{sourcePerson.name}</strong> to <strong className="text-accent">{targetPerson.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-3 my-2 rounded-md bg-muted/50 border text-sm">
            <div className="flex items-center justify-center text-foreground">
                <span className="flex items-center"><Users className="mr-1.5 h-4 w-4 text-primary"/>{sourcePerson.name}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-2"/>
                <span className="flex items-center">{targetPerson.name}<Users className="ml-1.5 h-4 w-4 text-primary"/></span>
            </div>
             <p className="text-xs text-muted-foreground text-center mt-1">You are defining the relationship of {sourcePerson.name} towards {targetPerson.name}.</p>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto px-1 py-2 pr-3 -mr-2">
          <form onSubmit={handleSubmit(processAndSubmit)} id="create-connection-form" className="space-y-6">
            
            <section>
              <h3 className="text-md font-semibold mb-2 flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary/80" />Relationship Categories</h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-1 block">Common</Label>
                  <ToggleGroup type="multiple" variant="outline" value={selectedPredefinedTypes} onValueChange={setSelectedPredefinedTypes} className="flex-wrap justify-start gap-2">
                    {commonRelations.map(rel => (
                      <ToggleGroupItem key={rel.key} value={rel.key} aria-label={rel.label} className="data-[state=on]:bg-accent/20 data-[state=on]:border-accent data-[state=on]:text-accent-foreground">
                        <rel.icon className="mr-2 h-4 w-4" /> {rel.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-1 block">Hierarchical (Source Person's role to Target Person)</Label>
                   <ToggleGroup type="multiple" variant="outline" value={selectedPredefinedTypes} onValueChange={setSelectedPredefinedTypes} className="flex-wrap justify-start gap-2">
                    {hierarchicalRelations.map(rel => (
                      <ToggleGroupItem key={rel.key} value={rel.key} aria-label={rel.label} className="data-[state=on]:bg-accent/20 data-[state=on]:border-accent data-[state=on]:text-accent-foreground">
                        <rel.icon className="mr-2 h-4 w-4" /> {rel.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-1 block">Special</Label>
                   <ToggleGroup type="multiple" variant="outline" value={selectedPredefinedTypes} onValueChange={setSelectedPredefinedTypes} className="flex-wrap justify-start gap-2">
                    {specialRelations.map(rel => (
                      <ToggleGroupItem key={rel.key} value={rel.key} aria-label={rel.label} className="data-[state=on]:bg-accent/20 data-[state=on]:border-accent data-[state=on]:text-accent-foreground">
                        <rel.icon className="mr-2 h-4 w-4" /> {rel.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
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
            
            <hr className="my-4 border-border"/>

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
          <Button type="submit" form="create-connection-form" disabled={isProcessing || !isFormActuallyDirty} className="min-w-[100px]">
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
                Save Connection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateConnectionDialog;
