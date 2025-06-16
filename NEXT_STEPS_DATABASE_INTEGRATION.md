
# FaceRoster アプリケーション: データベース統合への次のステップ

このドキュメントでは、FaceRosterアプリケーションを現在のローカルストレージベースからデータベース管理（Firebaseを想定）に移行するための主要なステップを概説します。

## 1. Firebase プロジェクトのセットアップと設定

1.  **Firebase プロジェクト作成**:
    *   Firebase Console ([https://console.firebase.google.com/](https://console.firebase.google.com/)) で新しいプロジェクトを作成するか、既存のプロジェクトを使用します。

2.  **Firebase SDK のアプリへの追加**:
    *   ウェブアプリとしてFirebaseプロジェクトにアプリを登録します。
    *   提供されるFirebase SDKの設定情報（`apiKey`, `authDomain`など）をプロジェクトに安全に組み込みます（例:環境変数を利用）。
    *   Firebase SDK (`firebase`パッケージ) を `package.json` に追加します。

3.  **有効化するFirebaseサービス**:
    *   **Authentication**: ユーザー認証（メール/パスワード、Googleサインインなど）を有効にします。
    *   **Firestore**: NoSQLデータベースをセットアップします。適切なリージョンを選択します。
    *   **Storage**: 画像ファイル（元画像、顔の切り抜き画像）を保存するためのクラウドストレージをセットアップします。適切なリージョンを選択します。

## 2. 認証機能の実装

1.  **認証UIの作成**:
    *   サインアップ、ログイン、ログアウトのためのUIコンポーネントを `src/components/auth/` などに作成します。
    *   Next.jsのルートグループ（例: `(auth)/signup`, `(auth)/login`）を利用して認証関連ページを整理します。

2.  **認証ロジックの実装**:
    *   `FaceRosterContext` または新しい `AuthContext` を作成し、ユーザーの認証状態をグローバルに管理します。
    *   Firebase Authentication SDKを使用して、サインアップ、ログイン、ログアウト処理を実装します。
    *   認証状態に応じて、ページの表示/非表示やリダイレクトを制御します（例: ログインしていないユーザーはエディタにアクセスできないようにする）。

## 3. Firestore データベース設計と連携

1.  **データモデルの確認**:
    *   `src/types/index.ts` で定義した `ImageSet` と `Person` の型定義に基づいて、Firestoreのコレクションとドキュメント構造を設計します。
        *   例: `imageSets` コレクションを作成し、各ドキュメントが1つの `ImageSet` を表す。各ドキュメントには `userId` フィールドを含め、所有者ユーザーと関連付ける。

2.  **CRUD操作の実装**:
    *   `ImageSet` の作成、読み取り、更新、削除 (CRUD) を行うためのサービス関数群を `src/services/imageSetService.ts` などに作成します。これらの関数はFirebase SDK (Firestore) を使用します。
    *   これらのサービス関数を `FaceRosterContext` や関連コンポーネントから呼び出すように変更します。

## 4. Firebase Storage との連携

1.  **画像アップロード処理の変更**:
    *   ユーザーが画像をアップロードする際、画像をData URLとしてContextに保持する代わりに、Firebase Storageにアップロードします。
    *   アップロード後、Storageから返される画像のダウンロードURL（またはパス）をFirestoreの `ImageSet.originalImageStoragePath` に保存します。

2.  **顔画像の切り抜きと保存**:
    *   名簿作成時に顔画像を切り抜く際、切り抜いた画像を同様にFirebase Storageにアップロードします。
    *   各 `Person.faceImageStoragePath` に、Storage上の顔画像のパスを保存します。

3.  **画像表示**:
    *   `next/image` コンポーネントや通常の `<img>` タグで、Firestoreに保存されたStorageパスから画像を表示するようにします。
    *   Firebase StorageのダウンロードURL取得には権限が必要な場合があるため、セキュリティルールを適切に設定します。

## 5. `FaceRosterContext` のリファクタリング

1.  **ローカルストレージロジックの削除**:
    *   `loadStateFromLocalStorage`, `saveStateToLocalStorage`, `clearStateFromLocalStorage` に関連するロジックを削除します。
    *   状態の永続化はFirebaseサービスを通じて行われるようになります。

2.  **Firebaseサービスとの連携**:
    *   画像や名簿データの取得、保存、更新処理を、Firebase SDKを直接呼び出すか、ステップ3.2で作成したサービス関数を呼び出す形に変更します。
    *   `imageDataUrl` は、Storageから取得した画像のダウンロードURLを一時的に保持するために使用されるかもしれませんが、主要な状態はFirestoreから取得した `ImageSet` になります。
    *   `isProcessing` や `isLoading` の状態管理は、非同期のFirebase操作に対応するように調整します。

## 6. UIの変更と機能拡張

1.  **ランディングページの変更**:
    *   ログインしているユーザーが作成した `ImageSet` の一覧を表示するように変更します。
    *   各 `ImageSet` をクリックすると、その `ImageSet` をエディタで開けるようにします。
    *   新しい `ImageSet` を作成するためのボタン/UIを設けます（例: 画像アップロードをトリガー）。

2.  **エディタUIの変更**:
    *   特定の `ImageSet` を編集するモードになります。
    *   「保存してホームに戻る」ボタンは、変更をFirestoreに保存し、ランディングページ（`ImageSet`一覧）に戻るようにします。

3.  **`ImageSet` の命名**:
    *   ユーザーが各 `ImageSet` に名前を付けられるようにUIとロジックを追加します（例: 「Q1チームミーティング」）。

## 7. セキュリティルールの設定

1.  **Firestoreセキュリティルール**:
    *   `firestore.rules` ファイルを編集し、認証されたユーザーが自身のデータのみを読み書きできるようにルールを設定します。
    *   例: `allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;`

2.  **Firebase Storageセキュリティルール**:
    *   `storage.rules` ファイルを編集し、認証されたユーザーが自身の画像をアップロード・ダウンロードできるようにルールを設定します。
    *   例: `allow read, write: if request.auth != null && request.auth.uid == request.resource.metadata.userId;` (アップロード時にカスタムメタデータとしてuserIdを付与する場合)

## 8. エラーハンドリングと状態管理の改善

*   Firebase操作（データの読み書き、画像のアップロード/ダウンロード）に関するエラーハンドリングを強化します。
*   非同期処理に伴うローディング状態の表示をより適切に行います。

## 9. テスト

*   各機能（認証、CRUD操作、画像処理）について、手動テストまたは自動テストを実施します。

## 10. (オプション) Firebase Functions の利用検討

*   複雑なサーバーサイドロジックが必要になった場合（例: 高度な画像処理、一括処理など）、Firebase Functions (Cloud Functions for Firebase) の利用を検討します。
*   現時点では、クライアントサイドのFirebase SDKで多くのことが実現可能です。

---

このステップに従って開発を進めることで、より堅牢でスケーラブルなFaceRosterアプリケーションを構築できるでしょう。各ステップはさらに詳細なタスクに分割できます。
