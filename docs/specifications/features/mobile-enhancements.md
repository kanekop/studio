# モバイル機能強化仕様書

## 概要

FaceRosterアプリケーションのモバイル体験を向上させるために実装された機能群の詳細仕様書です。

**実装日**: 2025年1月20日  
**対象**: Phase 2 モバイル対応改善

## 実装された機能

### 1. 長押しメニューシステム

#### 1.1 MobileLongPressMenuコンポーネント

**ファイル**: `/src/components/features/MobileLongPressMenu.tsx`

**主要機能**:
- **長押し検出**: 500ms の長押しでコンテキストメニュー表示
- **ハプティックフィードバック**: 振動によるフィードバック
- **タッチ移動キャンセル**: 10px以上の移動で長押し解除
- **デバイス判定**: モバイルデバイスでのみ動作

**技術実装**:
```typescript
// 長押し開始
const handleTouchStart = useCallback((e: React.TouchEvent) => {
  if (disabled || !isMobile()) return;
  
  const touch = e.touches[0];
  touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  
  const timer = setTimeout(() => {
    setIsLongPress(true);
    // ハプティックフィードバック
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, 500);

  setLongPressTimer(timer);
}, [disabled]);

// タッチ移動検出（長押しキャンセル）
const handleTouchMove = useCallback((e: React.TouchEvent) => {
  if (!touchStartRef.current) return;

  const touch = e.touches[0];
  const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
  const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

  // 10px以上移動したら長押しをキャンセル
  if (deltaX > 10 || deltaY > 10) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPress(false);
  }
}, [longPressTimer]);
```

#### 1.2 モバイル専用コネクション作成

**機能**:
- **人物選択ダイアログ**: スクロール可能な人物リスト
- **アバター表示**: 視認性を高める人物識別
- **会社情報表示**: 追加の識別情報
- **キャンセル機能**: 直感的な操作中断

**UI仕様**:
```typescript
<Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Link2 className="h-5 w-5" />
        コネクション作成
      </DialogTitle>
    </DialogHeader>
    
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-2 p-2">
        {availableConnections.map((targetPerson) => (
          <Button
            key={targetPerson.id}
            variant="ghost"
            className="w-full justify-start p-3 h-auto"
            onClick={() => handleConnectToPerson(targetPerson.id)}
          >
            <Avatar className="h-10 w-10 mr-3">
              <AvatarFallback>
                {targetPerson.name?.slice(0, 2) || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-medium">{targetPerson.name}</p>
              {targetPerson.company && (
                <p className="text-sm text-muted-foreground">
                  {targetPerson.company}
                </p>
              )}
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  </DialogContent>
</Dialog>
```

### 2. タッチターゲット最適化

#### 2.1 UIコンポーネントの改善

**最小サイズ基準**: 44px × 44px (Apple Human Interface Guidelines準拠)

**実装箇所**:
- **フォーム要素**: `h-11` (44px) の最小高さ
- **ボタン**: 適切なパディングとサイズ
- **チェックボックス**: `h-5 w-5` (20px) + パディング
- **タッチエリア**: `p-2 rounded-md hover:bg-muted/50` でタップ範囲拡大

#### 2.2 検索フィルターの最適化

**AdvancedPeopleSearchFilters の改善**:
```typescript
// 基本入力フィールド
<Input
  placeholder="名前を入力..."
  value={safeSearchParams.name || ''}
  onChange={(e) => updateSearchParams({ name: e.target.value || undefined })}
  className="pl-9 h-11" // タッチしやすい高さ
/>

// セレクトボックス
<SelectTrigger className="h-11">
  <Briefcase className="h-4 w-4 mr-2 shrink-0" />
  <SelectValue placeholder="会社を選択" />
</SelectTrigger>

// チェックボックス項目
<div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
  <Checkbox
    id={`hobby-${hobby}`}
    checked={(safeSearchParams.hobbies || []).includes(hobby)}
    onCheckedChange={() => toggleHobby(hobby)}
    className="h-5 w-5" // 大きなチェックボックス
  />
  <Label htmlFor={`hobby-${hobby}`} className="text-sm cursor-pointer flex-1 py-1">
    {hobby}
  </Label>
</div>
```

### 3. レスポンシブデザイン改善

#### 3.1 ブレークポイント最適化

**グリッドレイアウト**:
```css
/* 基本検索 */
.grid-cols-1.lg:grid-cols-2

/* 趣味・コネクションタイプフィルター */
.grid-cols-1.sm:grid-cols-2.lg:grid-cols-3

/* 日付範囲選択 */
.grid-cols-1.sm:grid-cols-2
```

#### 3.2 スペース効率化

**Collapsibleパネル**: 
- 詳細フィルターの折りたたみ表示
- 画面スペースの効率的利用
- 視覚的階層の明確化

### 4. デバイス判定とアダプティブUI

#### 4.1 モバイルデバイス検出

```typescript
const isMobile = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};
```

#### 4.2 デュアルモードUI

**デスクトップ**: ドロップダウンメニュー + ドラッグ&ドロップ  
**モバイル**: 長押しメニュー + タッチフレンドリーダイアログ

## アクセシビリティ対応

### 1. キーボードナビゲーション
- Tab キーによるフォーカス移動
- Enter/Space キーによる選択・実行
- Escape キーによるダイアログ閉じる

### 2. スクリーンリーダー対応
```typescript
<Button
  variant="ghost"
  size="icon"
  disabled={disabled}
  aria-label={`Edit ${person?.name || 'Unknown'}`}
  title={`Edit ${person?.name || 'Unknown'}`}
>
  <MoreVertical className="h-4 w-4" />
</Button>
```

### 3. 視覚的フィードバック
- ホバー状態の明確な表示
- フォーカス状態のアウトライン
- 選択状態の視覚的区別

## パフォーマンス考慮事項

### 1. イベントハンドリング最適化
- `useCallback` による関数メモ化
- 適切なクリーンアップ処理
- メモリリーク防止

### 2. 条件付きレンダリング
- モバイル専用機能の選択的表示
- 不要なDOM要素の削減

## テスト項目

### 1. 機能テスト
- [ ] 長押しメニューの正常動作
- [ ] ハプティックフィードバック
- [ ] タッチ移動キャンセル
- [ ] コネクション作成フロー

### 2. デバイステスト
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] 各種画面サイズでの表示確認
- [ ] タッチターゲットサイズの検証

### 3. アクセシビリティテスト
- [ ] VoiceOver での操作確認
- [ ] TalkBack での操作確認
- [ ] キーボードナビゲーション

## 今後の改善予定

### 短期改善
1. **スワイプジェスチャー**: 横スワイプによる操作
2. **プルツーリフレッシュ**: データ更新のジェスチャー
3. **バイブレーションパターン**: より豊富なハプティックフィードバック

### 中期改善
1. **PWA対応**: Service Worker、オフライン対応
2. **ショートカット**: ホーム画面へのアプリ追加
3. **ネイティブ風UI**: よりアプリライクな体験

## 関連ドキュメント

- [人物管理機能仕様書](./people-management.md)
- [関係性管理機能仕様書](./connection-management.md)
- [開発ロードマップ](../../development/roadmap.md)