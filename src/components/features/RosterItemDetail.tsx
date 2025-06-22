"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useFaceRoster, useUI } from '@/contexts';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle, Edit3, CheckSquare, Building, Smile, CalendarDays, Info, Save, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { EditablePersonInContext } from '@/shared/types';
import { useStorageImage } from '@/hooks/useStorageImage.improved';
import { PeopleService, CreatePersonData } from '@/domain/services/people/PeopleService';
import { useToast } from '@/hooks/use-toast';

const RosterItemDetail = () => {
  const { roster, selectedPersonId, setRoster } = useFaceRoster();
  const { toast } = useToast();
  const { isProcessing: isGlobalProcessing } = useUI();
  const [isSaving, setIsSaving] = useState(false);

  const selectedPerson = useMemo(() => {
    if (!roster || !selectedPersonId) return null;
    return roster.find(p => p.id === selectedPersonId) || null;
  }, [roster, selectedPersonId]);

  // Local form state
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [company, setCompany] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [birthday, setBirthday] = useState('');
  const [firstMet, setFirstMet] = useState('');
  const [firstMetContext, setFirstMetContext] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Use the robust image fetching hook
  const imagePath = selectedPerson?.currentRosterAppearance?.faceImageStoragePath || selectedPerson?.tempFaceImageDataUri;
  const { url: displayImageUrl, isLoading: isImageLoading } = useStorageImage(imagePath);

  useEffect(() => {
    if (selectedPerson) {
      setName(selectedPerson.name || '');
      setNotes(selectedPerson.notes || '');
      setCompany(selectedPerson.company || '');
      setHobbies(selectedPerson.hobbies || '');
      setBirthday(selectedPerson.birthday || '');
      setFirstMet(selectedPerson.firstMet || '');
      setFirstMetContext(selectedPerson.firstMetContext || '');
      
      if (selectedPerson.name === '' || selectedPerson.isNew) {
        setIsEditing(true);
      }
    } else {
      // Clear fields if no person is selected
      setName('');
      setNotes('');
      setCompany('');
      setHobbies('');
      setBirthday('');
      setFirstMet('');
      setFirstMetContext('');
    }
  }, [selectedPerson]);

  const handleInputChange = (
    field: string,
    value: string
  ) => {
    setIsDirty(true);
    switch (field) {
      case 'name':
        setName(value);
        break;
      case 'notes':
        setNotes(value);
        break;
      case 'company':
        setCompany(value);
        break;
      case 'hobbies':
        setHobbies(value);
        break;
      case 'birthday':
        setBirthday(value);
        break;
      case 'firstMet':
        setFirstMet(value);
        break;
      case 'firstMetContext':
        setFirstMetContext(value);
        break;
    }
  };

  const handleSave = async () => {
    if (!selectedPerson) return;
    setIsSaving(true);

    const personData = {
      name,
      notes,
      company,
      hobbies,
      birthday,
      firstMet,
      firstMetContext,
    };
    
    try {
      if (selectedPerson.isNew) {
        // We need to cast here because createPerson has a more specific type
        const newPerson = await PeopleService.createPerson(personData as CreatePersonData);
        setRoster(prev => prev?.map(p => (p.id === selectedPerson.id ? { ...newPerson, isNew: false } : p)) || []);
      } else {
        await PeopleService.updatePerson(selectedPerson.id, personData);
        setRoster(prev => prev?.map(p => (p.id === selectedPerson.id ? { ...p, ...personData } : p)) || []);
      }
      toast({ title: "Success", description: "Person details saved." });
    } catch (error) {
      console.error("Failed to save person:", error);
      toast({ title: "Error", description: "Could not save details.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (selectedPerson) {
      setName(selectedPerson.name || '');
      setNotes(selectedPerson.notes || '');
      setCompany(selectedPerson.company || '');
      setHobbies(selectedPerson.hobbies || '');
      setBirthday(selectedPerson.birthday || '');
      setFirstMet(selectedPerson.firstMet || '');
      setFirstMetContext(selectedPerson.firstMetContext || '');
    }
    setIsDirty(false);
    setIsEditing(false);
  };

  if (!selectedPerson) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <UserCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Select a person from the roster to view details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Person Details</CardTitle>
          {!isEditing && (
            <Button
              onClick={handleEdit}
              variant="outline"
              size="sm"
              disabled={isGlobalProcessing}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
        <CardDescription>
          {isEditing ? 'Edit information below' : 'View person information'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 overflow-y-auto max-h-[calc(100vh-300px)]">
        <div className="flex justify-center mb-4">
          <div className="relative">
            {isImageLoading ? (
              <Skeleton className="w-32 h-32 rounded-full" />
            ) : imagePath ? (
              <Image
                src={imagePath}
                alt={selectedPerson.name || 'Person'}
                width={128}
                height={128}
                className="rounded-full object-cover border-4 border-primary/10"
              />
            ) : (
              <Skeleton className="w-32 h-32 rounded-full" />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Name
            </Label>
            {isEditing ? (
              <Input
                id="name"
                value={name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter name"
                disabled={isGlobalProcessing}
              />
            ) : (
              <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md">
                {name || 'No name provided'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Company
            </Label>
            {isEditing ? (
              <Input
                id="company"
                value={company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Enter company"
                disabled={isGlobalProcessing}
              />
            ) : (
              <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md">
                {company || 'No company provided'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hobbies" className="flex items-center gap-2">
              <Smile className="h-4 w-4" />
              Hobbies
            </Label>
            {isEditing ? (
              <Input
                id="hobbies"
                value={hobbies}
                onChange={(e) => handleInputChange('hobbies', e.target.value)}
                placeholder="Enter hobbies"
                disabled={isGlobalProcessing}
              />
            ) : (
              <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md">
                {hobbies || 'No hobbies provided'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthday" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Birthday
            </Label>
            {isEditing ? (
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => handleInputChange('birthday', e.target.value)}
                disabled={isGlobalProcessing}
              />
            ) : (
              <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md">
                {birthday || 'No birthday provided'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstMet" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              First Met
            </Label>
            {isEditing ? (
              <Input
                id="firstMet"
                type="date"
                value={firstMet}
                onChange={(e) => handleInputChange('firstMet', e.target.value)}
                disabled={isGlobalProcessing}
              />
            ) : (
              <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md">
                {firstMet || 'No date provided'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstMetContext" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              First Met Context
            </Label>
            {isEditing ? (
              <Input
                id="firstMetContext"
                value={firstMetContext}
                onChange={(e) => handleInputChange('firstMetContext', e.target.value)}
                placeholder="Where/how did you meet?"
                disabled={isGlobalProcessing}
              />
            ) : (
              <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md">
                {firstMetContext || 'No context provided'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Notes
            </Label>
            {isEditing ? (
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add any notes about this person"
                rows={3}
                disabled={isGlobalProcessing}
              />
            ) : (
              <p className="text-sm font-medium px-3 py-2 bg-muted rounded-md min-h-[80px] whitespace-pre-wrap">
                {notes || 'No notes provided'}
              </p>
            )}
          </div>
        </div>
      </CardContent>

      {isEditing && (
        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={isGlobalProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || isGlobalProcessing}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default RosterItemDetail;