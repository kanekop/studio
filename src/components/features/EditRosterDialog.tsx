import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageSet } from '@/shared/types';
import { FirebaseRosterRepository } from '@/infrastructure/firebase/repositories/FirebaseRosterRepository';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditRosterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roster: ImageSet | null;
  onUpdate?: (updatedRoster: ImageSet) => void;
}

export const EditRosterDialog: React.FC<EditRosterDialogProps> = ({
  isOpen,
  onOpenChange,
  roster,
  onUpdate,
}) => {
  const [rosterName, setRosterName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { toast } = useToast();
  const repository = new FirebaseRosterRepository();

  useEffect(() => {
    if (roster) {
      setRosterName(roster.rosterName || '');
      setDescription(roster.description || '');
      setTags(roster.tags?.join(', ') || '');
    }
  }, [roster]);

  const handleUpdate = async () => {
    if (!roster) return;

    try {
      setIsUpdating(true);

      const updates: Partial<ImageSet> = {
        rosterName: rosterName.trim(),
        description: description.trim(),
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      };

      const updatedRoster = await repository.updateRosterAndReturn(roster.id, updates);

      toast({
        title: '更新完了',
        description: '名簿を更新しました',
      });

      if (onUpdate) {
        onUpdate(updatedRoster);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update roster:', error);
      toast({
        title: 'エラー',
        description: '名簿の更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>名簿を編集</DialogTitle>
          <DialogDescription>
            名簿の情報を編集できます
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="roster-name">名簿名</Label>
            <Input
              id="roster-name"
              value={rosterName}
              onChange={(e) => setRosterName(e.target.value)}
              placeholder="例：営業会議 2025/01"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="この名簿についての説明を入力..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">タグ（カンマ区切り）</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例：会議, 営業部, 2025年"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            キャンセル
          </Button>
          <Button onClick={handleUpdate} disabled={!rosterName.trim() || isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};