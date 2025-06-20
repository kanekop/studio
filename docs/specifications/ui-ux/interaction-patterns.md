# インタラクションパターン

## 概要

FaceRosterで使用される標準的なインタラクションパターンを定義します。

## ダイアログ管理

### 階層的ダイアログ
- 親ダイアログから子ダイアログを開く場合の制御
- 状態管理は`useDialogManager`フックで一元化
- z-indexの適切な管理

### ダイアログの開閉
```typescript
// 開く
const handleOpen = () => {
  setIsOpen(true);
};

// 閉じる（Escape、オーバーレイクリック、×ボタン）
const handleClose = () => {
  if (hasUnsavedChanges) {
    showConfirmDialog();
  } else {
    setIsOpen(false);
  }
};
```

## ドラッグ&ドロップ

### 基本パターン
1. **ドラッグ開始**: 要素が半透明化
2. **ドラッグ中**: ドロップ可能エリアをハイライト
3. **ドロップ**: アクションを実行
4. **キャンセル**: ESCキーまたは無効エリアへのドロップ

### イベント処理
```typescript
// ドラッグ開始
const handleDragStart = (e: DragEvent) => {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', itemId);
  setIsDragging(true);
};

// ドロップ
const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  const itemId = e.dataTransfer.getData('text/plain');
  performAction(itemId);
};
```

## クリックイベント

### イベント伝播の制御
```typescript
// 子要素のクリックが親に伝播しないようにする
const handleChildClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  // 子要素固有の処理
};

// 親要素のクリック
const handleParentClick = () => {
  // ドラッグ中でなければ実行
  if (!isDragging) {
    openDialog();
  }
};
```

## フォーム操作

### 自動保存
- 入力後3秒で自動保存
- 保存中はインジケーター表示
- エラー時は即座にフィードバック

### バリデーション
- リアルタイムバリデーション
- フォーカスアウト時の検証
- エラーメッセージの表示位置

## ローディング状態

### スケルトンスクリーン
```tsx
{isLoading ? (
  <div className="space-y-4">
    <Skeleton className="h-32 w-32" />
    <Skeleton className="h-4 w-24" />
  </div>
) : (
  <ActualContent />
)}
```

### プログレスインジケーター
- ファイルアップロード
- 長時間処理
- バックグラウンドタスク

## エラーハンドリング

### トースト通知
```typescript
// 成功
toast.success("保存しました");

// エラー
toast.error("保存に失敗しました");

// 警告
toast.warning("接続が不安定です");
```

### エラー境界
- コンポーネントレベルでのエラーキャッチ
- フォールバックUIの表示
- エラーレポートの送信

## キーボードショートカット

### グローバルショートカット
- `Ctrl/Cmd + S`: 保存
- `Ctrl/Cmd + F`: 検索
- `Escape`: ダイアログを閉じる

### コンテキストショートカット
- `Enter`: 選択項目を開く
- `Delete`: 選択項目を削除
- `Space`: 選択/選択解除

## アニメーション

### 基本原則
- 目的を持ったアニメーション
- 一貫性のあるイージング関数
- パフォーマンスを考慮した実装

### 実装例
```css
/* フェードイン */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* スライドイン */
@keyframes slideIn {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

## レスポンシブ対応

### ブレークポイント
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### タッチ操作
- タップ: クリックと同等
- 長押し: コンテキストメニュー
- スワイプ: ナビゲーション（将来実装）

## アクセシビリティ

### ARIAラベル
```tsx
<button
  aria-label="人物情報を編集"
  aria-pressed={isSelected}
  role="button"
>
  編集
</button>
```

### フォーカス管理
- 論理的なタブ順序
- モーダル内でのフォーカストラップ
- 視覚的なフォーカスインジケーター 