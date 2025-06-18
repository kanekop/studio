
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle, Edit3, CheckSquare, Building, Smile, CalendarDays, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { EditablePersonInContext } from '@/types';

const RosterItemDetail = () => {
  const { roster, selectedPersonId, updatePersonDetails, isProcessing: isGlobalProcessing } = useFaceRoster();
  
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [company, setCompany] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [birthday, setBirthday] = useState('');
  const [firstMet, setFirstMet] = useState('');
  const [firstMetContext, setFirstMetContext] = useState('');

  const [isEditing, setIsEditing] = useState(false);

  const selectedPerson = useMemo(() => {
    return roster.find(p => p.id === selectedPersonId);
  }, [roster, selectedPersonId]);

  useEffect(() => {
    if (selectedPerson) {
      setName(selectedPerson.name);
      setNotes(selectedPerson.notes || '');
      setCompany(selectedPerson.company || '');
      setHobbies(selectedPerson.hobbies || '');
      setBirthday(selectedPerson.birthday || '');
      setFirstMet(selectedPerson.firstMet || '');
      setFirstMetContext(selectedPerson.firstMetContext || '');
      setIsEditing(false); 
    } else {
      // Clear fields if no person is selected or person is not found
      setName('');
      setNotes('');
      setCompany('');
      setHobbies('');
      setBirthday('');
      setFirstMet('');
      setFirstMetContext('');
      setIsEditing(false);
    }
  }, [selectedPerson]);

  const handleSave = () => {
    if (selectedPerson) {
      const updatedDetails: Partial<EditablePersonInContext> = { 
        name, 
        notes,
        company,
        hobbies,
        birthday,
        firstMet,
        firstMetContext,
      };
      updatePersonDetails(selectedPerson.id, updatedDetails);
      setIsEditing(false);
    }
  };

  if (!selectedPersonId) {
    return (
      <Card className="h-full flex flex-col items-center justify-center shadow-lg">
        <CardContent className="text-center p-6">
          <UserCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a person from the roster to view details.</p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedPerson) { // Should ideally not happen if selectedPersonId is set and roster is populated
    return (
      <Card className="h-full flex flex-col shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="w-full h-48 rounded-md" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    );
  }
  
  const canEdit = !isGlobalProcessing;

  const renderDetailField = (label: string, value: string | undefined, Icon?: React.ElementType) => (
    <div className="flex items-start py-1">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mr-2 mt-1 flex-shrink-0" />}
      <span className="text-sm text-muted-foreground w-28 flex-shrink-0">{label}:</span>
      <span className="text-sm text-foreground break-words whitespace-pre-wrap">
        {value || <span className="italic">Not set</span>}
      </span>
    </div>
  );

  return (
    <Card className="h-full flex flex-col shadow-lg overflow-hidden">
      <CardHeader className="bg-muted/30">
        <CardTitle className="font-headline text-xl flex items-center justify-between">
          Person Details
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} aria-label={isEditing ? "Cancel editing" : "Edit details"}>
              {isEditing ? <CheckSquare className="h-5 w-5 text-green-500" /> : <Edit3 className="h-5 w-5 text-accent" />}
              <span className="ml-2 sr-only sm:not-sr-only">{isEditing ? 'View' : 'Edit'}</span>
            </Button>
          )}
        </CardTitle>
        <CardDescription>View or edit information for {selectedPerson.name}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 md:p-6 flex-grow overflow-y-auto">
        <div className="aspect-square w-full max-w-[200px] mx-auto rounded-md overflow-hidden shadow-md border bg-muted">
          {selectedPerson.faceImageUrl && selectedPerson.faceImageUrl !== "https://placehold.co/100x100.png" ? (
            <Image
              src={selectedPerson.faceImageUrl}
              alt={`Face of ${selectedPerson.name}`}
              width={200}
              height={200}
              className="object-cover w-full h-full"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <UserCircle className="h-24 w-24 text-muted-foreground" />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="personName" className="text-xs font-medium text-muted-foreground">Name</Label>
          {isEditing && canEdit ? (
            <Input id="personName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" aria-label="Person's name"/>
          ) : (
            <p className="mt-0.5 text-lg font-semibold p-2 rounded-md ">{selectedPerson.name}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="personCompany" className="text-xs font-medium text-muted-foreground">Company</Label>
          {isEditing && canEdit ? (
            <Input id="personCompany" value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1" placeholder="Company name" />
          ) : (
             renderDetailField("Company", selectedPerson.company, Building)
          )}
        </div>
        
        <div>
          <Label htmlFor="personHobbies" className="text-xs font-medium text-muted-foreground">Hobbies</Label>
          {isEditing && canEdit ? (
            <Textarea id="personHobbies" value={hobbies} onChange={(e) => setHobbies(e.target.value)} className="mt-1 min-h-[60px]" placeholder="e.g., Reading, Hiking, Coding" />
          ) : (
            renderDetailField("Hobbies", selectedPerson.hobbies, Smile)
          )}
        </div>

        <div>
          <Label htmlFor="personBirthday" className="text-xs font-medium text-muted-foreground">Birthday</Label>
          {isEditing && canEdit ? (
            <Input id="personBirthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="mt-1" placeholder="e.g., January 1st or 1990-01-01" />
          ) : (
            renderDetailField("Birthday", selectedPerson.birthday, CalendarDays)
          )}
        </div>

        <div>
          <Label htmlFor="personFirstMet" className="text-xs font-medium text-muted-foreground">First Met</Label>
          {isEditing && canEdit ? (
            <Input id="personFirstMet" value={firstMet} onChange={(e) => setFirstMet(e.target.value)} className="mt-1" placeholder="e.g., At a conference or 2023-05-15" />
          ) : (
            renderDetailField("First Met", selectedPerson.firstMet, CalendarDays)
          )}
        </div>

        <div>
          <Label htmlFor="personFirstMetContext" className="text-xs font-medium text-muted-foreground">First Met Context</Label>
          {isEditing && canEdit ? (
            <Textarea id="personFirstMetContext" value={firstMetContext} onChange={(e) => setFirstMetContext(e.target.value)} className="mt-1 min-h-[60px]" placeholder="e.g., Introduced by John at the tech meetup" />
          ) : (
             renderDetailField("Context", selectedPerson.firstMetContext, Info)
          )}
        </div>

        <div>
          <Label htmlFor="personNotes" className="text-xs font-medium text-muted-foreground">Notes</Label>
          {isEditing && canEdit ? (
            <Textarea id="personNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any relevant notes..." className="mt-1 min-h-[80px]" aria-label="Notes about the person"/>
          ) : (
            <p className="mt-1 text-sm p-2 rounded-md bg-muted/30 min-h-[60px] whitespace-pre-wrap">
              {selectedPerson.notes || <span className="italic text-muted-foreground">No notes added.</span>}
            </p>
          )}
        </div>
      </CardContent>
      {isEditing && canEdit && (
        <CardFooter className="bg-muted/30 border-t pt-4">
          <Button onClick={handleSave} className="w-full sm:w-auto" disabled={isGlobalProcessing}>
            <CheckSquare className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default RosterItemDetail;

