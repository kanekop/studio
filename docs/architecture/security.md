# セキュリティ設計

## 概要

FaceRosterにおけるセキュリティ要件と実装方針を定義します。

## 認証・認可

### Firebase Authentication
- メール/パスワード認証
- OAuth2.0（Google）
- セッション管理はFirebaseが自動処理
- JWTトークンベースの認証

### 認可モデル
```typescript
// ユーザーは自分のデータのみアクセス可能
interface AuthorizationRule {
  resource: string;
  action: 'read' | 'write' | 'delete';
  condition: (userId: string, resourceOwnerId: string) => boolean;
}
```

## Firebaseセキュリティルール

### Firestore
```javascript
// 基本原則：ユーザーは自分のデータのみアクセス可能
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// カスケード削除の防止
match /people/{personId} {
  allow delete: if request.auth != null && 
    request.auth.uid == resource.data.addedBy &&
    !existsRelatedConnections(personId);
}
```

### Cloud Storage
```javascript
// ユーザーごとのディレクトリ分離
match /users/{userId}/{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  // ファイルサイズ制限
  allow write: if request.resource.size < 10 * 1024 * 1024; // 10MB
}
```

## データ保護

### 個人情報の取り扱い
- PII（個人識別情報）の最小化
- 顔画像は別途暗号化ストレージに保存
- ログに個人情報を含めない

### データ暗号化
- 通信：HTTPS（TLS 1.3）
- 保存時：Firebase自動暗号化
- クライアント側暗号化（将来検討）

## 入力検証

### クライアント側
```typescript
// XSS対策
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
};

// SQLインジェクション対策（Firestoreは自動的に対策済み）
```

### サーバー側（Cloud Functions）
```typescript
// レート制限
const rateLimit = functions.runWith({
  minInstances: 0,
  maxInstances: 10,
}).https.onRequest(async (req, res) => {
  // IPアドレスごとのレート制限
  if (await isRateLimited(req.ip)) {
    res.status(429).send('Too Many Requests');
    return;
  }
});
```

## アクセス制御

### CORS設定
```typescript
// Firebase Hosting自動設定
// カスタムドメインのみ許可
const allowedOrigins = [
  'https://faceroster.app',
  'https://faceroster.web.app',
  'http://localhost:3000' // 開発環境
];
```

### CSRFトークン
- Firebaseが自動的に処理
- カスタムAPIでは実装必要

## 監査とロギング

### アクセスログ
```typescript
// 重要操作のログ記録
interface AuditLog {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}
```

### セキュリティイベント
- ログイン失敗の記録
- 不正アクセス試行の検出
- 異常なデータアクセスパターン

## プライバシー

### データ収集の最小化
- 必要最小限の情報のみ収集
- オプトイン方式
- データ保持期間の設定

### ユーザーの権利
- データエクスポート機能
- アカウント削除機能
- データ修正機能

## インシデント対応

### 対応フロー
1. 検出：自動監視またはユーザー報告
2. 評価：影響範囲の特定
3. 封じ込め：被害の拡大防止
4. 根絶：原因の除去
5. 復旧：正常状態への回復
6. 事後対応：再発防止策の実施

### 連絡体制
- セキュリティチーム：security@faceroster.app
- 24時間以内の初期対応
- 影響を受けるユーザーへの通知

## セキュリティテスト

### 定期的な実施項目
- 脆弱性スキャン（月次）
- ペネトレーションテスト（年次）
- 依存関係の脆弱性チェック（週次）

### 自動化
```json
// package.json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:check": "snyk test"
  }
}
```

## コンプライアンス

### 準拠する規制
- GDPR（EU一般データ保護規則）
- 個人情報保護法（日本）
- CCPA（カリフォルニア州消費者プライバシー法）

### セキュリティ標準
- OWASP Top 10への対策
- ISO 27001準拠（将来目標）
- SOC 2 Type II（将来目標） 