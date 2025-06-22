# 人物管理機能 統合仕様書

**バージョン**: 2.0
**最終更新日**: 2024-07-25
**概要**: 本ドキュメントは、FaceRosterアプリケーションにおける「人物管理（People）」機能の完全な仕様を定義するものです。当初の `people-management.md` の要求仕様と、`FixRequest.md` に基づく具体的な改善・実装計画を統合し、現在の最新の実装を反映した正本とします。

## 1. 基本思想と解決された課題

### 1.1. 機能の目的
画像から識別された顔情報に対し、ユーザーが人物情報を登録、編集、検索、削除する一連の機能を提供します。これにより、アプリケーション内での人物データの正確性と一貫性を保ち、ユーザーが自身のネットワークを効率的に管理できるようにします。

### 1.2. 解決された根本的課題
本仕様書が策定される以前、アプリケーションは以下の重大な問題を抱えていました。

-   **🔴 データ編集フローの破綻**: Peopleページで人物情報を編集しようとしても、ダイアログが正しく機能せず、ユーザーは期待通りの操作を行えませんでした。これはUXにおける最も致命的な欠陥でした。

この問題を解決するため、コンポーネントの責務を再定義し、データフローを刷新する大規模なリファクタリングを実施しました。本仕様書は、その改善後のアーキテクチャを反映したものです。

## 2. 機能要件

### 2.1. 人物の新規登録
- **トリガー**: Peopleページヘッダーの「新しい人物を追加」ボタン。
- **フロー**:
    1. `AddPersonDialog` が表示される。
    2. ユーザーが必要情報を入力し、「追加」ボタンを押す。
    3. `PeopleService` がFirestoreに新しい人物ドキュメントを作成する。
    4. 成功後、ダイアログは閉じられ、Peopleページのリストに新しい人物が即座に追加される。
- **登録情報**:
    - **名前（必須）**
    - 会社・所属
    - 趣味
    - 誕生日
    - 初対面の日付
    - 初対面の文脈
    - メモ

### 2.2. 人物情報の編集
- **トリガー**:
    1. 人物カード自体をクリックする。
    2. 人物カード右上の三点リーダーメニューから「編集」を選択する。
- **フロー**:
    1. `EditPersonDialog` が表示され、選択された人物の既存情報がフォームに設定される。
    2. ユーザーが情報を変更し、「保存」ボタンを押す。
    3. `PeopleService` がFirestoreの該当人物ドキュメントを更新する。
    4. 成功後、ダイアログは閉じられ、Peopleページのリストに更新内容が即座に反映される。
- **編集可能情報**: 新規登録時の全ての情報。

### 2.3. 人物の削除
- **トリガー**: 人物カード右上の三点リーダーメニューから「削除」を選択する。
- **フロー**:
    1. `DeletePersonDialog` が表示される。
    2. ダイアログには、削除対象の人物名と、その人物に関連するコネクション数が表示され、操作が不可逆であることが警告される。
    3. ユーザーが「削除する」ボタンを押す。
    4. `PeopleService` がFirestoreの該当人物ドキュメント、および関連する全てのコネクションドキュメントを削除する。
    5. 成功後、ダイアログは閉じられ、Peopleページのリストから該当人物が即座に削除される。

### 2.4. 人物の検索・フィルタリング
- **名前検索**: 部分一致検索、リアルタイム結果更新。
- **会社絞り込み**: ドロップダウンによる会社選択。
- **その他フィルター**: メモ、趣味、誕生日、コネクション有無など、将来的な拡張性を考慮。(`AdvancedPeopleSearchFilters`コンポーネントにて実装想定)

### 2.5. 並び替え
- 名前順（あいうえお順）
- 登録日時順（新しい順・古い順）
- (将来実装) 更新日時順

### 2.6. 人物のマージ（統合）
- 同一人物が複数登録された場合の統合機能。
- (注: 今回のリファクタリングではスコープ外としたが、`people-management.md`の仕様を引き続き目標とする)

## 3. UI/UX仕様

### 3.1. 人物カード (`PeopleListItem.tsx`)
人物一人ひとりを表す基本的なコンポーネント。グリッドレイアウトで表示される。

```
┌─────────────────┐
│ [顔写真]      ︙ │  <- 三点リーダーメニュー
│                 │
│ 山田 太郎       │
│ 株式会社ABC     │
│                 │
│ 👥2 👔1        │
└─────────────────┘
```
- **インタラクション**: カード全体、または三点リーダーメニューの「編集」クリックで編集ダイアログを開く。
- **メニュー**: 右上の三点リーダーメニューには「編集」と「削除」のアクションが含まれる。
- **情報**: 顔写真、名前、会社、関連コネクション数のサマリーが表示される。

### 3.2. 人物編集ダイアログ (`EditPersonDialog.tsx`)
人物情報を編集するためのモーダルウィンドウ。

```
┌─────────────────────────────────────────────┐
│  人物情報を編集                             │
│  Update the details for 山田 太郎.          │
├─────────────────────────────────────────────┤
│                                             │
│  名前*: [山田 太郎        ]  会社: [株式会社ABC] │
│  趣味:   [ゴルフ、読書   ]  誕生日: [1980-04-15] │
│  初対面: [2024-01-15]  文脈: [新年会で紹介]     │
│                                             │
│  メモ:                                      │
│  ┌───────────────────────────────────────┐  │
│  │その他の情報...                        │  │
│  └───────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│      [キャンセル]        [💾 保存]          │
└─────────────────────────────────────────────┘
```
- **特徴**: フォームの状態管理はコンポーネント内の`useState`で完結。外部のContextに依存しない。

### 3.3. 人物追加ダイアログ (`AddPersonDialog.tsx`)
新規人物を登録するためのモーダルウィンドウ。レイアウトは編集ダイアログと一貫性を持たせる。

```
┌─────────────────────────────────────────────┐
│  新しい人物を追加                           │
│  You can add a person without a photo.      │
├─────────────────────────────────────────────┤
│                                             │
│  名前*: [                ]  会社: [          ] │
│  ... (編集ダイアログと同様のフォーム) ...     │
│                                             │
├─────────────────────────────────────────────┤
│      [キャンセル]        [➕ 追加]          │
└─────────────────────────────────────────────┘
```

### 3.4. 削除確認ダイアログ (`DeletePersonDialog.tsx`)
誤操作によるデータ損失を防ぐための最終確認ダイアログ。

```
┌─────────────────────────────────────────────┐
│  ⚠️ 本当に削除しますか？                     │
│                                             │
│  **山田 太郎** を完全に削除しようとしています。│
│                                             │
│  ┌───────────────────────────────────┐    │
│  │ ⚠️ この人物には 3 件の関係性が登録   │    │
│  │ されています。これらも全て削除されます。│    │
│  └───────────────────────────────────┘    │
│                                             │
│  この操作は取り消すことができません。       │
│                                             │
├─────────────────────────────────────────────┤
│      [キャンセル]        [🗑️ 削除する]      │
└─────────────────────────────────────────────┘
```

## 4. アーキテクチャと実装詳細

### 4.1. データフロー
単一方向のクリーンなデータフローを徹底する。

`PeopleService` (Firestore) ⇄ `ManagePeoplePage` (State) ⇄ `*Dialog` / `PeopleList` (Props)

### 4.2. Service層: `PeopleService`
Firestoreとの通信を全てカプセル化し、コンポーネントからビジネスロジックを分離する。

```typescript
// src/domain/services/people/PeopleService.ts

import { db } from '@/infrastructure/firebase/config';
import { getAuth } from "firebase/auth";
import { /* ... firestore functions ... */ } from 'firebase/firestore';

// データ作成用の型定義
export type CreatePersonData = Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'rosterIds' | 'faceAppearances' | 'age' | 'userId'>;
export type UpdatePersonData = Partial<Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>;

export class PeopleService {
  // 全人物取得
  static async getAllPeople(): Promise<Person[]> { /* ... */ }

  // 単体人物取得
  static async getPerson(id: string): Promise<Person | null> { /* ... */ }

  // 人物作成
  static async createPerson(data: CreatePersonData): Promise<Person> {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not authenticated.");

    const docRef = await addDoc(collection(db, 'people'), {
      ...data,
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // ...
    });
    // ...
  }

  // 人物更新
  static async updatePerson(id: string, data: UpdatePersonData): Promise<void> {
    await updateDoc(doc(db, 'people', id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  // 人物削除（関連データ含む）
  static async deletePerson(id: string): Promise<void> {
    const batch = writeBatch(db);
    // ... 関連するコネクションを検索してバッチに追加
    // ... 人物ドキュメントをバッチに追加
    await batch.commit();
  }

  // 特定人物のコネクション取得
  static async getConnectionsForPerson(personId: string): Promise<Connection[]> { /* ... */ }
}
```

### 4.3. Pageコンポーネント: `ManagePeoplePage`
Peopleページのトップレベルコンポーネントとして、状態管理とイベントハンドリングの責務を担う。

```typescript
// src/app/(main)/people/page.tsx

export default function ManagePeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const peopleData = await PeopleService.getAllPeople();
        // ... 全コネクションも取得
        setPeople(peopleData);
        // ...
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 編集ハンドラ
  const handleEditClick = (person: Person) => setPersonToEdit(person);

  // 削除ハンドラ
  const handleDeleteClick = (person: Person) => setPersonToDelete(person);

  // 更新処理（オプティミスティックUI）
  const handleUpdatePerson = (personId: string, updates: UpdatePersonData) => {
    setPeople(prev => prev.map(p => (p.id === personId ? { ...p, ...updates } : p)));
  };

  // 削除確定処理
  const handleConfirmDelete = async () => {
    if (!personToDelete) return;
    await PeopleService.deletePerson(personToDelete.id);
    setPeople(prev => prev.filter(p => p.id !== personToDelete.id));
    // ... コネクションも更新
    setPersonToDelete(null);
  };

  // 追加処理
  const handleAddPerson = (newPerson: Person) => {
    setPeople(prev => [...prev, newPerson]);
  };

  return ( /* JSX ... */ );
}
```

## 5. エラーハンドリング
- **バリデーション**: 名前は必須項目として、クライアントサイドでチェックを行う。
- **認証**: `PeopleService`層で、書き込み操作の前にユーザー認証状態を確認する。
- **フィードバック**: 全てのCUD（作成・更新・削除）操作の成功・失敗時には、画面右上にトースト通知を表示し、結果を明確にユーザーに伝える。
- **削除確認**: `DeletePersonDialog`により、破壊的な操作の前に必ずユーザーの意思確認を行う。

## 6. パフォーマンス最適化
- **画像最適化**:
    - **遅延読み込み**: `Intersection Observer` APIを利用し、画面内に入った画像のURLのみを非同期で取得する。
    - **キャッシュ**: 一度取得した画像URLはコンポーネント内でキャッシュし、再レンダリング時の不要な再取得を防ぐ。
- **コンポーネント最適化**:
    - `React.memo`を`PeopleListItem`に適用し、propsが変更されない限り再レンダリングをスキップする。
- **仮想スクロール**:
    - (将来) 表示する人物が100人を超えた場合、`@tanstack/react-virtual` を用いた仮想スクロールに自動で切り替え、DOM要素の数を抑制する。

## 7. 関連ドキュメント
- [パフォーマンス最適化詳細](../../development/performance-optimization.md) 