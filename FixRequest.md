# FaceRoster アプリケーション リファクタリング実施プロンプト

## 背景と目的
FaceRosterアプリケーションで頻発する「Peopleクリック時のバグ」（画像が表示されない、エラーが発生する、クリックができない等）を根本から解決するため、アーキテクチャレベルでのリファクタリングを実施してください。

## 現在の主要な問題点

### 1. FaceRosterContext.tsxの肥大化
- 3000行を超える巨大なファイル
- 状態管理、データフェッチ、画像処理、エラーハンドリングなど多くの責務を持つ
- 単一のisProcessingステートで複数の非同期処理を管理している

### 2. People機能の不安定性  
- EditPersonDialogを開く際の画像読み込みエラー
- 人物リストのクリックイベントが効かない場合がある
- Firebase Storage URLの取得失敗時の処理が不適切

### 3. エラーハンドリングの不統一
- try-catchブロックでのエラー処理が統一されていない
- エラーメッセージがユーザーに適切に伝わらない
- ネットワークエラーと権限エラーの区別がない

## リファクタリング実施方針

### Phase 1: Context分割とカスタムフックの作成

#### 1.1 FaceRosterContextを機能別に分割
```
src/contexts/
├── AuthContext.tsx          # 認証関連
├── RosterContext.tsx        # 名簿（Roster）関連
├── PeopleContext.tsx        # 人物（People）関連  
├── ConnectionContext.tsx    # 関係性（Connection）関連
├── UIContext.tsx           # UI状態（ダイアログ、ローディング等）
└── index.tsx               # 統合Provider
```

#### 1.2 カスタムフックの作成
```
src/hooks/
├── useImageUpload.ts       # 画像アップロード処理
├── useFirestoreSync.ts     # Firestore同期処理
├── useStorageImage.ts      # Storage画像取得（エラーハンドリング含む）
├── useAsyncOperation.ts    # 非同期処理の状態管理
└── useDialogManager.ts     # ダイアログの開閉管理
```

### Phase 2: 画像処理の安定化

#### 2.1 useStorageImageフックの実装
```typescript
// 画像URLの取得とエラーハンドリングを一元化
interface UseStorageImageResult {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

const useStorageImage = (storagePath: string | null): UseStorageImageResult => {
  // 実装内容:
  // - キャッシュ機構
  // - リトライロジック
  // - プレースホルダー画像のフォールバック
  // - 適切なエラーハンドリング
};
```

#### 2.2 画像読み込みエラーの適切な処理
- Firebase Storage権限エラーの検出と対処
- ネットワークエラーのリトライ機能
- 画像が存在しない場合のデフォルト画像表示

### Phase 3: People機能の安定化

#### 3.1 EditPersonDialogの改善
```typescript
// 画像読み込みを事前に行い、エラーを適切に処理
const EditPersonDialog = ({ person, isOpen, onOpenChange }) => {
  // FaceAppearanceの画像を事前にロード
  const appearances = useFaceAppearanceImages(person.faceAppearances);
  
  // メイン画像の安全な取得
  const primaryImage = usePrimaryImage(person);
  
  // エラー状態の管理
  const { error, clearError } = useErrorHandler();
  
  // ダイアログの開閉を確実に制御
  const dialogManager = useDialogManager();
};
```

#### 3.2 PeopleListItemのイベント処理改善
```typescript
// クリックイベントの確実な処理
const PeopleListItem = ({ person, onEditClick, ... }) => {
  // ドラッグ状態とクリックイベントの分離
  const { isDragging, dragHandlers } = useDragHandlers();
  
  // クリックハンドラーの最適化
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging && !isSelectionMode) {
      onEditClick(person);
    }
  }, [person, isDragging, isSelectionMode, onEditClick]);
  
  // 画像の安全な取得
  const { imageUrl } = usePersonImage(person);
};
```

### Phase 4: 非同期処理の改善

#### 4.1 useAsyncOperationフックの実装
```typescript
// 個別の非同期処理を管理
const useAsyncOperation = <T,>(
  operation: (...args: any[]) => Promise<T>
) => {
  const [state, setState] = useState({
    isLoading: false,
    error: null,
    data: null,
  });
  
  const execute = useCallback(async (...args) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await operation(...args);
      setState({ isLoading: false, error: null, data: result });
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error }));
      throw error;
    }
  }, [operation]);
  
  return { ...state, execute };
};
```

### Phase 5: エラーハンドリングの統一

#### 5.1 エラー種別の定義
```typescript
enum ErrorType {
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public originalError?: any
  ) {
    super(message);
  }
}
```

#### 5.2 統一的なエラーハンドラー
```typescript
const useErrorHandler = () => {
  const { toast } = useToast();
  
  const handleError = useCallback((error: Error) => {
    if (error instanceof AppError) {
      switch (error.type) {
        case ErrorType.NETWORK:
          toast({ 
            title: "ネットワークエラー",
            description: "接続を確認してください",
            action: <RetryButton />
          });
          break;
        case ErrorType.PERMISSION:
          toast({ 
            title: "アクセス権限エラー",
            description: "この操作を実行する権限がありません"
          });
          break;
        // ... 他のエラータイプ
      }
    }
  }, [toast]);
  
  return { handleError };
};
```

## 実装手順

1. **準備作業**
   - 現在のコードのバックアップ
   - テスト環境の準備
   - 段階的な移行計画の作成

2. **Phase 1実装（1-2日）**
   - Contextの分割
   - 基本的なカスタムフックの作成
   - 既存コンポーネントへの段階的な適用

3. **Phase 2-3実装（2-3日）**
   - 画像処理の安定化
   - People機能の改善
   - 重点的なテスト

4. **Phase 4-5実装（1-2日）**
   - 非同期処理の改善
   - エラーハンドリングの統一
   - 全体的な動作確認

5. **最終調整（1日）**
   - パフォーマンスチューニング
   - 不要なコードの削除
   - ドキュメント更新

## 成功指標

1. **安定性の向上**
   - Peopleクリック時のエラー発生率が0%
   - 画像表示の成功率が99%以上

2. **保守性の向上**
   - FaceRosterContext.tsxを500行以下に削減
   - 各Contextファイルが単一責任原則に従う

3. **開発効率の向上**
   - 新機能追加時の影響範囲が明確
   - テストが書きやすい構造

## 注意事項

- **段階的な移行**: 一度に全てを変更せず、機能ごとに段階的に移行する
- **後方互換性**: 既存の機能を壊さないよう、十分なテストを行う
- **エラー監視**: 本番環境でのエラーを監視し、問題があれば迅速に対応する

このリファクタリングにより、FaceRosterアプリケーションの安定性と保守性が大幅に向上し、今後の機能追加も容易になります。