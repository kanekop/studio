# Connections表示問題の分析と修正提案

## 問題の原因
`FaceRosterContext`の`fetchAllConnectionsForAllUserPeople`は、**現在のユーザーが所有する人物のIDリスト**を基にコネクションを取得しています。

### 現在の動作
1. `fetchAllUserPeople`で`addedBy == currentUser.uid`の人物のみ取得
2. その人物IDリストを使って`fromPersonId`または`toPersonId`がリストに含まれるコネクションのみ取得
3. 結果：**自分が追加した人物が関わるコネクションのみ**表示される

### 問題点
- Firestoreには10個以上のコネクションが存在
- しかし、現在のユーザーが所有する人物が1人しかいない場合、その人物に関連するコネクションのみ表示
- 他のユーザーが作成した人物間のコネクションは表示されない

## 修正案

### 案1：現在の仕様を維持（推奨）
これはセキュリティ上の意図的な設計の可能性があります。ユーザーは自分が管理する人物のコネクションのみ見ることができます。

**対応**：
- UIに「あなたが追加した人物のコネクションのみ表示されます」という説明を追加
- 人物を増やすよう促すメッセージを表示

### 案2：すべてのコネクションを表示
もしすべてのコネクションを表示したい場合は、`connections/page.tsx`で独自のクエリを実装する必要があります。

**実装方法**：
```typescript
// connections/page.tsx内で直接実装
const fetchAllConnections = async () => {
  const connectionsQuery = query(
    collection(db, "connections"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(connectionsQuery);
  // すべてのコネクションを取得
};
```

**注意**：
- セキュリティルールの確認が必要
- 他のユーザーのデータへのアクセス権限を考慮

## 推奨アクション

1. **まず人物データを確認**：
   - Peopleページで何人の人物が登録されているか確認
   - 人物が1人しかいない場合は、まず人物を追加

2. **デバッグ情報の追加**：
   ```typescript
   console.log('Total people:', allUserPeople.length);
   console.log('People IDs:', allUserPeople.map(p => p.id));
   console.log('Total connections found:', allUserConnections.length);
   ```

3. **UIの改善**：
   - 「○人の人物に関連する△個のコネクション」という表示を追加
   - フィルター条件を明確に表示

この問題は、データの所有権とプライバシーに関わる設計上の判断によるものと考えられます。