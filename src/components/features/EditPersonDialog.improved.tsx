"use client";
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Building, Smile, CalendarDays, Info, Save, FileText, Image as ImageIcon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from '@/components/ui/card';
import NextImage from 'next/image';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from '@/lib/utils';
import { usePersonImage } from '@/hooks/usePersonImage';
import { useStorageImage } from '@/hooks/useStorageImage';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { AppError, ErrorType } from '@/types/errors';

const editPersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  hobbies: z.string().optional(),
  birthday: z.string().optional(),
  firstMet: z.string().optional(),
  firstMetContext: z.string().optional(),
  notes: z.string().optional(),
  primaryFaceAppearancePath: z.string().optional().nullable(),
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
  isProcessing: boolean;
}

interface FaceAppearanceWithImage extends FaceAppearance {
  imageUrl?: string;
  isLoadingImage?: boolean;
  imageError?: Error | null;
}

// Component for Face Appearance Image
const FaceAppearanceImage: React.FC<{
  appearance: FaceAppearance;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}> = ({ appearance, isSelected, onSelect, disabled }) => {
  const { imageUrl, isLoading, error, retry } = useStorageImage(appearance.faceImageStoragePath);

  return (
    <Label
      htmlFor={appearance.faceImageStoragePath}
      className={cn(
        "cursor-pointer rounded-md border-2 border-transparent transition-all hover:opacity-80 relative aspect-square flex items-center justify-center",
        isSelected && "border-primary ring-2 ring-primary",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <RadioGroupItem
        value={appearance.faceImageStoragePath}
        id={appearance.faceImageStoragePath}
        className="sr-only"
        disabled={disabled}
        onClick={onSelect}
      />
      {isLoading ? (
        <Skeleton className="h-full w-full rounded-md" />
      ) : error ? (
        <div className="h-full w-full rounded-md bg-muted flex flex-col items-center justify-center text-muted-foreground">
          <AlertTriangle className="h-6 w-6 mb-1" />
          <span className="text-xs">エラー</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              retry();
            }}
            className="text-xs"
          >
            再試行
          </Button>
        </div>
      ) : (
        <NextImage
          src={imageUrl || "/placeholder-face.png"}
          alt={`Face appearance from roster ${appearance.rosterId?.substring(0, 6) || 'unknown'}`}
          layout="fill"
          objectFit="cover"
          className="rounded-md"
          onError={() => {
            console.error('Image load error for:', imageUrl);
          }}
        />
      )}
      {isSelected && !disabled && (
        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center rounded-md">
          <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
        </div>
      )}
      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-sm">
        Roster: ...{appearance.rosterId?.slice(-6) || 'unknown'}
      </span>
    </Label>
  );
};

const EditPersonDialog: React.FC<EditPersonDialogProps> = ({
  personToEdit,
  allUserPeople,
  allUserConnections,
  isLoadingPeople,
  isLoadingConnections,
  isOpen,
  onOpenChange,
  onSave,
  isProcessing,
}) => {
  const { handleError } = useErrorHandler();
  
  // Async operation for form submission
  const saveOperation = useCallback(async (data: EditPersonFormData) => {
    if (!personToEdit?.id) {
      throw new AppError('Person ID is missing', ErrorType.VALIDATION);
    }
    await onSave(personToEdit.id, data);
  }, [onSave, personToEdit?.id]);

  const { execute: submitForm, isLoading: isSaving, error: saveError } = useAsyncOperation(saveOperation);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditPersonFormData>({
    resolver: zodResolver(editPersonSchema),
    defaultValues: {
      name: '',
      company: '',
      hobbies: '',
      birthday: '',
      firstMet: '',
      firstMetContext: '',
      notes: '',
      primaryFaceAppearancePath: null,
    },
  });

  // Get person's primary image with error handling
  const { imageUrl: primaryImageUrl, isLoading: isLoadingPrimaryImage, error: primaryImageError } = usePersonImage(personToEdit);

  // Handle form submission with proper error handling
  const onSubmit = useCallback(async (data: EditPersonFormData) => {
    try {
      await submitForm(data);
      onOpenChange(false);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Save failed'));
    }
  }, [submitForm, onOpenChange, handleError]);

  // Initialize form when person changes
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
        primaryFaceAppearancePath: personToEdit.primaryFaceAppearancePath || 
          personToEdit.faceAppearances?.[0]?.faceImageStoragePath || null,
      });
    }
  }, [personToEdit, isOpen, reset]);

  // Memoized face appearances
  const faceAppearances = useMemo(() => {
    return personToEdit?.faceAppearances || [];
  }, [personToEdit?.faceAppearances]);

  // Related connections with error-safe person lookup
  const relatedConnections = useMemo(() => {
    if (!personToEdit?.id || !allUserConnections || !allUserPeople) return [];
    
    return allUserConnections
      .filter(conn => 
        conn.fromPersonId === personToEdit.id || conn.toPersonId === personToEdit.id
      )
      .map(connection => {
        const otherPersonId = connection.fromPersonId === personToEdit.id 
          ? connection.toPersonId 
          : connection.fromPersonId;
        
        const otherPerson = allUserPeople.find(p => p.id === otherPersonId);
        
        return {
          connection,
          otherPerson: otherPerson || null, // Handle missing person gracefully
          direction: connection.fromPersonId === personToEdit.id ? 'outgoing' : 'incoming',
        };
      })
      .filter(item => item.otherPerson !== null); // Filter out broken connections
  }, [personToEdit?.id, allUserConnections, allUserPeople]);

  const overallIsProcessing = isProcessing || isSaving;

  // Field renderer with consistent styling
  const renderField = (
    fieldKey: keyof EditPersonFormData,
    label: string,
    icon: React.ComponentType<{ className?: string }>,
    isTextarea = false
  ) => {
    const Icon = icon;
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldKey} className="text-sm font-medium flex items-center">
          <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
          {label}
        </Label>
        {isTextarea ? (
          <Textarea
            id={fieldKey}
            {...register(fieldKey)}
            className="min-h-[60px]"
            disabled={overallIsProcessing}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        ) : (
          <Input
            id={fieldKey}
            {...register(fieldKey)}
            disabled={overallIsProcessing}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        )}
        {errors[fieldKey] && (
          <p className="text-xs text-destructive mt-1">{errors[fieldKey]?.message}</p>
        )}
      </div>
    );
  };

  if (!personToEdit) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl !max-h-[90vh] !flex !flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline text-xl flex items-center">
            <User className="mr-2 h-6 w-6 text-primary" />
            Edit Details for {personToEdit.name || 'Unknown Person'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto px-1 py-2 pr-3 -mr-2">
          <form onSubmit={handleSubmit(onSubmit)} id="edit-person-form">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              
              {/* Basic Information */}
              <div className="space-y-4 md:col-span-1">
                {renderField('name', 'Name*', User)}
                {renderField('company', 'Company', Building)}
                {renderField('hobbies', 'Hobbies', Smile, true)}
                {renderField('birthday', 'Birthday', CalendarDays)}
                {renderField('firstMet', 'First Met Date', CalendarDays)}
                {renderField('firstMetContext', 'First Met Context', Info, true)}
                {renderField('notes', 'Notes', FileText, true)}
              </div>

              {/* Main Display Photo */}
              <div className="space-y-4 md:col-span-1">
                <h3 className="text-lg font-semibold flex items-center text-primary">
                  <ImageIcon className="mr-2 h-5 w-5" />
                  Main Display Photo
                </h3>
                <Separator />
                
                {faceAppearances.length > 0 ? (
                  <Controller
                    control={control}
                    name="primaryFaceAppearancePath"
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue('primaryFaceAppearancePath', value, { shouldDirty: true });
                        }}
                        value={field.value || faceAppearances[0]?.faceImageStoragePath || ""}
                        className="space-y-2"
                        disabled={overallIsProcessing}
                      >
                        <ScrollArea className="max-h-[calc(90vh-250px)] pr-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {faceAppearances.map((appearance) => (
                              <FaceAppearanceImage
                                key={appearance.faceImageStoragePath}
                                appearance={appearance}
                                isSelected={field.value === appearance.faceImageStoragePath}
                                onSelect={() => {
                                  field.onChange(appearance.faceImageStoragePath);
                                  setValue('primaryFaceAppearancePath', appearance.faceImageStoragePath, { shouldDirty: true });
                                }}
                                disabled={overallIsProcessing}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </RadioGroup>
                    )}
                  />
                ) : isLoadingPeople ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No face images available for this person.
                  </p>
                )}
              </div>

              {/* Related People */}
              <div className="space-y-4 md:col-span-1">
                <h3 className="text-lg font-semibold flex items-center text-primary">
                  <User className="mr-2 h-5 w-5" />
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
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No connections found.
                  </p>
                ) : (
                  <ScrollArea className="max-h-[calc(90vh-250px)] pr-2">
                    <div className="space-y-3">
                      {relatedConnections.map(({ connection, otherPerson, direction }) => (
                        <Card key={connection.id} className="bg-muted/30 shadow-sm">
                          <CardContent className="p-3 space-y-1.5">
                            <div className="flex items-center space-x-2 mb-1">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={otherPerson?.primaryFaceAppearancePath || 
                                       otherPerson?.faceAppearances?.[0]?.faceImageStoragePath ||
                                       "/placeholder-avatar.png"}
                                  alt={otherPerson?.name || 'Person'}
                                />
                                <AvatarFallback>
                                  {otherPerson?.name?.substring(0, 1).toUpperCase() || 'P'}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-semibold text-foreground truncate" title={otherPerson?.name || 'Unknown Person'}>
                                {otherPerson?.name || 'Unknown Person'}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Types: {connection.types?.join(', ') || 'None'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Strength: {connection.strength || 'N/A'}/5
                            </p>
                            {connection.notes && (
                              <p className="text-xs text-muted-foreground truncate" title={connection.notes}>
                                Notes: {connection.notes}
                              </p>
                            )}
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

        <DialogFooter className="shrink-0 flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={overallIsProcessing}
            className="sm:mr-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-person-form"
            disabled={overallIsProcessing || !isDirty}
            className="flex items-center"
          >
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
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