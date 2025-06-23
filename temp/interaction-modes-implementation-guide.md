# 人物インタラクションモード実装ガイド

## 1. 実装概要

このガイドは「人物インタラクションモード仕様書」の具体的な実装方法を説明します。

**実装時間目安**: 4-6時間

## 2. ファイル変更一覧

```
src/
├── app/(main)/people/
│   └── page.tsx                    # 状態追加
├── components/features/
│   ├── InteractionModeToggle.tsx   # 新規作成
│   ├── PeopleList.tsx             # props追加
│   └── PeopleListItem.tsx         # ドロップ処理修正
└── hooks/
    └── useDragHandlers.ts         # モード対応
```

## 3. 実装手順

### Step 1: モード切り替えコンポーネントの作成

**ファイル**: `src/components/features/InteractionModeToggle.tsx`

```typescript
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Users, GitMerge } from 'lucide-react';

interface InteractionModeToggleProps {
  mode: 'connect' | 'merge';
  onModeChange: (mode: 'connect' | 'merge') => void;
  disabled?: boolean;
}

export const InteractionModeToggle: React.FC<InteractionModeToggleProps> = ({
  mode,
  onModeChange,
  disabled = false
}) => {
  return (
    <ToggleGroup 
      type="single" 
      value={mode}
      onValueChange={(value) => value && onModeChange(value as 'connect' | 'merge')}
      disabled={disabled}
      className="bg-background"
    >
      <ToggleGroupItem 
        value="connect" 
        aria-label="Connect mode"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Users className="h-4 w-4 mr-2" />
        Connect
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="merge" 
        aria-label="Merge mode"
        className="data-[state=on]:bg-purple-600 data-[state=on]:text-white"
      >
        <GitMerge className="h-4 w-4 mr-2" />
        Merge
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
```

### Step 2: ManagePeoplePage への状態追加

**ファイル**: `src/app/(main)/people/page.tsx`

```typescript
// 既存のimportに追加
import { InteractionModeToggle } from '@/components/features/InteractionModeToggle';

// コンポーネント内に追加
const [interactionMode, setInteractionMode] = useState<'connect' | 'merge'>('connect');

// handleInitiateConnection を修正
const handleInitiateConnection = (sourcePersonId: string, targetPersonId: string) => {
  if (interactionMode === 'merge') {
    // マージ処理
    const sourcePerson = allUserPeople?.find(p => p.id === sourcePersonId);
    const targetPerson = allUserPeople?.find(p => p.id === targetPersonId);
    
    if (sourcePerson && targetPerson) {
      setGloballySelectedPeopleForMerge([sourcePersonId, targetPersonId]);
      // MergePeopleDialog が自動的に開く（既存の実装を利用）
    }
  } else {
    // 既存のコネクション作成処理
    const sourcePerson = allUserPeople?.find(p => p.id === sourcePersonId);
    const targetPerson = allUserPeople?.find(p => p.id === targetPersonId);
    
    if (sourcePerson && targetPerson) {
      setSourcePersonForConnection(sourcePerson);
      setTargetPersonForConnection(targetPerson);
      setIsCreateConnectionDialogOpen(true);
    }
  }
};

// JSX内、検索バーとソートの間に追加
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
  <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
    <Users className="inline-block mr-3 h-8 w-8" />
    Manage People
  </h1>
  
  <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
    {/* 新規追加 */}
    <InteractionModeToggle
      mode={interactionMode}
      onModeChange={setInteractionMode}
      disabled={generalActionDisabled}
    />
    
    {/* 既存のSearchとSort */}
    <div className="flex-1 sm:flex-initial">
      <PeopleSearchFilters ... />
    </div>
    <Select ... />
  </div>
</div>

// PeopleList に props 追加
<PeopleList
  people={sortedAndFilteredPeople}
  onEditClick={handleEditClick}
  onInitiateConnection={handleInitiateConnection}
  interactionMode={interactionMode}  // 追加
  // ... 他のprops
/>
```

### Step 3: Mergeモード時の視覚的フィードバック

**ファイル**: `src/app/(main)/people/page.tsx` の return 文を修正

```typescript
return (
  <div className={cn(
    "container mx-auto py-8 px-4 min-h-screen",
    interactionMode === 'merge' && "bg-purple-50/30"
  )}>
    {/* 既存のコンテンツ */}
  </div>
);
```

### Step 4: PeopleList への props 伝達

**ファイル**: `src/components/features/PeopleList.tsx`

```typescript
interface PeopleListProps {
  // 既存のprops
  interactionMode?: 'connect' | 'merge';
}

// 各 PeopleListItem に伝達
<PeopleListItem
  key={person.id}
  person={person}
  interactionMode={interactionMode}  // 追加
  // ... 他のprops
/>
```

### Step 5: PeopleListItem のドラッグ視覚効果

**ファイル**: `src/components/features/PeopleListItem.tsx`

```typescript
interface PeopleListItemProps {
  // 既存のprops
  interactionMode?: 'connect' | 'merge';
}

// ドラッグ時のクラス名を修正
className={cn(
  // 既存のクラス
  isBeingDraggedOver && !isBeingDragged && interactionMode === 'merge' && 
    "ring-2 ring-offset-2 ring-purple-500 border-purple-500 scale-105 bg-purple-500/10",
  isBeingDraggedOver && !isBeingDragged && interactionMode !== 'merge' && 
    "ring-2 ring-offset-2 ring-green-500 border-green-500 scale-105 bg-green-500/10"
)}
```

### Step 6: useDragHandlers の拡張（オプション）

**ファイル**: `src/hooks/useDragHandlers.ts`

```typescript
interface DragHandlerOptions {
  // 既存のoptions
  interactionMode?: 'connect' | 'merge';
}

// ドラッグデータに含める
const handleDragStart = (e: React.DragEvent) => {
  e.dataTransfer.setData('sourcePersonId', data.sourcePersonId);
  e.dataTransfer.setData('interactionMode', options.interactionMode || 'connect');
  // 既存の処理
};
```

## 4. スタイリング詳細

### Tailwind クラス一覧

```css
/* Connect モード（デフォルト） */
.data-[state=on]:bg-primary        /* ボタンアクティブ時 */
.ring-green-500                     /* ドロップターゲット */
.border-green-500
.bg-green-500/10

/* Merge モード */
.data-[state=on]:bg-purple-600      /* ボタンアクティブ時 */
.bg-purple-50/30                    /* 背景オーバーレイ */
.ring-purple-500                    /* ドロップターゲット */
.border-purple-500
.bg-purple-500/10
```

## 5. 動作確認チェックリスト

- [ ] モード切り替えボタンが表示される
- [ ] デフォルトで Connect モードが選択されている
- [ ] Merge モードで背景色が変わる
- [ ] Connect モードでドラッグ&ドロップ → コネクション作成ダイアログ
- [ ] Merge モードでドラッグ&ドロップ → マージダイアログ
- [ ] ドロップ時のハイライト色がモードで異なる
- [ ] モバイル表示でも正常に動作

## 6. エラーハンドリング

```typescript
// handleInitiateConnection 内
if (!sourcePerson || !targetPerson) {
  toast({
    title: "エラー",
    description: "人物の選択に失敗しました",
    variant: "destructive"
  });
  return;
}

// 同一人物チェック（既存）
if (sourcePersonId === targetPersonId) {
  return;
}
```

## 7. デバッグ用ログ

開発時のデバッグ用：

```typescript
// handleInitiateConnection の先頭
console.log('Interaction mode:', interactionMode);
console.log('Source:', sourcePersonId, 'Target:', targetPersonId);
```

## 8. 注意事項

1. **既存機能への影響を最小化**
   - デフォルトは Connect モードなので、既存の動作は変わらない
   - 条件分岐で処理を分ける

2. **状態の同期**
   - マージ完了後も Merge モードのまま（連続操作可能）
   - ページ遷移時はリセット

3. **パフォーマンス**
   - モード切り替えによる全体再レンダリングは発生しない
   - 必要な部分のみ更新

## 9. テスト項目

```typescript
// 手動テストシナリオ
1. ページ読み込み → Connect がデフォルト選択
2. Merge クリック → 背景色変化
3. ドラッグ&ドロップ → マージダイアログ表示
4. Connect クリック → 通常に戻る
5. ドラッグ&ドロップ → コネクションダイアログ表示
```

---

実装で不明な点があれば、既存の実装を参考にするか、質問してください。