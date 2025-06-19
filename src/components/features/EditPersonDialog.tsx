
"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Person, Connection, FaceAppearance } from '@/types';
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
import { User, Building, Smile, CalendarDays, Info, Save, FileText, LinkIcon, Users as UsersIcon, Star, MessageSquare, Image as ImageIcon, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from '@/components/ui/card';
import NextImage from 'next/image'; 
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { storage } from '@/lib/firebase';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { useFaceRoster } from '@/contexts/FaceRosterContext'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const editPersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  hobbies: z.string().optional(),
  birthday: z.string().optional(),
  firstMet: z.string().optional(),
  firstMetContext: z.string().optional(),
  notes: z.string().optional(),
  primaryFaceAppearancePath: z.string().optional(),
});

export type EditPersonFormData = z.infer<typeof editPersonSchema>;

interface EditPersonDialogProps {
  personToEdit: Person | null;
  allUserPeople: Person[];
  allUserConnections: Connection[];
  isLoadingPeople: boolean;
  isLoadingConnections: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (personId: string, data: EditPersonFormData) => Promise<void>;
  isProcessing: boolean; // This is the general isProcessing from context for save button
}

interface AppearanceWithUrl extends FaceAppearance {
  displayUrl?: string;
  isLoadingUrl?: boolean;
}

const EditPersonDialog: React.FC<EditPersonDialogProps> = ({
  personToEdit,
  allUserPeople,
  allUserConnections,
  isLoadingPeople,
  isLoadingConnections,
  isOpen,
  onOpenChange,
  onSave,
  isProcessing: isSaveProcessing, 
}) => {
  const { deleteConnection, isProcessing: isContextProcessing } = useFaceRoster(); 
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);


  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue, 
    formState: { errors, isDirty },
  } = useForm<EditPersonFormData>({
    resolver: zodResolver(editPersonSchema),
  });

  const [faceAppearancesWithUrls, setFaceAppearancesWithUrls] = useState<AppearanceWithUrl[]>([]);

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
        primaryFaceAppearancePath: personToEdit.primaryFaceAppearancePath || personToEdit.faceAppearances?.[0]?.faceImageStoragePath || '',
      });

      const fetchAppearanceUrls = async () => {
        if (personToEdit.faceAppearances && personToEdit.faceAppearances.length > 0) {
          const appearances = personToEdit.faceAppearances.map(app => ({ ...app, isLoadingUrl: true }));
          setFaceAppearancesWithUrls(appearances);

          const updatedAppearances = await Promise.all(
            appearances.map(async (appearance) => {
              if (appearance.faceImageStoragePath && storage) {
                try {
                  const url = await getDownloadURL(storageRef(storage, appearance.faceImageStoragePath));
                  return { ...appearance, displayUrl: url, isLoadingUrl: false };
                } catch (error) {
                  console.error(`Error fetching image URL for ${appearance.faceImageStoragePath}:`, error);
                  return { ...appearance, displayUrl: "https://placehold.co/100x100.png?text=Error", isLoadingUrl: false };
                }
              }
              return { ...appearance, displayUrl: "https://placehold.co/100x100.png?text=No+Path", isLoadingUrl: false };
            })
          );
          setFaceAppearancesWithUrls(updatedAppearances);
        } else {
          setFaceAppearancesWithUrls([]);
        }
      };
      fetchAppearanceUrls();

    } else if (!isOpen) {
      reset();
      setFaceAppearancesWithUrls([]);
    }
  }, [personToEdit, isOpen, reset]);

  const onSubmit = async (data: EditPersonFormData) => {
    if (personToEdit) {
      await onSave(personToEdit.id, data);
    }
  };

  const handleInitiateDeleteConnection = (connection: Connection) => {
    setConnectionToDelete(connection);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteConnection = async () => {
    if (connectionToDelete) {
      await deleteConnection(connectionToDelete.id);
      setConnectionToDelete(null);
      setIsDeleteConfirmOpen(false);
      // The context will update allUserConnections, which should re-render this dialog's list
    }
  };


  const relatedConnections = useMemo(() => {
    if (!personToEdit || isLoadingConnections || isLoadingPeople) return [];
    return allUserConnections
      .filter(conn => conn.fromPersonId === personToEdit.id || conn.toPersonId === personToEdit.id)
      .map(conn => {
        const otherPersonId = conn.fromPersonId === personToEdit.id ? conn.toPersonId : conn.fromPersonId;
        const otherPerson = allUserPeople.find(p => p.id === otherPersonId);
        return {
          connection: conn,
          otherPerson: otherPerson,
          direction: conn.fromPersonId === personToEdit.id ? 'outgoing' : 'incoming',
        };
      })
      .filter(item => item.otherPerson);
  }, [personToEdit, allUserConnections, allUserPeople, isLoadingConnections, isLoadingPeople]);

  if (!personToEdit) return null;
  
  const overallIsProcessing = isSaveProcessing || isContextProcessing;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!overallIsProcessing) onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl !max-h-[90vh] !flex !flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline text-xl flex items-center">
            <User className="mr-2 h-6 w-6 text-primary" />
            Edit Details for {personToEdit.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto px-1 py-2 pr-3 -mr-2">
          <form onSubmit={handleSubmit(onSubmit)} id="edit-person-form">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              {/* Column 1: Basic Info Form */}
              <div className="space-y-4 md:col-span-1">
                <div>
                  <Label htmlFor="name" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                    <User className="mr-1.5 h-4 w-4" />Name*
                  </Label>
                  <Input id="name" {...register('name')} placeholder="Full name" disabled={overallIsProcessing} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="company" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                    <Building className="mr-1.5 h-4 w-4" />Company
                  </Label>
                  <Input id="company" {...register('company')} placeholder="Company name" disabled={overallIsProcessing} />
                </div>
                <div>
                  <Label htmlFor="hobbies" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                    <Smile className="mr-1.5 h-4 w-4" />Hobbies
                  </Label>
                  <Textarea id="hobbies" {...register('hobbies')} placeholder="e.g., Reading, Hiking, Coding" className="min-h-[60px]" disabled={overallIsProcessing} />
                </div>
                <div>
                  <Label htmlFor="birthday" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                    <CalendarDays className="mr-1.5 h-4 w-4" />Birthday
                  </Label>
                  <Input id="birthday" {...register('birthday')} placeholder="e.g., January 1st or 1990-01-01" disabled={overallIsProcessing} />
                </div>
                <div>
                  <Label htmlFor="firstMet" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                    <CalendarDays className="mr-1.5 h-4 w-4" />First Met Date
                  </Label>
                  <Input id="firstMet" {...register('firstMet')} placeholder="e.g., At a conference or 2023-05-15" disabled={overallIsProcessing} />
                </div>
                <div>
                  <Label htmlFor="firstMetContext" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                    <Info className="mr-1.5 h-4 w-4" />First Met Context
                  </Label>
                  <Textarea id="firstMetContext" {...register('firstMetContext')} placeholder="e.g., Introduced by John at the tech meetup" className="min-h-[60px]" disabled={overallIsProcessing} />
                </div>
                <div>
                  <Label htmlFor="notes" className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                    <FileText className="mr-1.5 h-4 w-4" />Notes
                  </Label>
                  <Textarea id="notes" {...register('notes')} placeholder="Any additional notes" className="min-h-[80px]" disabled={overallIsProcessing} />
                </div>
              </div>

              {/* Column 2: Photo Selection */}
              <div className="space-y-4 md:col-span-1">
                <h3 className="text-lg font-semibold flex items-center text-primary">
                  <ImageIcon className="mr-2 h-5 w-5" />
                  Main Display Photo
                </h3>
                <Separator />
                {faceAppearancesWithUrls.length > 0 ? (
                  <Controller
                    control={control}
                    name="primaryFaceAppearancePath"
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue('primaryFaceAppearancePath', value, { shouldDirty: true });
                        }}
                        value={field.value || personToEdit.faceAppearances?.[0]?.faceImageStoragePath || ""}
                        className="space-y-2"
                        disabled={overallIsProcessing}
                      >
                        <ScrollArea className="max-h-[calc(90vh-250px)] pr-2">
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {faceAppearancesWithUrls.map((appearance) => (
                              <Label
                                key={appearance.faceImageStoragePath}
                                htmlFor={appearance.faceImageStoragePath}
                                className={cn(
                                  "cursor-pointer rounded-md border-2 border-transparent transition-all hover:opacity-80 relative aspect-square flex items-center justify-center",
                                  field.value === appearance.faceImageStoragePath && "border-primary ring-2 ring-primary",
                                  overallIsProcessing && "cursor-not-allowed opacity-60"
                                )}
                              >
                                <RadioGroupItem
                                  value={appearance.faceImageStoragePath}
                                  id={appearance.faceImageStoragePath}
                                  className="sr-only"
                                  disabled={overallIsProcessing}
                                />
                                {appearance.isLoadingUrl ? (
                                  <Skeleton className="h-full w-full rounded-md" />
                                ) : (
                                  <NextImage
                                    src={appearance.displayUrl || "https://placehold.co/100x100.png?text=Loading"}
                                    alt={`Face appearance from roster ${appearance.rosterId.substring(0,6)}`}
                                    layout="fill"
                                    objectFit="cover"
                                    className="rounded-md"
                                  />
                                )}
                                {field.value === appearance.faceImageStoragePath && !overallIsProcessing && (
                                  <div className="absolute inset-0 bg-primary/30 flex items-center justify-center rounded-md">
                                    <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
                                  </div>
                                )}
                                <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-sm">
                                  Roster: ...{appearance.rosterId.slice(-6)}
                                </span>
                              </Label>
                            ))}
                          </div>
                        </ScrollArea>
                      </RadioGroup>
                    )}
                  />
                ) : isLoadingPeople ? (
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
                   </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No face images available for this person.</p>
                )}
              </div>

              {/* Column 3: Connections */}
              <div className="space-y-4 md:col-span-1">
                <h3 className="text-lg font-semibold flex items-center text-primary">
                  <LinkIcon className="mr-2 h-5 w-5" />
                  Related People
                </h3>
                <Separator />
                {(isLoadingConnections || isLoadingPeople) && !relatedConnections.length ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="bg-muted/30 shadow-sm">
                        <CardContent className="p-3 space-y-1.5">
                          <div className="flex items-center space-x-2 mb-1">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : relatedConnections.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No connections found.</p>
                ) : (
                  <ScrollArea className="max-h-[calc(90vh-250px)] pr-2"> 
                    <div className="space-y-3">
                    {relatedConnections.map(({ connection, otherPerson, direction }) => (
                      <Card key={connection.id} className="bg-muted/30 shadow-sm relative group">
                        <CardContent className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 mb-1">
                              <Avatar className="h-8 w-8">
                                  <AvatarImage src={otherPerson?.primaryFaceAppearancePath ? undefined : (otherPerson?.faceAppearances?.[0]?.faceImageStoragePath ? undefined : "https://placehold.co/40x40.png")} alt={otherPerson?.name || 'Person'}/>
                                  <AvatarFallback>{otherPerson?.name?.substring(0,1).toUpperCase() || 'P'}</AvatarFallback>
                                </Avatar>
                              <p className="font-semibold text-foreground truncate" title={otherPerson?.name || 'Unknown Person'}>{otherPerson?.name || 'Unknown Person'}</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                onClick={() => handleInitiateDeleteConnection(connection)}
                                disabled={overallIsProcessing}
                                aria-label={`Delete connection with ${otherPerson?.name || 'this person'}`}
                                title={`Delete connection`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p className="flex items-center">
                              <UsersIcon className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                              Relationship: {direction === 'outgoing'
                                ? `${personToEdit.name} → ${otherPerson?.name || 'them'}`
                                : `${otherPerson?.name || 'They'} → ${personToEdit.name}`}
                               : <strong className="ml-1 text-foreground truncate max-w-[150px]" title={connection.types.join(', ')}>{connection.types.join(', ') || 'N/A'}</strong>
                            </p>
                            {connection.reasons && connection.reasons.length > 0 && (
                              <p className="flex items-center">
                                <MessageSquare className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                                Reasons: <span className="ml-1 text-foreground truncate max-w-[180px]" title={connection.reasons.join('; ')}>{connection.reasons.join('; ')}</span>
                              </p>
                            )}
                             {connection.strength != null && (
                              <p className="flex items-center">
                                <Star className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                                Strength: <span className="ml-1 text-foreground">{connection.strength}/5</span>
                              </p>
                            )}
                            {connection.notes && (
                              <details className="group/notes-details">
                                  <summary className="flex items-center cursor-pointer list-none">
                                      <FileText className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                                      Notes: <span className="ml-1 text-foreground italic group-open/notes-details:hidden">(Click to view)</span>
                                  </summary>
                                  <p className="ml-[22px] text-foreground whitespace-pre-wrap text-xs bg-background/50 p-1.5 rounded-sm border mt-1">{connection.notes}</p>
                              </details>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="shrink-0 pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={overallIsProcessing}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="edit-person-form" disabled={overallIsProcessing || !isDirty} className="min-w-[100px]">
            {isSaveProcessing ? (
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

    {connectionToDelete && (
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/> Confirm Delete Connection
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the connection between <strong>{personToEdit.name}</strong> and <strong>{allUserPeople.find(p=>p.id === (connectionToDelete.fromPersonId === personToEdit.id ? connectionToDelete.toPersonId : connectionToDelete.fromPersonId))?.name || 'the other person'}</strong>?
                <br/>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isContextProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDeleteConnection} 
                disabled={isContextProcessing}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isContextProcessing ? "Deleting..." : "Yes, Delete Connection"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default EditPersonDialog;
    
