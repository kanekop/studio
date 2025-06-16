
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle, Edit3, CheckSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const RosterItemDetail = () => {
  const { roster, selectedPersonId, updatePersonDetails, isProcessing: isGlobalProcessing } = useFaceRoster();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const selectedPerson = useMemo(() => {
    return roster.find(p => p.id === selectedPersonId);
  }, [roster, selectedPersonId]);

  useEffect(() => {
    if (selectedPerson) {
      setName(selectedPerson.name);
      setNotes(selectedPerson.notes || '');
      setIsEditing(false); // Reset editing state when person changes
    }
  }, [selectedPerson]);

  const handleSave = () => {
    if (selectedPerson) {
      updatePersonDetails(selectedPerson.id, { name, notes });
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

  if (!selectedPerson) {
     // Should not happen if selectedPersonId is valid, but good for safety
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
      <CardContent className="space-y-6 p-4 md:p-6 flex-grow overflow-y-auto">
        <div className="aspect-square w-full max-w-[200px] mx-auto rounded-md overflow-hidden shadow-md border bg-muted">
          <Image
            src={selectedPerson.faceImageUrl}
            alt={`Face of ${selectedPerson.name}`}
            width={200}
            height={200}
            className="object-cover w-full h-full"
            priority
          />
        </div>

        <div>
          <Label htmlFor="personName" className="text-sm font-medium">Name</Label>
          {isEditing && canEdit ? (
            <Input
              id="personName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              aria-label="Person's name"
            />
          ) : (
            <p className="mt-1 text-lg font-semibold p-2 rounded-md bg-muted/50">{selectedPerson.name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="aiName" className="text-sm font-medium">AI Detected Name (Placeholder)</Label>
          <p className="mt-1 text-sm p-2 rounded-md bg-muted/50 text-muted-foreground italic">{selectedPerson.aiName || 'N/A'}</p>
        </div>

        <div>
          <Label htmlFor="personNotes" className="text-sm font-medium">Notes</Label>
          {isEditing && canEdit ? (
            <Textarea
              id="personNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes..."
              className="mt-1 min-h-[100px]"
              aria-label="Notes about the person"
            />
          ) : (
            <p className="mt-1 text-sm p-2 rounded-md bg-muted/50 min-h-[60px] whitespace-pre-wrap">
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
