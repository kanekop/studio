"use client";
import React, { useState } from 'react';
import type { Person } from '@/shared/types';
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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeletePersonDialogProps {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  connectionCount?: number;
}

const DeletePersonDialog: React.FC<DeletePersonDialogProps> = ({ 
  person, 
  isOpen, 
  onClose, 
  onConfirm,
  connectionCount = 0 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      toast({
        title: "Success",
        description: `${person.name} has been deleted.`
      });
      // No need to call onClose here, parent will handle it
    } catch (e: any) {
      console.error('Delete error:', e);
      toast({
        title: "Error",
        description: `Failed to delete the person: ${e.message || 'Unknown error'}`,
        variant: "destructive"
      });
      // Close the dialog on failure
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
            Are you sure you want to delete?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-3 py-2">
              <p>
                You are about to permanently delete <strong>{person.name}</strong>.
              </p>
              {connectionCount > 0 && (
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 rounded-md">
                  <p className="font-semibold text-orange-700 dark:text-orange-300">
                    ⚠️ This person has {connectionCount} connection(s). Deleting them will also remove all these relationships.
                  </p>
                </div>
              )}
              <p className="font-semibold text-destructive">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Yes, Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletePersonDialog;