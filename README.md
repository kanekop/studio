# FaceRoster - Visual People Management Platform

FaceRosterは、画像から顔を識別して視覚的な名簿（ロスター）を作成し、人物間の関係性を管理できるWebアプリケーションです。

## 🚀 概要

FaceRosterは、以下の特徴を持つパーソナル関係者管理プラットフォームです：

- **視覚的な名簿管理**: 会議のスクリーンショットや集合写真から自動的に顔を識別
- **人物情報管理**: 名前、所属、趣味、誕生日などの詳細情報を一元管理
- **関係性マッピング**: 人物間の多様な関係（同僚、友人、家族など）を記録・可視化
- **クラウド同期**: Firebase連携により、どのデバイスからでもアクセス可能

## 📚 ドキュメント

### アーキテクチャ
- [システム構成](docs/architecture/system-architecture.md) - 技術スタックと全体構成
- [データモデル](docs/architecture/data-model.md) - Firestoreのデータ構造
- [セキュリティ](docs/architecture/security.md) - 認証・認可とセキュリティルール

### 機能仕様
- [人物管理機能](docs/specifications/features/people-management.md)
- [関係性管理機能](docs/specifications/features/connection-management.md)
- [名簿管理機能](docs/specifications/features/roster-management.md)

### UI/UXデザイン
- [デザインシステム](docs/specifications/ui-ux/design-system.md)
- [インタラクションパターン](docs/specifications/ui-ux/interaction-patterns.md)

### 開発ガイド
- [セットアップガイド](docs/development/setup-guide.md)
- [コーディング規約](docs/development/coding-standards.md)
- [テスト戦略](docs/development/testing-strategy.md)

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React 18, TypeScript
- **UI**: Radix UI, Tailwind CSS, ShadCN UI
- **バックエンド**: Firebase (Authentication, Firestore, Storage)
- **AI連携**: Google Genkit (将来実装予定)

## 🚦 クイックスタート

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local

# 開発サーバーの起動
npm run dev
```

詳細なセットアップ手順は[セットアップガイド](docs/development/setup-guide.md)を参照してください。

## 📝 ライセンス

このプロジェクトはプライベートリポジトリです。無断での複製・配布は禁止されています。

## 🤝 コントリビューション

プロジェクトへの貢献方法については[コーディング規約](docs/development/coding-standards.md)を参照してください。
