# FaceRoster 基本UX改善計画書

## 概要
FaceRosterの基本的なユーザー体験（UX）を改善するための実装計画書です。現在の最大の問題である「Peopleページで人物情報を編集できない」という根本的な問題を解決し、期待通りに動作するアプリケーションにすることを目的とします。

## 現在の根本的な問題

### 🔴 最重要問題：データ編集フローの破綻
- **Peopleページで人物情報を編集できない**（編集ボタンがあるのに機能しない）
- Roster画面に戻らないと編集できない
- ユーザーの期待と実際の動作が完全に乖離している

## 基本的UX改善の実装計画

### 1. 人物情報編集の即時対応 🔧

#### 1.1 EditPersonDialogの完全実装

```typescript
// src/components/features/EditPersonDialog.tsx の修正

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditPersonFormData {
  name: string;
  company?: string;
  hobbies?: string;
  birthday?: string;
  firstMet?: string;
  firstMetContext?: string;
  notes?: string;
}

const EditPersonDialog = ({ 
  person, 
  isOpen, 
  onClose,
  onUpdate // 親コンポーネントのステート更新用
}: EditPersonDialogProps) => {
  const [formData, setFormData] = useState<EditPersonFormData>({
    name: person.name || '',
    company: person.company || '',
    hobbies: person.hobbies || '',
    birthday: person.birthday || '',
    firstMet: person.firstMet || '',
    firstMetContext: person.firstMetContext || '',
    notes: person.notes || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    // バリデーション
    if (!formData.name.trim()) {
      toast({
        title: "エラー",
        description: "名前は必須です",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Firestoreに直接更新
      await updateDoc(doc(db, 'people', person.id), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      
      // 親コンポーネントのステートも更新
      if (onUpdate) {
        onUpdate(person.id, formData);
      }
      
      toast({
        title: "更新完了",
        description: "人物情報を更新しました"
      });
      
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "エラー",
        description: "更新に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>人物情報を編集</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 基本情報 */}
          <div>
            <Label htmlFor="name">名前 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="山田 太郎"
              disabled={isSaving}
            />
          </div>
          
          <div>
            <Label htmlFor="company">会社・所属</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              placeholder="株式会社ABC"
              disabled={isSaving}
            />
          </div>
          
          <div>
            <Label htmlFor="hobbies">趣味</Label>
            <Input
              id="hobbies"
              value={formData.hobbies}
              onChange={(e) => setFormData({...formData, hobbies: e.target.value})}
              placeholder="ゴルフ、読書"
              disabled={isSaving}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthday">誕生日</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                disabled={isSaving}
              />
            </div>
            
            <div>
              <Label htmlFor="firstMet">初対面の日</Label>
              <Input
                id="firstMet"
                type="date"
                value={formData.firstMet}
                onChange={(e) => setFormData({...formData, firstMet: e.target.value})}
                disabled={isSaving}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="firstMetContext">初対面の文脈</Label>
            <Input
              id="firstMetContext"
              value={formData.firstMetContext}
              onChange={(e) => setFormData({...formData, firstMetContext: e.target.value})}
              placeholder="新年会で紹介された"
              disabled={isSaving}
            />
          </div>
          
          <div>
            <Label htmlFor="notes">メモ</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="その他の情報..."
              rows={3}
              disabled={isSaving}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              '保存'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

#### 1.2 PeopleListItemの修正

```typescript
// src/components/features/PeopleListItem.tsx の修正

const PeopleListItem = ({ person, onEditClick, ... }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleEdit = () => {
    onEditClick(person); // 親コンポーネントに編集要求を伝える
  };
  
  const handleDelete = async () => {
    // 削除処理（後述）
  };
  
  return (
    <Card>
      {/* カードヘッダー */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              編集
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* 既存のカード内容 */}
      {/* ... */}
    </Card>
  );
};
```

### 2. データの一貫性確保 🔄

#### 2.1 統一されたPeopleサービス

```typescript
// src/services/peopleService.ts

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export class PeopleService {
  static async createPerson(data: CreatePersonData): Promise<Person> {
    const docRef = await addDoc(collection(db, 'people'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...data
    } as Person;
  }
  
  static async updatePerson(id: string, data: Partial<Person>): Promise<void> {
    await updateDoc(doc(db, 'people', id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  static async deletePerson(id: string): Promise<void> {
    // 関連するコネクションも削除
    const connectionsQuery = query(
      collection(db, 'connections'),
      where('fromPersonId', '==', id)
    );
    const connectionsQuery2 = query(
      collection(db, 'connections'),
      where('toPersonId', '==', id)
    );
    
    const [connections1, connections2] = await Promise.all([
      getDocs(connectionsQuery),
      getDocs(connectionsQuery2)
    ]);
    
    const deletePromises = [
      ...connections1.docs.map(doc => deleteDoc(doc.ref)),
      ...connections2.docs.map(doc => deleteDoc(doc.ref)),
      deleteDoc(doc(db, 'people', id))
    ];
    
    await Promise.all(deletePromises);
  }
  
  static async getPerson(id: string): Promise<Person | null> {
    const docSnap = await getDoc(doc(db, 'people', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Person;
    }
    return null;
  }
}
```

### 3. 削除機能の実装 🗑️

#### 3.1 削除確認ダイアログ

```typescript
// src/components/features/DeletePersonDialog.tsx

interface DeletePersonDialogProps {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  connectionCount?: number;
}

const DeletePersonDialog = ({ 
  person, 
  isOpen, 
  onClose, 
  onConfirm,
  connectionCount = 0 
}: DeletePersonDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      toast({
        title: "削除完了",
        description: `${person.name}を削除しました`
      });
      onClose();
    } catch (error) {
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
          <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
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
            className="bg-red-600 hover:bg-red-700"
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
```

### 4. 新規追加フローの改善 ➕

#### 4.1 AddPersonDialog

```typescript
// src/components/features/AddPersonDialog.tsx

interface AddPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (person: Person) => void;
}

const AddPersonDialog = ({ isOpen, onClose, onAdd }: AddPersonDialogProps) => {
  const [formData, setFormData] = useState<CreatePersonData>({
    name: '',
    company: '',
    hobbies: '',
    birthday: '',
    firstMet: '',
    firstMetContext: '',
    notes: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "エラー",
        description: "名前は必須です",
        variant: "destructive"
      });
      return;
    }
    
    setIsAdding(true);
    try {
      const newPerson = await PeopleService.createPerson(formData);
      onAdd(newPerson);
      toast({
        title: "追加完了",
        description: `${formData.name}を追加しました`
      });
      onClose();
    } catch (error) {
      toast({
        title: "エラー",
        description: "追加に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新しい人物を追加</DialogTitle>
          <DialogDescription>
            顔写真なしで人物情報を登録できます。後から写真を追加することも可能です。
          </DialogDescription>
        </DialogHeader>
        
        {/* EditPersonDialogと同じフォームフィールド */}
        {/* ... */}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAdding}>
            キャンセル
          </Button>
          <Button onClick={handleAdd} disabled={isAdding}>
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
```

### 5. Peopleページの統合 📄

#### 5.1 ページコンポーネントの修正

```typescript
// src/app/(main)/people/page.tsx の修正

const PeoplePage = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  
  // 人物リストの取得
  useEffect(() => {
    const fetchPeople = async () => {
      // Firestoreから取得
      const peopleData = await PeopleService.getAllPeople();
      setPeople(peopleData);
    };
    fetchPeople();
  }, []);
  
  // 編集処理
  const handleEditClick = (person: Person) => {
    setSelectedPerson(person);
    setShowEditDialog(true);
  };
  
  // 更新処理
  const handleUpdate = (personId: string, updates: Partial<Person>) => {
    setPeople(prev => 
      prev.map(p => p.id === personId ? { ...p, ...updates } : p)
    );
  };
  
  // 追加処理
  const handleAdd = (newPerson: Person) => {
    setPeople(prev => [...prev, newPerson]);
  };
  
  // 削除処理
  const handleDelete = async (person: Person) => {
    await PeopleService.deletePerson(person.id);
    setPeople(prev => prev.filter(p => p.id !== person.id));
    setPersonToDelete(null);
  };
  
  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">People</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          新しい人物を追加
        </Button>
      </div>
      
      {/* 検索・フィルター */}
      <PeopleSearchFilters />
      
      {/* 人物リスト */}
      <PeopleList
        people={people}
        onEditClick={handleEditClick}
        onDeleteClick={setPersonToDelete}
      />
      
      {/* ダイアログ */}
      {selectedPerson && (
        <EditPersonDialog
          person={selectedPerson}
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedPerson(null);
          }}
          onUpdate={handleUpdate}
        />
      )}
      
      <AddPersonDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAdd}
      />
      
      {personToDelete && (
        <DeletePersonDialog
          person={personToDelete}
          isOpen={!!personToDelete}
          onClose={() => setPersonToDelete(null)}
          onConfirm={() => handleDelete(personToDelete)}
          connectionCount={getConnectionCount(personToDelete.id)}
        />
      )}
    </div>
  );
};
```

## 実装優先順位

### 🔴 今すぐ修正すべき（1-2日）

1. **EditPersonDialogの修正**
   - Peopleページから編集可能に
   - Firestoreへの直接保存実装
   
2. **PeopleServiceの作成**
   - 統一されたCRUD操作
   - エラーハンドリング

### 🟠 次に修正（3-5日）

3. **削除機能の実装**
   - 削除確認ダイアログ
   - 関連データの削除

4. **新規追加フロー**
   - AddPersonDialog実装
   - 顔写真なしでの登録対応

### 🟡 その後の改善（1週間）

5. **フィードバック改善**
   - 全操作へのトースト通知
   - ローディング状態の統一

6. **データ同期**
   - リアルタイム更新
   - オプティミスティック更新

## 成功指標

- ✅ 編集ボタンを押したら即座に編集できる
- ✅ 全ての変更が確実に保存される
- ✅ 削除機能が安全に動作する
- ✅ どのページからでも同じデータが見える
- ✅ 操作結果が明確にフィードバックされる

## まとめ

これらの基本的な改善により、FaceRosterは「期待通りに動作する」アプリケーションになります。まずは最も基本的な「編集機能」から着手し、段階的に改善を進めていきます。派手な機能よりも、確実に動作する基本機能の実装を優先します。