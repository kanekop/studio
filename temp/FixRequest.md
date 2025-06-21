スクリーンショットを見ると、Rosterパネルに顔画像は表示されていますが、人物の詳細情報（名前など）が表示されていない状態ですね。

## 問題の分析

現在の状況：
- 顔画像の切り出しと表示は成功している ✅
- しかし、人物リストには画像のみで名前が表示されていない ❌
- 詳細表示エリアは空の状態 ❌

## 原因の特定

問題は`FaceRosterContext`の`createRosterFromRegions`メソッドで、人物データを作成する際に：

1. **初期名が設定されていない可能性**
   - `name`フィールドが空文字列になっている
   - または`Person 1`、`Person 2`という初期名が設定されていない

2. **選択状態の初期化が行われていない**
   - 最初の人物が自動選択されていない
   - そのため詳細表示エリアが空

## 確認すべきポイント

### 1. RosterListコンポーネントの確認
- 人物の名前を表示する部分があるか
- `person.name`が正しく参照されているか

### 2. createRosterFromRegionsメソッドの確認
```typescript
// 現在のコードで以下のような初期化が行われているか確認
const newPerson: EditablePersonInContext = {
  id: `temp_${Date.now()}_${i}`,
  name: `Person ${i + 1}`, // ← この部分が重要
  // ... 他のフィールド
};
```

### 3. RosterPanelコンポーネントの確認
- RosterListとRosterItemDetailの連携
- 初期選択の処理

## 修正の指示

1. **FaceRosterContext.tsx**の`createRosterFromRegions`で：
   - 各人物の`name`フィールドに`Person 1`、`Person 2`などの初期値を設定
   - Roster作成後、最初の人物を自動的に選択（`setSelectedPersonId(newPeople[0].id)`）

2. **RosterList.tsx**で：
   - 人物の名前が表示されるようにする
   - 名前が空の場合のフォールバック表示を追加

3. **デバッグのために**：
   - `console.log`で作成された人物データを出力
   - 特に`name`フィールドの値を確認

これらの修正により、各人物に初期名が付与され、リストに表示されるようになるはずです。