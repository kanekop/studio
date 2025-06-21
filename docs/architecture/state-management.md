# 状態管理アーキテクチャ

## 概要

FaceRosterでは、React Context APIを使用した統一的な状態管理を採用しています。2025年6月の大規模リファクタリングにより、分散していたコンテキストを`FaceRosterContext`に統合し、中央集権的な状態管理を実現しました。

## アーキテクチャの変遷

### 統合前（〜2025年6月）
- **ImageContext**: 画像アップロード、描画領域管理
- **RosterContext**: ロスター作成、編集機能
- **FaceRosterContext**: 部分的な機能のみ

各コンテキストが独立して存在し、機能が重複していました。

### 統合後（2025年6月〜）
- **FaceRosterContext**: すべての機能を統合した中央状態管理
  - 画像管理（アップロード、表示、サイズ）
  - 領域描画（顔領域の選択、スケーリング）
  - ロスター管理（作成、編集、削除）
  - 人物管理（選択、詳細更新）

## 統合されたFaceRosterContext

### 管理する状態

```typescript
interface FaceRosterContextType {
  // ユーザー認証
  currentUser: FirebaseUser | null;
  
  // ロスター管理
  roster: EditablePersonInContext[];
  selectedPersonId: string | null;
  currentRosterDocId: string | null;
  userRosters: ImageSet[];
  
  // 画像管理（統合された機能）
  imageDataUrl: string | null;
  originalImageStoragePath: string | null;
  originalImageSize: { width: number; height: number } | null;
  drawnRegions: Region[];
  
  // UI状態
  isLoading: boolean;
  isProcessing: boolean;
  isLoadingUserRosters: boolean;
  
  // メソッド群...
}
```

### 主要メソッド

#### 画像管理（ImageContextから統合）
- `handleImageUpload(file: File)`: 画像のアップロード処理
- `addDrawnRegion()`: 顔領域の追加
- `clearDrawnRegions()`: 描画領域のクリア
- `getScaledRegionForDisplay()`: 表示用領域のスケーリング

#### ロスター管理（RosterContextから統合）
- `createRosterFromRegions()`: 選択領域からロスター作成
- `loadRosterForEditing()`: 既存ロスターの読み込み
- `deleteRoster()`: ロスターの削除

#### 人物管理
- `selectPerson()`: 人物の選択
- `updatePersonDetails()`: 人物情報の更新

## コンテキストプロバイダー階層

```typescript
// src/contexts/index.tsx
export const AppProviders: React.FC = ({ children }) => {
  return (
    <AuthProvider>
      <UIProvider>
        <SearchFilterProvider>
          <ConnectionProvider>
            <PeopleProvider>
              <PeopleMergeProvider>
                <PeopleDeletionProvider>
                  <FaceRosterProvider>
                    {children}
                  </FaceRosterProvider>
                </PeopleDeletionProvider>
              </PeopleMergeProvider>
            </PeopleProvider>
          </ConnectionProvider>
        </SearchFilterProvider>
      </UIProvider>
    </AuthProvider>
  );
};
```

## 使用方法

### コンポーネントでの利用

```typescript
import { useFaceRoster } from '@/contexts';

const MyComponent = () => {
  const {
    // 画像関連
    imageDataUrl,
    handleImageUpload,
    drawnRegions,
    addDrawnRegion,
    
    // ロスター関連
    roster,
    createRosterFromRegions,
    
    // UI状態
    isProcessing
  } = useFaceRoster();
  
  // 実装...
};
```

## 統合のメリット

1. **単一の真実の源泉**: すべての状態が一箇所で管理される
2. **コードの簡潔性**: 複数のフックを使用する必要がない
3. **保守性の向上**: 状態管理ロジックが集約されている
4. **パフォーマンス**: 不要な再レンダリングの削減
5. **型安全性**: 統一されたインターフェースによる型推論の向上

## ベストプラクティス

1. **常にuseFaceRosterを使用**: 画像、ロスター、人物管理のすべてで統一されたフックを使用
2. **分割代入で必要な値のみ取得**: パフォーマンスのため、使用する値のみを取得
3. **エラーハンドリング**: 非同期処理は必ずtry-catchで囲む
4. **型定義の活用**: TypeScriptの型推論を最大限活用

## 今後の展望

- **Redux Toolkit への移行検討**: さらなるスケーラビリティのため
- **状態の永続化**: ローカルストレージとの連携
- **最適化**: React.memoやuseMemoのさらなる活用