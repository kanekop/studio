"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PeopleService, UpdatePersonData } from '@/domain/services/people/PeopleService';
import type { Person } from '@/shared/types';

export interface EditPersonDialogProps {
  person: Person | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (personId: string, data: UpdatePersonData) => void;
}

export const EditPersonDialog: React.FC<EditPersonDialogProps> = ({ person, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<UpdatePersonData>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        company: person.company || '',
        hobbies: person.hobbies || '',
        birthday: person.birthday || '',
        firstMet: person.firstMet || '',
        firstMetContext: person.firstMetContext || '',
        notes: person.notes || '',
      });
    }
  }, [person]);

  if (!person) return null;

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await PeopleService.updatePerson(person.id, formData);
      onUpdate(person.id, formData);
      toast({ title: "Success", description: `${formData.name} has been updated.` });
      onClose();
    } catch (error) {
      console.error('Failed to update person:', error);
      toast({ title: "Error", description: "Failed to update person information.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Person Information</DialogTitle>
          <DialogDescription>
            Update the details for {person.name}. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={formData.name} onChange={handleChange} placeholder="Taro Yamada" disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" value={formData.company} onChange={handleChange} placeholder="ABC Inc." disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hobbies">Hobbies</Label>
            <Input id="hobbies" value={formData.hobbies} onChange={handleChange} placeholder="Golf, Reading" disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <Input id="birthday" type="date" value={formData.birthday} onChange={handleChange} disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstMet">First Met Date</Label>
            <Input id="firstMet" type="date" value={formData.firstMet} onChange={handleChange} disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstMetContext">First Met Context</Label>
            <Input id="firstMetContext" value={formData.firstMetContext} onChange={handleChange} placeholder="At the new year party" disabled={isSaving} />
          </div>
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={handleChange} placeholder="Other information..." rows={4} disabled={isSaving} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
