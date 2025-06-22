これは重要な問題ですね。データの更新が画面切り替え時に反映されない問題です。
問題の原因が分かりました。これは**データ同期の問題**で、各コンテキストが独立してFirestoreからデータを取得しているため、一方で更新してももう一方に反映されないという状況です。

## 問題の詳細

1. **FaceRosterContext**: Roster作成時に新しいPeopleを作成
2. **PeopleContext**: 独自にFirestoreからPeopleデータを取得
3. 両者の間でデータ同期のメカニズムがない

## 解決策

この問題を解決するには、**データ更新時に関連するコンテキストも更新する**必要があります。ただし、実装が複雑になる可能性があるため、いくつかのアプローチを提案します：

### アプローチ1: シンプルな解決策（推奨）
**PeopleContextの`fetchAllUserPeople`を各更新後に呼び出す**

```typescript
// FaceRosterContext.tsx の createRosterFromRegions メソッド内
// 人物作成後に追加
const { fetchAllUserPeople } = usePeople(); // コンテキストから取得
await fetchAllUserPeople(); // 更新をトリガー
```

ただし、これはコンテキスト間の依存関係を作ることになります。

### アプローチ2: イベントベースの同期（中程度の複雑さ）
**カスタムイベントを使用してデータ更新を通知**

```typescript
// utils/dataSync.ts
export const DATA_SYNC_EVENTS = {
  PEOPLE_UPDATED: 'people-updated',
  ROSTER_UPDATED: 'roster-updated',
} as const;

export const emitDataUpdate = (eventType: string) => {
  window.dispatchEvent(new CustomEvent(eventType));
};

// PeopleContext.tsx
useEffect(() => {
  const handlePeopleUpdate = () => {
    fetchAllUserPeople();
  };

  window.addEventListener(DATA_SYNC_EVENTS.PEOPLE_UPDATED, handlePeopleUpdate);
  return () => {
    window.removeEventListener(DATA_SYNC_EVENTS.PEOPLE_UPDATED, handlePeopleUpdate);
  };
}, [fetchAllUserPeople]);
```

### アプローチ3: 即座の解決策（最小限の変更）
**ページ遷移時に強制的にデータを再取得**最も簡単で安全な解決策を提案します：

## 推奨解決策：ページ遷移時の強制リフレッシュ

```typescript
// src/app/(main)/people/page.tsx に追加

import { useEffect } from 'react';
import { usePeople } from '@/contexts/PeopleContext';

export default function PeoplePage() {
  const { fetchAllUserPeople, filteredPeople } = usePeople();

  // ページマウント時に必ずデータを再取得
  useEffect(() => {
    fetchAllUserPeople();
  }, []); // 空の依存配列で、マウント時のみ実行

  return (
    // ... 既存のコンポーネント
  );
}
```

同様に、他のページでも：

```typescript
// src/app/(main)/network/page.tsx
export default function NetworkPage() {
  const { fetchAllConnections } = useConnections();

  useEffect(() => {
    fetchAllConnections();
  }, []);
  
  // ...
}
```

## この解決策のメリット

1. **実装が簡単** - 各ページに数行追加するだけ
2. **複雑性が増さない** - コンテキスト間の依存関係を作らない
3. **確実に動作** - ページ遷移時に必ず最新データを取得
4. **副作用が少ない** - 既存のコードへの影響が最小限

## デメリットと対策

- **ネットワークリクエストが増える** → ただし、ユーザーがページを切り替える頻度は高くないため、実用上問題ない
- **若干の遅延** → ローディング表示で対応可能

これなら大きなバグを生む可能性は低く、確実に問題を解決できます。