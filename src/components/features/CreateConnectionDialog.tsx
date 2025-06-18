
"use client";
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Person, CreateConnectionFormData } from '@/types';
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
import { Link2, Users, Info, Hash, FileText, Save, Sparkles } from 'lucide-react';

const createConnectionSchema = z.object({
  types: z.string().min(1, "At least one type is required (e.g., friend, colleague). Comma-separate multiple."),
  reasons: z.string().optional(),
  strength: z.string().optional(), // Will be parsed to number or null
  notes: z.string().optional(),
});

interface CreateConnectionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sourcePerson: Person | null;
  targetPerson: Person | null;
  onSave: (data: CreateConnectionFormData) => Promise<void>;
  isProcessing: boolean;
}

const CreateConnectionDialog: React.FC<CreateConnectionDialogProps> = ({
  isOpen,
  onOpenChange,
  sourcePerson,
  targetPerson,
  onSave,
  isProcessing,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateConnectionFormData>({
    resolver: zodResolver(createConnectionSchema),
    defaultValues: {
        types: "",
        reasons: "",
        strength: "",
        notes: "",
    }
  });

  useEffect(() => {
    if (!isOpen) {
      reset(); 
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: CreateConnectionFormData) => {
    await onSave(data);
  };

  if (!sourcePerson || !targetPerson) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl !max-h-[90vh] !flex !flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline text-xl flex items-center">
            <Link2 className="mr-2 h-6 w-6 text-primary" />
            Create Connection
          </DialogTitle>
          <DialogDescription>
            Define the relationship between <strong className="text-accent">{sourcePerson.name}</strong> and <strong className="text-accent">{targetPerson.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-y-auto px-1 py-2 pr-3 -mr-2">
          <form onSubmit={handleSubmit(onSubmit)} id="create-connection-form" className="space-y-4">
            
            <div className="p-3 rounded-md bg-muted/50 border">
                <p className="text-sm font-medium text-foreground">Connecting:</p>
                <div className="flex items-center justify-between text-sm mt-1">
                    <span className="flex items-center"><Users className="mr-1.5 h-4 w-4 text-muted-foreground"/>From: <strong className="ml-1 text-primary">{sourcePerson.name}</strong></span>
                    <Link2 className="h-4 w-4 text-muted-foreground mx-2"/>
                    <span className="flex items-center">To: <strong className="ml-1 text-primary">{targetPerson.name}</strong><Users className="ml-1.5 h-4 w-4 text-muted-foreground"/></span>
                </div>
            </div>

            <div>
              <Label htmlFor="types" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Sparkles className="mr-1.5 h-4 w-4" />Relationship Types*
              </Label>
              <Textarea 
                id="types" 
                {...register('types')} 
                placeholder="e.g., colleague, friend, mentor (comma-separated)" 
                className="min-h-[60px]" 
                disabled={isProcessing} 
              />
              {errors.types && <p className="text-xs text-destructive mt-1">{errors.types.message}</p>}
            </div>

            <div>
              <Label htmlFor="reasons" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Info className="mr-1.5 h-4 w-4" />Reasons
              </Label>
              <Textarea 
                id="reasons" 
                {...register('reasons')} 
                placeholder="e.g., Worked at Globex, University alumni (comma-separated)" 
                className="min-h-[60px]" 
                disabled={isProcessing} 
              />
               {errors.reasons && <p className="text-xs text-destructive mt-1">{errors.reasons.message}</p>}
            </div>

            <div>
              <Label htmlFor="strength" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Hash className="mr-1.5 h-4 w-4" />Strength (1-5, optional)
              </Label>
              <Input 
                id="strength" 
                type="number"
                min="1"
                max="5"
                {...register('strength')} 
                placeholder="e.g., 4" 
                disabled={isProcessing} 
              />
              {errors.strength && <p className="text-xs text-destructive mt-1">{errors.strength.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="notes" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <FileText className="mr-1.5 h-4 w-4" />Notes
              </Label>
              <Textarea 
                id="notes" 
                {...register('notes')} 
                placeholder="Any additional notes about this connection" 
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
          <Button type="submit" form="create-connection-form" disabled={isProcessing || !isDirty} className="min-w-[100px]">
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
