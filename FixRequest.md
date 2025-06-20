# Connections UI実装依頼

## 現在の問題
`/connections`ページのUIは更新されているが、実際のデータ表示機能が未実装で、「まだコネクションが登録されていません」と表示されています。Firestoreには複数のコネクションが存在するにも関わらず、それらが表示されません。

## 確認済みの事実
1. **Firestoreデータベース**: `connections`コレクションに複数のドキュメントが存在
2. **コンテキスト実装**: `FaceRosterContext`に以下の機能が実装済み
   - `fetchAllConnectionsForAllUserPeople`: 全コネクション取得
   - `allUserConnections`: コネクションデータの状態管理
   - `addConnection`, `updateConnection`, `deleteConnection`: CRUD操作
3. **UIページ**: `/app/(main)/connections/page.tsx`が仮実装のまま

## 実装要件
1. **コネクション一覧表示**
   - `useFaceRoster`フックから`allUserConnections`と`allUserPeople`を取得
   - 各コネクションを表示（from/to人物名、関係タイプ、強度など）
   - ローディング状態の表示（`isLoadingAllUserConnections`を使用）
   - 「まだコネクションが登録されていません」は、実際にデータが0件の場合のみ表示

2. **必要な機能**
   - コネクション一覧の表示
   - フィルタリング（人物名、関係タイプなど）
   - ソート機能
   - 編集・削除ボタン
   - 新規コネクション作成ボタン

3. **UIデザイン要件**
   - 既存のデザインシステムに準拠
   - レスポンシブ対応
   - カード形式またはテーブル形式での表示

## 参考実装
- `/app/(main)/people/page.tsx`: 人物一覧の実装を参考に
- `EditPersonDialog.tsx`内の関連コネクション表示部分
- 既存のUIコンポーネント（Card, Table, Skeletonなど）を活用

## 実装ファイル
`src/app/(main)/connections/page.tsx`を更新してください。

## 注意事項
- 既存の`FaceRosterContext`のメソッドとステートを活用
- エラーハンドリングとローディング状態を適切に実装
- パフォーマンスを考慮（大量のコネクションがある場合の対応）
- 現在のUIデザイン（フィルターとソートのドロップダウン）は維持しつつ、実際の機能を実装