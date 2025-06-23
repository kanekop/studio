import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ImageSet } from '@/shared/types';

interface DeleteRosterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roster: ImageSet | null;
  onConfirm: () => void;
}

export const DeleteRosterDialog: React.FC<DeleteRosterDialogProps> = ({
  isOpen,
  onOpenChange,
  roster,
  onConfirm,
}) => {
  if (!roster) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>名簿を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{roster.rosterName}」を削除します。この操作は取り消せません。
            <br />
            名簿に含まれる{roster.peopleIds?.length || 0}人の情報は削除されませんが、
            この名簿との関連付けは失われます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            削除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};