# デザインシステム

## 概要

FaceRosterの統一されたビジュアルデザインとインタラクションパターンを定義します。

## デザイン原則

### 1. 視覚的な直感性
- 顔写真を中心とした情報表示
- アイコンと色による情報の分類

### 2. シンプルで親しみやすい
- 余白を活かしたクリーンなデザイン
- 柔らかい色調と角丸を多用

### 3. レスポンシブ対応
- モバイルファーストの設計
- タブレット・デスクトップへの最適化

## ナビゲーション

### メインナビゲーション構成

FaceRosterは4つの主要セクションで構成されます：

```
[Logo] FaceRoster    🏠 Home | 📸 Rosters | 👥 People | 🔗 Network
```

#### 各セクションの役割

1. **Home（ホーム）**
   - ダッシュボード機能
   - AIプロンプト検索
   - 最近のアクティビティ
   - クイックアクション
   - 統計情報表示

2. **Rosters（名簿）**
   - 画像コレクション管理
   - 過去の名簿の閲覧・編集
   - タグやイベントでの整理
   - 名簿のお気に入り管理

3. **People（人物）**
   - 人物データベース
   - リスト/ギャラリー表示切替
   - 詳細プロフィール編集
   - 写真履歴管理

4. **Network（ネットワーク）**
   - 関係性の可視化
   - コネクション管理
   - 関係性マップ表示
   - グループ管理

### ホーム画面レイアウト

```
┌─────────────────────────────────────────────┐
│  🔍 なんでも検索...                         │  <- AIプロンプト検索
├─────────────────────────────────────────────┤
│                                             │
│  最近のアクティビティ    クイックアクション │
│  ┌─────────────┐       ┌─────────────┐   │
│  │・新規追加    │       │ [📸] 新規   │   │
│  │  山田さん    │       │     作成     │   │
│  │・更新        │       │              │   │
│  │  田中さん    │       │ [📁] 最近の │   │
│  │・コネクション│       │    名簿     │   │
│  │  鈴木⇔佐藤  │       │              │   │
│  └─────────────┘       └─────────────┘   │
│                                             │
│  統計情報                                   │
│  ┌─────────────────────────────────────┐  │
│  │ 登録人数: 127人 | コネクション: 89   │  │
│  │ 今月の新規: 12人 | 名簿数: 15        │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### ナビゲーションUI仕様

#### デスクトップ表示
```html
<header class="sticky top-0 z-50 bg-white border-b">
  <div class="container flex h-14 items-center">
    <!-- ロゴ -->
    <a href="/" class="mr-8 flex items-center">
      <SmilePlus class="h-6 w-6 mr-2" />
      <span class="font-bold">FaceRoster</span>
    </a>
    
    <!-- メインナビゲーション -->
    <nav class="flex items-center space-x-6 text-sm font-medium">
      <a href="/" class="flex items-center hover:text-primary">
        <Home class="h-4 w-4 mr-2" />
        Home
      </a>
      <a href="/rosters" class="flex items-center hover:text-primary">
        <Camera class="h-4 w-4 mr-2" />
        Rosters
      </a>
      <a href="/people" class="flex items-center hover:text-primary">
        <Users class="h-4 w-4 mr-2" />
        People
      </a>
      <a href="/network" class="flex items-center hover:text-primary">
        <Network class="h-4 w-4 mr-2" />
        Network
      </a>
    </nav>
    
    <!-- 右側ユーティリティ -->
    <div class="ml-auto flex items-center space-x-4">
      <button class="relative">
        <Bell class="h-5 w-5" />
        <span class="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
      </button>
      <UserMenu />
    </div>
  </div>
</header>
```

#### モバイル表示（ボトムナビゲーション）
```html
<nav class="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
  <div class="flex justify-around">
    <a href="/" class="flex flex-col items-center py-2 px-3">
      <Home class="h-6 w-6" />
      <span class="text-xs mt-1">Home</span>
    </a>
    <a href="/rosters" class="flex flex-col items-center py-2 px-3">
      <Camera class="h-6 w-6" />
      <span class="text-xs mt-1">Rosters</span>
    </a>
    <a href="/people" class="flex flex-col items-center py-2 px-3">
      <Users class="h-6 w-6" />
      <span class="text-xs mt-1">People</span>
    </a>
    <a href="/network" class="flex flex-col items-center py-2 px-3">
      <Network class="h-6 w-6" />
      <span class="text-xs mt-1">Network</span>
    </a>
  </div>
</nav>
```

### アクティブ状態の表示

```css
/* 現在のページをハイライト */
.nav-link {
  position: relative;
  color: var(--gray-600);
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--primary-600);
}

.nav-link.active {
  color: var(--primary-600);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-600);
}

/* モバイルのアクティブ状態 */
.mobile-nav-link.active {
  color: var(--primary-600);
  background: var(--primary-50);
  border-radius: 0.5rem;
}
```

### 検索バーのデザイン

```css
.search-bar {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  padding-left: var(--spacing-10);
  border: 2px solid var(--gray-200);
  border-radius: 9999px;
  font-size: var(--text-base);
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-400);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  left: var(--spacing-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
}
```

## カラーパレット

### プライマリカラー
```css
:root {
  /* メインブランドカラー */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  
  /* セカンダリカラー */
  --secondary-50: #f0f9ff;
  --secondary-100: #e0f2fe;
  --secondary-500: #0ea5e9;
  
  /* アクセントカラー */
  --accent-orange: #fb923c;
  --accent-pink: #ec4899;
  --accent-green: #10b981;
}
```

### セマンティックカラー
```css
:root {
  /* 成功・エラー・警告 */
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  
  /* グレースケール */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-500: #6b7280;
  --gray-900: #111827;
}
```

## タイポグラフィ

### フォントファミリー
```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", 
               "Noto Sans JP", sans-serif;
  --font-mono: "SF Mono", Monaco, "Cascadia Code", monospace;
}
```

### フォントサイズ
```css
:root {
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
}
```

## スペーシング

### 基本単位
```css
:root {
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-5: 1.25rem;  /* 20px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  --spacing-10: 2.5rem;  /* 40px */
  --spacing-12: 3rem;    /* 48px */
}
```

## コンポーネントスタイル

### ボタン

#### プライマリボタン
```css
.btn-primary {
  background: var(--primary-600);
  color: white;
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-700);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

#### セカンダリボタン
```css
.btn-secondary {
  background: white;
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: 0.375rem;
}
```

### カード

#### 人物カード
```css
.person-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: 0.75rem;
  padding: var(--spacing-4);
  transition: all 0.2s;
  cursor: pointer;
}

.person-card:hover {
  border-color: var(--primary-300);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}
```

### ダイアログ

#### 基本構造
```css
.dialog {
  background: white;
  border-radius: 1rem;
  padding: var(--spacing-6);
  max-width: 90vw;
  max-height: 90vh;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.dialog-header {
  font-size: var(--text-xl);
  font-weight: 600;
  margin-bottom: var(--spacing-4);
}

.dialog-footer {
  display: flex;
  gap: var(--spacing-2);
  justify-content: flex-end;
  margin-top: var(--spacing-6);
}
```

## アニメーション

### トランジション
```css
:root {
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}
```

### ホバーエフェクト
```css
@keyframes hover-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

.hover-bounce:hover {
  animation: hover-bounce 0.4s ease-in-out;
}
```

### ドラッグステート
```css
.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  cursor: grabbing;
}

.drag-over {
  background: var(--primary-50);
  border-color: var(--primary-500);
}
```

## レイアウトパターン

### グリッドシステム
```css
.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-4);
}

@media (min-width: 768px) {
  .people-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--spacing-6);
  }
}
```

### フレックスレイアウト
```css
.sidebar-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--gray-200);
}

.main-content {
  flex: 1;
  overflow-y: auto;
}
```

## z-indexの管理

```css
:root {
  --z-dropdown: 1000;
  --z-dialog: 1100;
  --z-dialog-overlay: 1090;
  --z-tooltip: 1200;
  --z-notification: 1300;
  --z-drag-overlay: 1400;
}
```

## アクセシビリティ

### フォーカススタイル
```css
:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

.focus-within:focus-within {
  box-shadow: 0 0 0 2px var(--primary-500);
}
```

### コントラスト
- 通常テキスト: 4.5:1以上
- 大きなテキスト: 3:1以上
- インタラクティブ要素: 3:1以上

## ダークモード（将来実装）

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0f172a;
    --foreground: #f8fafc;
    /* その他のダークモード変数 */
  }
}