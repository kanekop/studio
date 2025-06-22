"use client";
import React, { useState } from 'react';
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
import { Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PeopleService, CreatePersonData } from '@/domain/services/people/PeopleService';
import type { Person } from '@/shared/types';

interface AddPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (person: Person) => void;
}

const initialFormData = {
  name: '',
  company: '',
  hobbies: '',
  birthday: '',
  firstMet: '',
  firstMetContext: '',
  notes: '',
};

export const AddPersonDialog: React.FC<AddPersonDialogProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }

    setIsAdding(true);
    try {
      const newPerson = await PeopleService.createPerson(formData);
      onAdd(newPerson);
      toast({ title: "Success", description: `${newPerson.name} has been added.` });
      setFormData(initialFormData); // Reset form
      onClose();
    } catch (error) {
      console.error('Failed to add person:', error);
      toast({ title: "Error", description: "Failed to add person. You might need to be logged in.", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Person</DialogTitle>
          <DialogDescription>
            You can add a person without a photo. Photos can be added later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={formData.name} onChange={handleChange} placeholder="Taro Yamada" disabled={isAdding} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" value={formData.company} onChange={handleChange} placeholder="ABC Inc." disabled={isAdding} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hobbies">Hobbies</Label>
            <Input id="hobbies" value={formData.hobbies} onChange={handleChange} placeholder="Golf, Reading" disabled={isAdding} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <Input id="birthday" type="date" value={formData.birthday} onChange={handleChange} disabled={isAdding} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstMet">First Met Date</Label>
            <Input id="firstMet" type="date" value={formData.firstMet} onChange={handleChange} disabled={isAdding} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstMetContext">First Met Context</Label>
            <Input id="firstMetContext" value={formData.firstMetContext} onChange={handleChange} placeholder="At the new year party" disabled={isAdding} />
          </div>
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={handleChange} placeholder="Other information..." rows={4} disabled={isAdding} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAdding}>Cancel</Button>
          <Button onClick={handleAdd} disabled={isAdding}>
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" /> Add Person
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};