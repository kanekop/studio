# コーディング規約

## 概要

FaceRosterプロジェクトにおけるコードの品質と一貫性を保つためのガイドラインです。

## TypeScript/JavaScript

### 基本ルール
- TypeScriptを使用（`.ts`、`.tsx`）
- 厳格な型チェック（`strict: true`）
- `any`型の使用は原則禁止

### 命名規則
```typescript
// ファイル名: PascalCase（コンポーネント）、kebab-case（その他）
MyComponent.tsx
use-dialog-manager.ts

// 変数・関数: camelCase
const userName = "John";
function calculateTotal() {}

// 定数: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10485760;

// 型・インターフェース: PascalCase
interface UserProfile {}
type ConnectionType = "friend" | "colleague";

// enum: PascalCase（キーも同様）
enum UserRole {
  Admin = "ADMIN",
  User = "USER"
}
```

### インポート順序
```typescript
// 1. React
import React, { useState, useEffect } from 'react';

// 2. 外部ライブラリ
import { Dialog } from '@radix-ui/react-dialog';
import { toast } from 'sonner';

// 3. 内部モジュール（絶対パス）
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

// 4. 相対インポート
import { PersonCard } from './PersonCard';
import type { Person } from '../types';

// 5. スタイル
import styles from './styles.module.css';
```

## React/JSX

### コンポーネント定義
```typescript
// 関数コンポーネントを使用
export const MyComponent: React.FC<Props> = ({ title, children }) => {
  return <div>{children}</div>;
};

// Propsの型定義
interface Props {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
}
```

### Hooks使用規則
```typescript
// カスタムフックは"use"で始める
function useDialogState() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, setIsOpen };
}

// useEffectの依存配列を正確に
useEffect(() => {
  // 処理
}, [dependency1, dependency2]); // 全ての依存を列挙
```

### イベントハンドラー
```typescript
// "handle"プレフィックスを使用
const handleClick = (e: React.MouseEvent) => {
  e.preventDefault();
  // 処理
};

// 非同期処理
const handleSubmit = async (data: FormData) => {
  try {
    await saveData(data);
    toast.success('保存しました');
  } catch (error) {
    toast.error('エラーが発生しました');
  }
};
```

## CSS/スタイリング

### Tailwind CSS
```tsx
// 基本的な使用方法
<div className="flex items-center gap-4 p-4">
  <Button className="bg-primary-600 hover:bg-primary-700">
    クリック
  </Button>
</div>

// 条件付きクラス（cn関数を使用）
import { cn } from '@/lib/utils';

<div className={cn(
  "base-class",
  isActive && "active-class",
  isDisabled && "disabled-class"
)} />
```

### CSS変数
```css
/* globals.css で定義 */
:root {
  --primary-color: #3b82f6;
  --spacing-unit: 0.25rem;
}

/* 使用 */
.custom-element {
  color: var(--primary-color);
  margin: calc(var(--spacing-unit) * 4);
}
```

## ファイル構成

### ディレクトリ構造
```
src/
├── app/              # Next.js App Router
├── components/       # 再利用可能なコンポーネント
│   ├── ui/          # 基本UIコンポーネント
│   └── features/    # 機能別コンポーネント
├── hooks/           # カスタムフック
├── lib/             # ユーティリティ関数
├── contexts/        # React Context
└── types/           # 型定義
```

### コンポーネントファイル
```
components/features/
├── PersonCard/
│   ├── PersonCard.tsx      # メインコンポーネント
│   ├── PersonCard.test.tsx # テスト
│   └── index.ts           # エクスポート
```

## Git コミット規約

### コミットメッセージ
```
<type>: <subject>

<body>

<footer>
```

### Type
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードスタイルの変更
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルドプロセスや補助ツールの変更

### 例
```
feat: 人物マージ機能を追加

- 重複した人物データを統合できるように
- マージ時は関連するコネクションも更新
- マージ履歴を保存

Closes #123
```

## エラーハンドリング

### Try-Catch
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  // エラーの型を確認
  if (error instanceof FirebaseError) {
    console.error('Firebase error:', error.code);
    throw new AppError('データの取得に失敗しました', error);
  }
  throw error;
}
```

### エラー境界
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo);
    // エラーレポート送信
  }
}
```

## パフォーマンス

### メモ化
```typescript
// React.memo
export const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* 複雑な処理 */}</div>;
});

// useMemo
const calculatedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

// useCallback
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### 遅延読み込み
```typescript
// 動的インポート
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
});

// 画像の遅延読み込み
<Image
  src={imageSrc}
  alt={alt}
  loading="lazy"
  placeholder="blur"
/>
```

## テスト

### 単体テスト
```typescript
describe('PersonCard', () => {
  it('should display person name', () => {
    render(<PersonCard person={mockPerson} />);
    expect(screen.getByText(mockPerson.name)).toBeInTheDocument();
  });
});
```

### 統合テスト
```typescript
it('should create connection between people', async () => {
  const user = userEvent.setup();
  render(<PeopleList />);
  
  // ドラッグ&ドロップのシミュレーション
  await user.drag(screen.getByTestId('person-1'));
  await user.drop(screen.getByTestId('person-2'));
  
  expect(screen.getByText('関係性を作成')).toBeInTheDocument();
});
``` 