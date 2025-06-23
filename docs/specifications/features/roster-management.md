# 名簿管理機能 UI/UX仕様書（改善版）

## 概要

画像をアップロードして名簿（ロスター）を作成・管理する機能です。画像内の顔を識別し、人物情報と紐付けます。ユーザビリティと効率性を重視した設計により、直感的で快適な操作体験を提供します。

## 機能要件

### 1. 名簿の作成

#### 1.1 画像アップロード
- ドラッグ&ドロップまたはファイル選択
- 対応形式: JPEG, PNG, WebP, HEIC
- 最大サイズ: 10MB
- 複数ファイルの同時アップロード対応
- **NEW: アップロード時のプレビュー表示**
- **NEW: 画像の自動最適化（品質維持しつつファイルサイズ削減）**

#### 1.2 名簿情報の設定
- 名簿名（必須、後から編集可能）
- 説明（任意）
- タグ（任意、複数可）
- 日付（撮影日やイベント日）
- **NEW: 画像メタデータの自動取得**
  - 撮影日時（EXIF情報から）
  - 撮影場所（GPS情報から）
  - カメラ情報（任意表示）

### 2. 顔識別と人物紐付け

#### 2.1 顔領域の検出
- 自動顔検出（将来実装）
- 手動での顔領域選択
- 顔領域の調整機能
- **NEW: ピンチ操作によるズーム機能**
- **NEW: 画面サイズに最適化された画像表示**

#### 2.2 人物の紐付け
- 既存人物から選択
- 新規人物として登録
- 未登録のまま保留
- **NEW: 類似人物の自動提案**
- **NEW: 最近選択した人物の優先表示**

### 3. 名簿の管理

#### 3.1 一覧表示
- **NEW: サムネイル付きカード表示（デフォルト）**
- リスト表示（コンパクト）
- グリッド表示（ビジュアル重視）
- 作成日時/更新日時/名前でソート
- **NEW: フィルタリング機能（タグ、日付範囲、人数）**

#### 3.2 編集・削除
- 名簿情報のインライン編集
- 人物紐付けの変更
- 名簿の削除（確認付き）
- **NEW: 編集履歴の保存**
- **NEW: 一括操作機能**

### 4. データ管理

#### 4.1 メタデータ構造
```typescript
interface RosterMetadata {
  // 既存フィールド
  id: string;
  rosterName: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  
  // 新規フィールド
  imageMetadata?: {
    capturedAt?: Date;      // EXIF撮影日時
    location?: {            // GPS情報
      latitude: number;
      longitude: number;
      placeName?: string;   // 逆ジオコーディング結果
    };
    cameraInfo?: {          // カメラ情報
      make?: string;
      model?: string;
    };
  };
  thumbnailUrl?: string;    // サムネイル画像URL
  peopleCount: number;      // 登録人数（キャッシュ用）
  lastEditedBy?: string;    // 最終編集者
}
```

## UI/UX設計

### ホーム画面の名簿リスト

```
┌─────────────────────────────────────────────┐
│  📸 Rosters                    [+ 新規作成]  │
│                                             │
│  🔍 検索...        📅 期間 ▼  🏷️ タグ ▼   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [サムネイル] 営業会議 2025/01        │   │
│  │             12人 • 東京オフィス       │   │
│  │             ✏️ 📍 🗑️                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [サムネイル] 忘年会 2024/12          │   │
│  │             45人 • 品川レストラン     │   │
│  │             ✏️ 📍 🗑️                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  表示: [カード] [リスト] [グリッド]        │
└─────────────────────────────────────────────┘
```

### 名簿名の編集UI

```typescript
// インライン編集コンポーネント
<div className="roster-title-container">
  {isEditing ? (
    <input
      type="text"
      value={rosterName}
      onChange={(e) => setRosterName(e.target.value)}
      onBlur={handleSave}
      onKeyPress={(e) => e.key === 'Enter' && handleSave()}
      className="roster-title-input"
      autoFocus
    />
  ) : (
    <h2 
      className="roster-title editable"
      onClick={() => setIsEditing(true)}
    >
      {rosterName}
      <EditIcon className="edit-icon" />
    </h2>
  )}
</div>
```

### 画像表示の最適化

```
┌─────────────────────────────────────────────┐
│  顔を識別                          [完了]   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │     [自動リサイズされた画像]        │   │
│  │     （画面サイズに最適化）          │   │
│  │                                     │   │
│  │     📍 顔領域をクリックして選択     │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🔍 ズーム: [－][スライダー][＋] 100%      │
│                                             │
│  識別済み: 3人 | 未識別: 2人               │
│                                             │
│  📍 撮影: 2025/01/15 14:30                 │
│  📌 場所: 東京都港区虎ノ門                 │
└─────────────────────────────────────────────┘
```

### サムネイル生成と表示

#### サムネイル生成戦略
1. **アップロード時に生成**
   - 元画像から200x200pxのサムネイルを生成
   - WebP形式で保存（高圧縮率）
   - Cloud Storageの別フォルダに保存

2. **遅延読み込み**
   ```typescript
   // Intersection Observer APIを使用
   const [isVisible, setIsVisible] = useState(false);
   const imgRef = useRef<HTMLImageElement>(null);
   
   useEffect(() => {
     const observer = new IntersectionObserver(
       ([entry]) => setIsVisible(entry.isIntersecting),
       { threshold: 0.1 }
     );
     
     if (imgRef.current) {
       observer.observe(imgRef.current);
     }
     
     return () => observer.disconnect();
   }, []);
   ```

3. **プレースホルダー表示**
   - Skeleton UIで読み込み中を表現
   - BlurHashによるプレビュー（オプション）

## インタラクションデザイン

### 1. プログレッシブディスクロージャー
- 基本情報を最初に表示
- 詳細情報は必要に応じて展開
- メタデータは折りたたみ可能

### 2. 最適化されたワークフロー
```
画像アップロード
    ↓
自動メタデータ抽出
    ↓
画面サイズに最適化して表示
    ↓
顔領域の選択（ズーム可能）
    ↓
人物の紐付け（サジェスト付き）
    ↓
保存（サムネイル自動生成）
```

### 3. エラーハンドリング
- 画像読み込みエラー時のフォールバック
- ネットワークエラー時の再試行
- 部分的な失敗の許容（一部の顔だけ保存等）

## パフォーマンス最適化

### 1. 画像処理
- **クライアントサイドリサイズ**: Canvas APIを使用
- **プログレッシブJPEG**: 段階的な画像表示
- **画像キャッシュ**: Service Workerによるキャッシュ

### 2. リスト表示
- **仮想スクロール**: 大量の名簿でもスムーズ
- **ページネーション**: 代替オプション
- **インクリメンタルローディング**: 順次読み込み

### 3. サムネイル最適化
```typescript
// サムネイル生成関数
async function generateThumbnail(file: File): Promise<Blob> {
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      // アスペクト比を保持してリサイズ
      const size = 200;
      const scale = Math.min(size / img.width, size / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed')),
        'image/webp',
        0.8
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
}
```

## アクセシビリティ

### 1. キーボード操作
- Tab: フォーカス移動
- Enter: 選択/編集モード
- Esc: 編集キャンセル
- 矢印キー: リスト内移動

### 2. スクリーンリーダー対応
- 適切なARIAラベル
- 画像の代替テキスト
- 状態変更の通知

### 3. レスポンシブデザイン
- モバイル: シングルカラムレイアウト
- タブレット: 2カラムグリッド
- デスクトップ: 3-4カラムグリッド

## セキュリティとプライバシー

### 1. データ保護
- 画像の暗号化保存
- アクセス権限の管理
- 共有設定の細分化

### 2. プライバシー配慮
- 顔識別データの匿名化オプション
- EXIF情報の選択的削除
- 位置情報の精度調整

## 今後の拡張予定

### Phase 1（短期）
- ✅ 名簿名の編集機能
- ✅ メタデータ自動取得
- ✅ サムネイル表示
- ✅ 画像の適応的リサイズ

### Phase 2（中期）
- AI顔認識の実装
- バッチ処理機能
- 高度な検索機能
- 共有・コラボレーション機能

### Phase 3（長期）
- 動画からの顔抽出
- 3D顔認識
- AR表示機能
- 外部サービス連携