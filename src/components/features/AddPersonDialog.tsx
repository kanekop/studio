"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserPlus, User, Building, Smile, CalendarDays, Info, FileText, Loader2 } from 'lucide-react';
import { PeopleService, CreatePersonData } from '@/domain/services/PeopleService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts';
import type { Person } from '@/shared/types';

const addPersonSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  company: z.string().optional(),
  hobbies: z.string().optional(),
  birthday: z.string().optional(),
  firstMet: z.string().optional(),
  firstMetContext: z.string().optional(),
  notes: z.string().optional(),
});

export type AddPersonFormData = z.infer<typeof addPersonSchema>;

interface AddPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (person: Person) => void;
}

const AddPersonDialog: React.FC<AddPersonDialogProps> = ({ 
  isOpen, 
  onClose, 
  onAdd 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPersonFormData>({
    resolver: zodResolver(addPersonSchema),
    defaultValues: {
      name: '',
      company: '',
      hobbies: '',
      birthday: '',
      firstMet: '',
      firstMetContext: '',
      notes: ''
    }
  });
  
  const handleAdd = async (data: AddPersonFormData) => {
    if (!currentUser?.uid) {
      toast({
        title: "エラー",
        description: "ログインが必要です",
        variant: "destructive"
      });
      return;
    }
    
    setIsAdding(true);
    try {
      const createData: CreatePersonData = {
        name: data.name,
        company: data.company,
        hobbies: data.hobbies,
        birthday: data.birthday,
        firstMet: data.firstMet,
        firstMetContext: data.firstMetContext,
        notes: data.notes,
        userId: currentUser.uid,
        faceAppearances: []
      };
      
      const newPerson = await PeopleService.createPerson(createData);
      onAdd(newPerson);
      
      toast({
        title: "追加完了",
        description: `${data.name}を追加しました`
      });
      
      reset();
      onClose();
    } catch (error) {
      console.error('Add person error:', error);
      toast({
        title: "エラー",
        description: "追加に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };
  
  const renderFieldChoice = (
    fieldKey: keyof AddPersonFormData,
    label: string,
    IconComponent?: React.ElementType,
    isTextArea: boolean = false
  ) => {
    return (
      <div>
        <Label htmlFor={fieldKey} className="flex items-center text-sm font-medium text-muted-foreground mb-1">
          {IconComponent && <IconComponent className="mr-1.5 h-4 w-4" />}{label}
        </Label>
        {isTextArea ? (
          <Textarea
            id={fieldKey}
            {...register(fieldKey as any)}
            className="min-h-[60px]"
            disabled={isAdding}
          />
        ) : (
          <Input
            id={fieldKey}
            {...register(fieldKey as any)}
            disabled={isAdding}
            type={fieldKey === 'birthday' || fieldKey === 'firstMet' ? 'date' : 'text'}
          />
        )}
        {errors[fieldKey] && (
          <p className="text-xs text-destructive mt-1">{errors[fieldKey]?.message}</p>
        )}
      </div>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="mr-2 h-6 w-6 text-primary" />
            新しい人物を追加
          </DialogTitle>
          <DialogDescription>
            顔写真なしで人物情報を登録できます。後から写真を追加することも可能です。
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleAdd)} id="add-person-form" className="space-y-4">
          {renderFieldChoice('name', '名前*', User)}
          {renderFieldChoice('company', '会社・所属', Building)}
          {renderFieldChoice('hobbies', '趣味', Smile, true)}
          
          <div className="grid grid-cols-2 gap-4">
            {renderFieldChoice('birthday', '誕生日', CalendarDays)}
            {renderFieldChoice('firstMet', '初対面の日', CalendarDays)}
          </div>
          
          {renderFieldChoice('firstMetContext', '初対面の文脈', Info, true)}
          {renderFieldChoice('notes', 'メモ', FileText, true)}
        </form>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isAdding}>
              キャンセル
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="add-person-form"
            disabled={isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                追加中...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                追加
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPersonDialog;