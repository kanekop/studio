
"use client";
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Person } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Building, Smile, CalendarDays, Info, Save, FileText } from 'lucide-react'; // Added FileText for notes

const editPersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  hobbies: z.string().optional(),
  birthday: z.string().optional(),
  firstMet: z.string().optional(),
  firstMetContext: z.string().optional(),
  notes: z.string().optional(),
});

export type EditPersonFormData = z.infer<typeof editPersonSchema>;

interface EditPersonDialogProps {
  personToEdit: Person | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (personId: string, data: EditPersonFormData) => Promise<void>;
  isProcessing: boolean;
}

const EditPersonDialog: React.FC<EditPersonDialogProps> = ({
  personToEdit,
  isOpen,
  onOpenChange,
  onSave,
  isProcessing,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditPersonFormData>({
    resolver: zodResolver(editPersonSchema),
  });

  useEffect(() => {
    if (personToEdit && isOpen) {
      reset({
        name: personToEdit.name || '',
        company: personToEdit.company || '',
        hobbies: personToEdit.hobbies || '',
        birthday: personToEdit.birthday || '',
        firstMet: personToEdit.firstMet || '',
        firstMetContext: personToEdit.firstMetContext || '',
        notes: personToEdit.notes || '',
      });
    } else if (!isOpen) {
      reset(); // Clear form when dialog closes
    }
  }, [personToEdit, isOpen, reset]);

  const onSubmit = async (data: EditPersonFormData) => {
    if (personToEdit) {
      await onSave(personToEdit.id, data);
    }
  };

  if (!personToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl !max-h-[90vh] !flex !flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline text-xl flex items-center">
            <User className="mr-2 h-6 w-6 text-primary" />
            Edit Details for {personToEdit.name}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-y-auto px-1 py-2 pr-3 -mr-2">
          <form onSubmit={handleSubmit(onSubmit)} id="edit-person-form" className="space-y-4">
            <div>
              <Label htmlFor="name" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <User className="mr-1.5 h-4 w-4" />Name*
              </Label>
              <Input id="name" {...register('name')} placeholder="Full name" disabled={isProcessing} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="company" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Building className="mr-1.5 h-4 w-4" />Company
              </Label>
              <Input id="company" {...register('company')} placeholder="Company name" disabled={isProcessing} />
            </div>

            <div>
              <Label htmlFor="hobbies" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Smile className="mr-1.5 h-4 w-4" />Hobbies
              </Label>
              <Textarea id="hobbies" {...register('hobbies')} placeholder="e.g., Reading, Hiking, Coding" className="min-h-[60px]" disabled={isProcessing} />
            </div>

            <div>
              <Label htmlFor="birthday" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <CalendarDays className="mr-1.5 h-4 w-4" />Birthday
              </Label>
              <Input id="birthday" {...register('birthday')} placeholder="e.g., January 1st or 1990-01-01" disabled={isProcessing} />
            </div>

            <div>
              <Label htmlFor="firstMet" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <CalendarDays className="mr-1.5 h-4 w-4" />First Met Date
              </Label>
              <Input id="firstMet" {...register('firstMet')} placeholder="e.g., At a conference or 2023-05-15" disabled={isProcessing} />
            </div>

            <div>
              <Label htmlFor="firstMetContext" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Info className="mr-1.5 h-4 w-4" />First Met Context
              </Label>
              <Textarea id="firstMetContext" {...register('firstMetContext')} placeholder="e.g., Introduced by John at the tech meetup" className="min-h-[60px]" disabled={isProcessing} />
            </div>
            
            <div>
              <Label htmlFor="notes" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <FileText className="mr-1.5 h-4 w-4" />Notes
              </Label>
              <Textarea id="notes" {...register('notes')} placeholder="Any additional notes" className="min-h-[80px]" disabled={isProcessing} />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="shrink-0 pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isProcessing}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="edit-person-form" disabled={isProcessing || !isDirty} className="min-w-[100px]">
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
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPersonDialog;
