# FaceRoster アプリケーション仕様書 (改訂版)

## 1. 概要

FaceRosterは、ユーザーが画像（会議のスクリーンショットや集合写真など）をアップロードし、画像内の顔を識別して、クラウド上に保存される視覚的な名簿（ロスター）を作成・管理・共有できるウェブアプリケーションです。

本アプリケーションの核心は、単なる名簿作成ツールに留まらず、**Cloud Firestoreをバックエンドに採用することで、友人、同僚、イベント参加者といったあらゆる人間関係を視覚的に記録・管理・検索できる「パーソナル関係者管理プラットフォーム」**を目指す点にあります。

作成されたデータはFirebaseに安全に保存され、どのデバイスからでもアクセス可能です。将来的にはGenkitを利用したAIによる顔の自動認識や情報連携機能の実装を視野に入れています。

## 2. 主要技術スタック

### 【フロントエンド】
*   フロントエンドフレームワーク: Next.js (App Router)
*   UIライブラリ: React
*   UIコンポーネント: ShadCN UI
*   スタイリング: Tailwind CSS
*   状態管理: React Context API

### 【バックエンド & インフラ】
*   データベース: Cloud Firestore
    *   人物情報、名簿情報、関係性などを管理するNoSQLドキュメントデータベース。柔軟なデータ構造と強力なクエリ機能が特徴です。
*   認証: Firebase Authentication
    *   メールアドレス/パスワード、Googleアカウントなどを用いた安全なユーザー認証機能を提供します。
*   ストレージ: Cloud Storage for Firebase
    *   ユーザーがアップロードする元画像や、切り抜かれた顔画像を保存します。
*   サーバーレス機能: Cloud Functions for Firebase (将来的に検討)
    *   画像アップロード後の後処理や、データベースの整合性を保つためのバックグラウンド処理を実行します。

### 【AI機能 (将来利用予定)】
*   AI連携フレームワーク: Genkit

## 3. 主な機能

### 3.1. ユーザー認証
*   Firebase Authenticationを利用した、新規登録およびログイン機能。
*   認証によってユーザーごとのデータが保護され、自分だけの名簿を管理できます。

### 3.2. 画像アップロード
*   対応ファイル形式: PNG, JPG, WEBP
*   最大ファイルサイズ: 10MB
*   アップロードされた画像はCloud Storage for Firebaseに保存され、エディタ画面に表示されます。

### 3.3. 顔領域の描画と名簿の作成
*   画像上に矩形を描画し、顔の領域を指定できます。
*   描画された領域から、個々の人物エントリを持つ名簿を生成します。
*   各エントリには、Cloud Storageに保存された顔画像へのリンクと、編集可能な情報が紐付きます。

### 3.4. 名簿アイテムの編集 (機能拡張)
*   各人物について、以下の情報を編集できます。
    *   名前
    *   会社
    *   趣味（複数登録可能）
    *   誕生日
    *   出会った日・きっかけ
    *   共通の知人（他の人物エントリへの参照）
    *   配偶者
    *   メモ
*   編集内容はリアルタイムでCloud Firestoreに保存され、他のデバイスにも即座に反映されます。

### 3.5. クラウドデータ永続化と同期
*   画像、名簿情報、人物情報はすべてFirebase上に保存されます。
*   ユーザーがページを再読み込みしたり、別のデバイスでログインしたりしても、常に最新の作業状態が復元されます。

### 3.6. 高度な検索機能 (新規)
*   Cloud Firestoreの強力なクエリ機能を活用し、登録された人物を様々な条件で検索できます。
    *   例：「A社に所属している人」「趣味がゴルフの人」「2024年以降に出会った人」

### 3.7. データ管理
*   名簿の削除: 特定の名簿を削除する機能。
*   人物データの削除: 登録した人物情報を削除する機能。
*   アカウントの削除: ユーザーアカウントに関連する全てのデータを削除する機能。

### 3.8. 人物間コネクションの作成 (Create Connections between People) (新規)
*   `/people` (人物管理) ページにて、人物カードを別の人物カードへドラッグ＆ドロップすることで、人物間の関係性（コネクション）を作成できます。
*   ドロップ後、「関係作成」ダイアログが開き、関係の種類（例: 同僚, 友人, 家族）、理由、強さ（任意）、メモ（任意）などの詳細情報を入力できます。

## 4. データモデル (Cloud Firestore)

アプリケーションのデータは、以下のコレクション構造でCloud Firestoreに保存されます。

### `users` コレクション
*   ドキュメントID: Firebase AuthenticationのUID
*   役割: ユーザー固有の情報を保存します。
*   フィールド (例):
    *   `email`: String (ユーザーのメールアドレス)
    *   `displayName`: String (ユーザーの表示名)
    *   `createdAt`: Timestamp (アカウント作成日時)

### `rosters` コレクション
*   役割: １つのアップロード画像（またはイベント）に紐づく名簿情報を管理します。
*   フィールド (例):
    *   `rosterName`: String (例: "2025年6月 定例会議")
    *   `ownerId`: String (usersコレクションのドキュメントIDへの参照)
    *   `originalImageStoragePath`: String (Cloud Storage上の元画像へのパス)
    *   `createdAt`: Timestamp (名簿作成日時)
    *   `updatedAt`: Timestamp (名簿最終更新日時)

### `people` コレクション
*   役割: このアプリの核となるコレクション。登録された全人物の情報を一元管理します。同じ人物が複数の名簿に登場する場合も、データはここに集約されます。
*   フィールド (例):
    *   `name`: String (人物の名前)
    *   `company`: String (所属会社)
    *   `notes`: String (自由記述メモ)
    *   `hobbies`: Array<String> (趣味のリスト)
    *   `knownAcquaintances`: Array<String> (他のpeopleドキュメントIDへの参照リスト)
    *   `spouse`: String (他のpeopleドキュメントIDへの参照)
    *   `birthday`: Timestamp (誕生日)
    *   `firstMet`: Timestamp (初めて会った日)
    *   `firstMetContext`: String (初めて会った状況やきっかけ)
    *   `faceImageStoragePaths`: Array<String> (Cloud Storageに保存された顔写真パスのリスト) // `faceAppearances` に移行
    *   `faceAppearances`: Array<Object> (各名簿での顔の出現情報)
        *   `rosterId`: String (rostersコレクションのドキュメントID)
        *   `faceImageStoragePath`: String (Cloud Storage上の切り抜かれた顔画像パス)
        *   `originalRegion`: Object (元画像内での顔領域 `{x, y, width, height}`)
    *   `addedBy`: String (この人物情報を追加したユーザーのusersドキュメントIDへの参照)
    *   `rosterIds`: Array<String> (この人物が含まれるrostersドキュメントIDのリスト、非正規化データ)
    *   `createdAt`: Timestamp (人物データ作成日時)
    *   `updatedAt`: Timestamp (人物データ最終更新日時)

### `connections` コレクション (新規)
*   役割: 人物間の関係性を管理します。これにより、柔軟な関係性の記録と将来的な拡張（関係の強さ、出会った時期など）が可能になります。
*   ドキュメントID: Firestoreによる自動生成ID。
*   フィールド:
    *   `fromPersonId`: `string` (`people`コレクションのドキュメントIDへの参照。関係の起点となる人物。)
    *   `toPersonId`: `string` (`people`コレクションのドキュメントIDへの参照。関係の対象となる人物。)
    *   `types`: `Array<string>` (関係の種類を示す配列。例: `["colleague", "friend", "family_member", "manager", "subordinate", "mentor", "mentee", "parent", "child", "father", "mother", "spouse", "club_member"]`。階層関係（例：上司・部下、親子）も表現可能。その場合、`fromPersonId` と `toPersonId` の向きと `type` の組み合わせで関係性を定義します。例えば、親子関係の場合、`fromPersonId` を親、`toPersonId` を子とし、`types` に `["parent"]` や `["father"]`, `["mother"]` を設定します。)
    *   `reasons`: `Array<string>` (関係の具体的な理由や背景を示す配列。例: `["Acme Corp勤務時の同僚", "大学の同級生", "直属の上司として指導", "プロジェクトチームのメンバー", "〇〇クラブのメンバー"]`)
    *   `strength`: `number` (任意。関係の強さや親密さを示す数値。例: 1-5のスケール)
    *   `notes`: `string` (任意。この関係性に関するメモ。)
    *   `createdAt`: `Timestamp` (関係性が記録された日時)
    *   `updatedAt`: `Timestamp` (関係性が最後に更新された日時)
*   **サンプルドキュメント:**
    *   **同僚・メンター関係:**
        ```json
        // Document ID: (e.g., conn_randomId123)
        {
          "fromPersonId": "people_doc_id_A",
          "toPersonId": "people_doc_id_B",
          "types": ["colleague", "mentor"],
          "reasons": ["Globex Corporation - Marketing Dept.", "Provided career advice in 2022"],
          "strength": 4,
          "notes": "Reliable contact for marketing strategies.",
          "createdAt": "Timestamp(seconds=1679700000, nanoseconds=0)",
          "updatedAt": "Timestamp(seconds=1679700300, nanoseconds=0)"
        }
        ```
    *   **親子関係 (父 -> 子):**
        ```json
        // Document ID: (e.g., conn_randomId456)
        {
          "fromPersonId": "people_doc_id_Father", // 父のID
          "toPersonId": "people_doc_id_Child",   // 子供のID
          "types": ["father", "parent"],
          "reasons": [], // 親子関係に特定の理由は不要な場合が多い
          "notes": "長男。",
          "createdAt": "Timestamp(seconds=1679800000, nanoseconds=0)",
          "updatedAt": "Timestamp(seconds=1679800000, nanoseconds=0)"
        }
        ```
*   **双方向検索に関する注意点:**
    特定の人物（例：`person_A_id`）の全ての関係性を取得するには、アプリケーション側で以下の2つのクエリを実行し、結果をマージする必要があります。
    1.  `connections` コレクションで `fromPersonId == "person_A_id"` となるドキュメントを検索。
    2.  `connections` コレクションで `toPersonId == "person_A_id"` となるドキュメントを検索。
    これにより、`person_A_id` が起点となっている関係と、対象となっている関係の両方を取得できます。
    または、`fromPersonId` と `toPersonId` に加えて、`participants: ["person_A_id", "person_B_id"]` (IDは常にソート順で格納) という配列フィールドを各コネクションドキュメントに持たせ、`array-contains` クエリ (`where('participants', 'array-contains', 'person_A_id')`) で単一クエリで取得する方法も考えられますが、現行のフィールド定義では上記の2クエリ方式が基本となります。

## 5. ファイル構成と各ファイルの役割 (主要な変更点)

*   **`src/app/(auth)/` (新規)**:
    *   ログインページ (`login/page.tsx`)
    *   新規登録ページ (`signup/page.tsx`)
    *   パスワードリセットページなど、認証関連のUIコンポーネントとロジックを配置。
*   **`src/app/(main)/page.tsx`**:
    *   Firebase Authenticationの状態を監視し、ログインしていればメインコンテンツ (例: `ImageSet` の一覧やエディタへの導線) を、未ログインであればランディングページやログインページへの誘導を表示。
*   **`src/app/(main)/people/page.tsx` (更新)**:
    *   人物リストの表示と管理。
    *   人物カードのドラッグ＆ドロップによるコネクション作成UIの起点。
    *   `CreateConnectionDialog`コンポーネントのレンダリングと状態管理。
*   **`src/components/features/`**:
    *   **`ImageUploadForm.tsx`**: 画像をCloud Storageにアップロードし、そのパスをFirestoreに保存するロジックに変更。
    *   **`RosterItemDetail.tsx`**: 表示・編集するデータソースをローカル状態からFirestoreに変更。入力内容はFirestoreに直接保存/更新。
    *   **`LandingPageUI.tsx` (または `ImageSetList.tsx`など)**: ログインユーザーが所有する`ImageSet`の一覧をFirestoreから取得して表示。新しい`ImageSet`を作成するUIを提供。
    *   **`PeopleListItem.tsx` (更新)**: ドラッグ＆ドロップイベントのハンドラー（`onDragStart`, `onDragOver`, `onDrop`など）を実装し、視覚的なフィードバックを提供。ドロップ時に親コンポーネント（`/people/page.tsx`）のコールバックを呼び出す。
    *   **`CreateConnectionDialog.tsx` (新規)**: 人物間のコネクション作成時に表示されるダイアログ。関係の種類、理由、強さ、メモなどを入力するフォームを持つ。
    *   **`EditPersonDialog.tsx` (新規)**: 人物詳細情報を編集するためのダイアログ。
*   **`src/contexts/FaceRosterContext.tsx` (更新)**:
    *   ローカルストレージへの依存を排除。
    *   Firebase SDK (Auth, Firestore, Storage) との連携を全面的に担当。
    *   ユーザー認証状態の管理。
    *   Firestoreからのデータ読み込み (リアルタイムリスナー `onSnapshot` の活用)。
    *   Firestoreへのデータ書き込み (CRUD操作)。
    *   Cloud Storageへのファイルアップロード/ダウンロード処理。
    *   `connections`コレクションに対するCRUD操作（`addConnection`, `fetchConnectionsForPerson`など）の関数を追加。
*   **`src/lib/`**:
    *   **`firebase.ts` (新規)**: Firebaseプロジェクトの設定情報を記述し、Firebase Appインスタンスを初期化・エクスポート。
    *   **`localStorage.ts`**: アプリケーションデータの保存・読み込み処理を削除。UIテーマ設定など、ユーザーセッションに依存しないごく軽微な設定情報のみに限定的に利用（または完全に廃止）。
*   **`src/services/` (新規ディレクトリ検討)**:
    *   Firestoreの各コレクションに対するCRUD操作をカプセル化したサービス関数群 (例: `imageSetService.ts`, `personService.ts`, `connectionService.ts`) を作成。Contextやコンポーネントはこれらのサービスを呼び出す。
*   **`src/ai/`**:
    *   将来的に、Cloud FunctionsからGenkitフローを呼び出すためのコードを配置。
        *   例: 画像がCloud Storageにアップロードされたのをトリガーに、顔認識を実行し、`people`コレクションのデータと照合する、といった処理を記述。

## 6. データフロー (主要な変更点)

1.  **ユーザー認証**:
    *   アプリ起動時、Firebase SDKを通じて認証状態を確認。
    *   未認証ならログイン/新規登録ページへリダイレクト。
    *   認証後は、ユーザーIDに基づいてパーソナライズされたデータを表示。
2.  **画像アップロードと名簿(Roster)作成**:
    *   `ImageUploadForm`から画像が選択されると、Cloud Storageにアップロード。
    *   アップロード成功後、`rosters`コレクションに新しいドキュメントを作成。このドキュメントには、画像のStorageパス、所有者ユーザーID、名簿名などが保存される。
3.  **顔領域の登録と人物(People)情報作成/関連付け**:
    *   `ImageCanvas`で顔領域を描画後、「名簿を作成」または「人物を追加」といった操作を行う。
    *   各顔領域について:
        *   顔画像を切り抜き、Cloud Storageにアップロード。
        *   `people`コレクション内で既存の人物を検索 (将来的なAI機能)、または新規に人物ドキュメントを作成。
        *   人物ドキュメントに顔画像のStorageパス、名前などの情報を保存/更新。
        *   現在の`rosters`ドキュメントと、この`people`ドキュメントを関連付ける (例: `rosters`ドキュメント内に`peopleIds`配列を持つか、`people`ドキュメント内に`rosterIds`配列を持つなど、設計による)。
4.  **データ表示と編集**:
    *   各コンポーネントは、主にFirestoreのリアルタイムリスナー (`onSnapshot`) を用いて、データの変更を即座にUIに反映。
    *   `RosterItemDetail`での編集は、対応する`people`ドキュメントおよび関連する`rosters`ドキュメントを直接更新。
5.  **検索**:
    *   ユーザーが検索UI（未実装）で条件を入力すると、Firestoreのクエリを発行し、`people`コレクションや`rosters`コレクションから合致するデータを取得して表示。
6.  **コネクション作成のUIフロー (ドラッグ＆ドロップ)** (新規):
    *   ユーザーが`/people`ページで人物カード（`PeopleListItem`）を別の人物カードへドラッグ＆ドロップする。
    *   ドラッグ中、ドラッグされているカードの見た目が変わる（例: 半透明になる）。ドロップ可能なターゲットカードは、マウスオーバー時にハイライトされる（例: 青い枠線が表示される）。
    *   ドロップが成功すると、`CreateConnectionDialog`コンポーネントが表示される。
    *   ダイアログには、ドラッグ元の人物（ソース）とドロップ先の人物（ターゲット）が示される。
    *   ユーザーはダイアログ内で、関係の種類（`types`、カンマ区切りで複数入力可）、理由（`reasons`、カンマ区切りで複数入力可）、関係の強さ（`strength`、数値、任意）、メモ（`notes`、任意）を入力する。
    *   「保存」ボタンをクリックすると、`FaceRosterContext`の`addConnection`関数が呼び出される。
    *   `addConnection`関数は、Firestoreの`connections`コレクションに新しいドキュメントを作成する。この際、`fromPersonId`にはドラッグ元の人物IDが、`toPersonId`にはドロップ先の人物IDが設定される。これにより、親子関係や上司部下関係のような非対称な関係性も、ドラッグの方向と入力された`type`によって表現される。
7.  **コネクションデータの管理**:
    *   専用UI (未実装) を通じて、`people`コレクション内の人物間に`connections`ドキュメントを作成・編集・削除する。`FaceRosterContext`に用意された`addConnection`, `fetchConnectionsForPerson`, `updateConnection`, `deleteConnection`関数が利用される。

## 7. 認証とセキュリティルール

*   **Firebase Authentication**: ユーザーのサインアップ、ログイン、ログアウト、セッション管理を担当。
*   **Cloud Firestore セキュリティルール**:
    *   ユーザーは自身のデータ（自分が作成した`rosters`、自分が追加した`people`、自分が関与する`connections`など）のみ読み書きできるように設定。
    *   `users`コレクションのドキュメントは、対応するUIDのユーザーのみが読み書き可能。
    *   `connections`コレクションのセキュリティルールでは、`fromPersonId` または `toPersonId` に紐づく`people`ドキュメントの`addedBy`が認証ユーザーのUIDと一致する場合などに読み書きを許可する、といった設定を検討。
*   **Cloud Storage セキュリティルール**:
    *   認証されたユーザーのみが画像をアップロード可能。
    *   ユーザーは自身がアップロードした画像、または自身がアクセス権を持つ`rosters`に関連付けられた画像のみ読み取り可能。

## 8. 次のステップ (概要)

1.  FirebaseプロジェクトのセットアップとアプリへのSDK導入。
2.  Firebase Authenticationを用いた認証機能の実装。
3.  Cloud Firestoreのデータベース設計に基づいたコレクション作成とセキュリティルール設定。
4.  Cloud Storageのセットアップとセキュリティルール設定。
5.  画像アップロード処理をCloud Storage連携に変更。
6.  名簿作成・人物登録処理をFirestore連携に変更。
7.  データ表示・編集処理をFirestore連携に変更。
8.  `FaceRosterContext`をFirebase連携中心にリファクタリング。
9.  ランディングページを、ログインユーザーの`ImageSet`（または`Roster`）一覧表示に変更。
10. エラーハンドリングと状態管理の改善。
11. **`connections`コレクションの管理UIの実装 (人物詳細ページなど、コネクションの表示・編集・削除機能)。**
12. **`people`ドキュメント内の`knownAcquaintances`や`spouse`フィールドを`connections`コレクションへの参照に移行または連携させることを検討。**
13. **コネクション作成UIの改善（例：スマホでの代替操作、既存コネクションの可視化）。**

## 9. エラーハンドリング戦略

### 9.1 エラーバウンダリの実装
```typescript
class DialogErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログの送信
    console.error('Dialog error:', error, errorInfo);
    // ダイアログを安全に閉じる
    this.props.onError?.();
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

### 9.2 非同期エラーの処理
- Firestore操作のエラーはtry-catchで捕捉
- ユーザーへのフィードバックはトーストで表示
- 重要な操作は再試行オプションを提供

### 9.3 ネットワークエラーの処理
```typescript
const handleNetworkError = async (operation: () => Promise<any>) => {
  try {
    return await operation();
  } catch (error) {
    if (error.code === 'unavailable') {
      toast({
        title: 'ネットワークエラー',
        description: 'インターネット接続を確認してください',
        variant: 'destructive'
      });
    }
    throw error;
  }
};
```

## 10. テスト戦略

### 10.1 ユニットテスト
- イベントユーティリティ関数のテスト
- ダイアログ状態管理フックのテスト
- バリデーション関数のテスト

### 10.2 統合テスト
- ダイアログの開閉フロー
- データの保存・更新フロー
- エラー処理フロー

### 10.3 E2Eテスト
```typescript
// Cypress/Playwrightでの例
describe('EditPersonDialog', () => {
  it('should open dialog when clicking person card', () => {
    cy.visit('/people');
    cy.get('[data-testid="person-card"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
  });
  
  it('should prevent closing when child dialog is open', () => {
    // テストケース
  });
});
```

## 11. パフォーマンス最適化

### 11.1 レンダリング最適化
- React.memoを使用したコンポーネントのメモ化
- useMemoとuseCallbackの適切な使用
- 大きなリストの仮想化

### 11.2 データフェッチの最適化
- Firestoreクエリの最適化
- データのキャッシング戦略
- 画像の遅延読み込み

この仕様書は、アプリケーションの成長に合わせて継続的に更新されるものです。

