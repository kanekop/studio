# データモデル設計

## 概要

FaceRosterのデータはCloud Firestoreに保存され、以下のコレクション構造を持ちます。

## コレクション構造

### 1. `users` コレクション

ユーザー固有の情報を保存します。

```typescript
interface User {
  // ドキュメントID: Firebase AuthenticationのUID
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. `rosters` コレクション

アップロードされた画像に紐づく名簿情報を管理します。

```typescript
interface Roster {
  // ドキュメントID: 自動生成
  rosterName: string;              // 例: "2025年6月 定例会議"
  ownerId: string;                 // usersコレクションのドキュメントID
  originalImageStoragePath: string; // Cloud Storage上の元画像パス
  description?: string;
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3. `people` コレクション

登録された全人物の情報を一元管理します。

```typescript
interface Person {
  // ドキュメントID: 自動生成
  name: string;
  company?: string;
  notes?: string;
  hobbies?: string;
  birthday?: string;
  firstMet?: string;
  firstMetContext?: string;
  primaryFaceAppearancePath?: string; // メイン表示写真のパス
  faceAppearances: FaceAppearance[];
  addedBy: string;                    // 追加したユーザーのUID
  rosterIds: string[];                // 含まれるrosterのID配列
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface FaceAppearance {
  rosterId: string;
  faceImageStoragePath: string;
  originalRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

### 4. `connections` コレクション

人物間の関係性を管理します。

```typescript
interface Connection {
  // ドキュメントID: 自動生成
  fromPersonId: string;    // 関係の起点となる人物ID
  toPersonId: string;      // 関係の対象となる人物ID
  types: ConnectionType[]; // 関係の種類（複数可）
  reasons: string[];       // 関係の理由・背景
  strength?: number;       // 関係の強さ（1-5）
  notes?: string;          // メモ
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type ConnectionType = 
  // 一般的な関係
  | 'colleague' | 'friend' | 'acquaintance' | 'club_member'
  // 階層的な関係
  | 'parent' | 'child' | 'manager' | 'reports_to' | 'mentor' | 'mentee'
  // 特別な関係
  | 'spouse' | 'partner' | 'family_member'
  // カスタム
  | string;
```

## インデックス設計

### 複合インデックス

```yaml
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "people",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "addedBy", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "connections",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "fromPersonId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "connections",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "toPersonId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## データの関連性

```mermaid
erDiagram
    USER ||--o{ ROSTER : owns
    USER ||--o{ PERSON : adds
    ROSTER ||--o{ PERSON : contains
    PERSON ||--o{ CONNECTION : from
    PERSON ||--o{ CONNECTION : to
    PERSON ||--o{ FACE_APPEARANCE : has
    
    USER {
        string uid PK
        string email
        string displayName
    }
    
    ROSTER {
        string id PK
        string rosterName
        string ownerId FK
        string imagePath
    }
    
    PERSON {
        string id PK
        string name
        string company
        string addedBy FK
    }
    
    CONNECTION {
        string id PK
        string fromPersonId FK
        string toPersonId FK
        array types
    }
```

## クエリパターン

### 1. 特定ユーザーの全人物取得
```typescript
firestore.collection('people')
  .where('addedBy', '==', userId)
  .orderBy('createdAt', 'desc')
```

### 2. 特定人物の全関係取得
```typescript
// 双方向検索が必要
const fromConnections = await firestore.collection('connections')
  .where('fromPersonId', '==', personId).get();
  
const toConnections = await firestore.collection('connections')
  .where('toPersonId', '==', personId).get();
```

### 3. 特定の名簿に含まれる人物
```typescript
firestore.collection('people')
  .where('rosterIds', 'array-contains', rosterId)
```

## データ整合性

### トランザクション使用例

```typescript
// 人物マージ時のトランザクション
await firestore.runTransaction(async (transaction) => {
  // 1. ソース人物のデータを取得
  const sourcePerson = await transaction.get(sourcePersonRef);
  
  // 2. ターゲット人物を更新
  transaction.update(targetPersonRef, mergedData);
  
  // 3. 関連するコネクションを更新
  connectionsToUpdate.forEach(conn => {
    transaction.update(conn.ref, updatedConnectionData);
  });
  
  // 4. ソース人物を削除
  transaction.delete(sourcePersonRef);
});
```

## セキュリティ考慮事項

- 各ドキュメントには作成者（addedBy/ownerId）を記録
- Security Rulesで所有者のみがアクセス可能に制限
- 共有機能実装時は別途権限管理テーブルを検討 