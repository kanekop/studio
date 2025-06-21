# FaceRoster ローカル環境セットアップガイド - Agent向け指示書

## 📋 前提条件の確認

### 必要なソフトウェア
1. **Node.js**（バージョン18以上）
   ```bash
   # バージョン確認
   node --version
   # v18.0.0以上であることを確認
   ```

2. **Git**
   ```bash
   # バージョン確認
   git --version
   ```

3. **npm**（Node.jsに付属）
   ```bash
   # バージョン確認
   npm --version
   ```

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
# GitHubからクローン
git clone https://github.com/kanekop/studio.git faceroster

# プロジェクトディレクトリに移動
cd faceroster
```

### 2. 依存関係のインストール

```bash
# package.jsonに記載された依存関係をインストール
npm install

# インストールでエラーが発生した場合
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 3. Firebase設定の確認

現在の設定状況：
- **Firebase設定はハードコード済み**（`src/lib/firebase.ts`）
- 追加の環境変数設定は不要
- インターネット接続があればローカルからFirebaseにアクセス可能

### 4. 開発サーバーの起動

```bash
# 開発サーバーを起動（ポート9002）
npm run dev

# 正常に起動した場合の表示例：
#   ▲ Next.js 15.3.3
#   - Local:        http://localhost:9002
#   - Environments: .env.local
# 
#   ✓ Starting...
#   ✓ Ready in 2.1s
```

### 5. ブラウザでアクセス

1. ブラウザを開く（Chrome推奨）
2. `http://localhost:9002` にアクセス
3. ログインページが表示されることを確認

## 🔧 トラブルシューティング

### ポート9002が使用中の場合

```bash
# 別のポートで起動
npm run dev -- -p 3000

# または、使用中のプロセスを確認（Windows）
netstat -ano | findstr :9002

# プロセスを終了（Windows）
taskkill /PID [プロセスID] /F
```

### Firebase接続エラーが出る場合

1. **インターネット接続を確認**
   - Firebaseはクラウドサービスのため、インターネット接続が必須

2. **Firebase Consoleで確認**
   - [Firebase Console](https://console.firebase.google.com/)にアクセス
   - 該当プロジェクトが存在することを確認
   - Authentication > Settings > 承認済みドメインに`localhost`があることを確認

3. **ブラウザの開発者ツールで確認**
   - F12キーで開発者ツールを開く
   - Consoleタブでエラーメッセージを確認
   - NetworkタブでFirebaseへのリクエストが失敗していないか確認

### 依存関係のインストールエラー

```bash
# Node.jsのバージョンが古い場合
# Node Version Manager (nvm)を使用してアップグレード

# npmのキャッシュクリア
npm cache clean --force

# グローバルパッケージの更新
npm update -g npm
```

## ✅ 動作確認チェックリスト

### 初期表示
- [ ] ログインページが表示される
- [ ] コンソールにエラーが表示されていない
- [ ] ネットワークタブでFirebaseへの接続が成功している

### 認証機能
- [ ] テストアカウントでログインできる
- [ ] ログイン後、メインページにリダイレクトされる
- [ ] ヘッダーにユーザー情報が表示される

### 基本機能
- [ ] 画像アップロード機能が動作する
- [ ] Canvas上で矩形選択ができる
- [ ] Rosterの作成ができる（CORSエラーが出る場合は既知の問題）

## 📝 開発時の便利なコマンド

```bash
# 開発サーバー起動（ホットリロード付き）
npm run dev

# TypeScriptの型チェック
npm run typecheck

# ESLintでコード品質チェック
npm run lint

# プロダクションビルド（動作確認用）
npm run build
npm start
```

## 🔍 ログの確認方法

### サーバーサイドログ
- ターミナル（npm run devを実行した画面）に表示

### クライアントサイドログ
1. ブラウザでF12キーを押して開発者ツールを開く
2. Consoleタブでログを確認
3. `console.log`の出力が表示される

## 🚨 重要な注意事項

1. **Firebase設定**
   - 現在はハードコードされているため、別のFirebaseプロジェクトを使用する場合は`src/lib/firebase.ts`の編集が必要

2. **CORS設定**
   - ローカル開発では通常問題ないが、画像処理で問題が発生する可能性あり
   - 既知の問題として対応中

3. **認証情報**
   - Firebaseの認証情報はリポジトリに含まれているため、プライベートリポジトリでの管理を推奨

## 🎯 セットアップ完了の確認

以下が確認できれば、ローカル環境のセットアップは完了です：

1. `npm run dev`でエラーなくサーバーが起動する
2. `http://localhost:9002`でアプリケーションが表示される
3. ログイン機能が動作する
4. 基本的な画面遷移ができる

---

このガイドに従ってセットアップを行えば、FaceRosterをローカル環境で動作させることができます。問題が発生した場合は、トラブルシューティングセクションを参照してください。