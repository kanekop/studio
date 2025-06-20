# セットアップガイド

## 前提条件

### 必要なソフトウェア
- Node.js v18.0.0以上
- npm v9.0.0以上
- Git
- コードエディタ（VS Code推奨）

### 推奨環境
- OS: Windows 10/11, macOS 12以上, Ubuntu 20.04以上
- メモリ: 8GB以上
- ディスク容量: 2GB以上の空き容量

## 環境構築手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/kanekop/studio.git faceroster
cd faceroster
```

### 2. 依存関係のインストール

```bash
npm install
```

エラーが発生した場合:
```bash
# キャッシュクリア
npm cache clean --force

# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### 3. Firebase プロジェクトのセットアップ

#### 3.1 Firebaseプロジェクトの作成
1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力（例: `faceroster-dev`）
4. Google Analyticsは任意で設定

#### 3.2 必要なサービスの有効化
- **Authentication**
  - メール/パスワード認証を有効化
  - （オプション）Google認証を有効化
  
- **Firestore Database**
  - 「データベースを作成」をクリック
  - 本番モードで開始（後でルールを設定）
  - リージョンを選択（asia-northeast1推奨）
  
- **Storage**
  - 「開始」をクリック
  - 本番モードで開始
  - 同じリージョンを選択

#### 3.3 Firebase設定の取得
1. プロジェクト設定 > 全般
2. 「アプリを追加」> 「ウェブ」を選択
3. アプリ名を入力（例: `faceroster-web`）
4. Firebase SDKの設定をコピー

### 4. 環境変数の設定

`.env.local`ファイルを作成:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Optional: For Analytics
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Development Settings
NEXT_PUBLIC_APP_ENV=development
```

### 5. Firebaseセキュリティルールの設定

#### Firestore Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // ロスターは所有者のみアクセス可能
    match /rosters/{rosterId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.ownerId;
    }
    
    // 人物データは追加者のみアクセス可能
    match /people/{personId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.addedBy;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.addedBy;
    }
    
    // コネクションは関連する人物の所有者がアクセス可能
    match /connections/{connectionId} {
      allow read, write: if request.auth != null && 
        (exists(/databases/$(database)/documents/people/$(resource.data.fromPersonId)) &&
         get(/databases/$(database)/documents/people/$(resource.data.fromPersonId)).data.addedBy == request.auth.uid);
    }
  }
}
```

#### Storage Rules (`storage.rules`)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ユーザーは自分のフォルダのみアクセス可能
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 6. 開発サーバーの起動

```bash
# 通常モード
npm run dev

# Turbopack使用（高速）
npm run dev -- --turbo

# カスタムポート
npm run dev -- -p 3001
```

ブラウザで http://localhost:3000 にアクセス

## トラブルシューティング

### よくある問題と解決方法

#### 1. `next`コマンドが見つからない
```bash
# グローバルインストール
npm install -g next

# または npx を使用
npx next dev
```

#### 2. Firebase認証エラー
- APIキーが正しいか確認
- Firebaseプロジェクトでドメインが承認されているか確認
- localhost:3000 を承認済みドメインに追加

#### 3. TypeScriptエラー
```bash
# 型定義の再生成
npm run type-check

# 型エラーを無視して起動
npm run dev -- --ts-ignore
```

## VS Code推奨設定

### 拡張機能
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin
- Firebase

### settings.json
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## 次のステップ

セットアップが完了したら：
1. [コーディング規約](./coding-standards.md)を確認
2. [アーキテクチャドキュメント](../architecture/system-architecture.md)を理解
3. 開発を開始！ 