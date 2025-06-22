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
import { PeopleService } from '@/domain/services/PeopleService';
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
      // Delete from Firestore directly
      await PeopleService.deletePerson(person.id);
      
      // Call the onConfirm callback for parent state update
      await onConfirm();
      
      toast({
        title: "削除完了",
        description: `${person.name}を削除しました`
      });
      
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "エラー",
        description: "削除に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
            本当に削除しますか？
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-2">
              <p>
                <strong>{person.name}</strong> を削除しようとしています。
              </p>
              {connectionCount > 0 && (
                <p className="text-orange-600">
                  ⚠️ この人物には {connectionCount} 件の関係性が登録されています。
                  削除すると、これらの関係性も全て削除されます。
                </p>
              )}
              <p className="text-red-600 font-semibold">
                この操作は取り消すことができません。
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                削除中...
              </>
            ) : (
              '削除する'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletePersonDialog;