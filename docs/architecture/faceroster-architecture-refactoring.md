# FaceRoster アーキテクチャリファクタリング提案書

## エグゼクティブサマリー

FaceRosterプロジェクトの現在のコード構造を分析した結果、UI/UX層とビジネスロジック層をより明確に分離することで、開発効率の向上、保守性の改善、チーム開発の円滑化が実現できると判断しました。本提案書では、段階的な移行計画と共に、新しいアーキテクチャ構造を提示します。

## 現状分析

### 現在の構造における強み
- `components/` が `ui/` と `features/` に分離されている
- `contexts/` による状態管理の集約
- `hooks/` によるロジックの再利用
- `lib/` でのユーティリティ関数の整理

### 改善機会
- UIコンポーネント内にビジネスロジックが混在
- データアクセス層が明確でない
- AI機能とコア機能の境界が曖昧
- 機能間の依存関係が複雑

## 提案するアーキテクチャ

### レイヤード・アーキテクチャの採用

```
src/
├── app/                    # Next.js App Router（ルーティング層）
│   ├── (auth)/            # 認証関連ページ
│   ├── (main)/            # メインアプリケーション
│   └── api/               # APIエンドポイント
│
├── presentation/          # 🎨 プレゼンテーション層
│   ├── components/        # UIコンポーネント
│   │   ├── common/        # 汎用UIコンポーネント（Button, Card等）
│   │   ├── layouts/       # レイアウトコンポーネント
│   │   └── features/      # 機能別UIコンポーネント
│   │       ├── people/    # 人物管理UI
│   │       ├── connections/ # 関係性管理UI
│   │       └── rosters/   # 名簿管理UI
│   ├── hooks/             # UI関連のカスタムフック
│   └── styles/            # グローバルスタイル、テーマ
│
├── domain/                # 💼 ドメイン層（ビジネスロジック）
│   ├── entities/          # ドメインエンティティ
│   │   ├── Person.ts      # 人物エンティティ
│   │   ├── Connection.ts  # 関係性エンティティ
│   │   └── Roster.ts      # 名簿エンティティ
│   ├── repositories/      # リポジトリインターフェース
│   │   ├── IPeopleRepository.ts
│   │   └── IConnectionRepository.ts
│   ├── services/          # ドメインサービス
│   │   ├── people/        # 人物管理サービス
│   │   │   ├── PeopleService.ts
│   │   │   └── PeopleMergeService.ts
│   │   ├── connections/   # 関係性管理サービス
│   │   │   └── ConnectionAnalyzer.ts
│   │   └── ai/           # AI関連サービス
│   │       ├── FaceRecognitionService.ts
│   │       └── MergeSuggestionService.ts
│   └── use-cases/        # ユースケース（複雑な処理フロー）
│       ├── CreateConnectionUseCase.ts
│       └── MergePeopleUseCase.ts
│
├── infrastructure/        # 🔧 インフラストラクチャ層
│   ├── firebase/         # Firebase実装
│   │   ├── config.ts     # Firebase設定
│   │   ├── repositories/ # リポジトリ実装
│   │   │   ├── FirebasePeopleRepository.ts
│   │   │   └── FirebaseConnectionRepository.ts
│   │   └── storage/      # Storage操作
│   └── external-apis/    # 外部API連携
│
├── application/          # 🔄 アプリケーション層
│   ├── contexts/         # React Context（UIとドメインの橋渡し）
│   │   ├── AuthContext.tsx
│   │   ├── PeopleContext.tsx
│   │   └── ConnectionContext.tsx
│   └── providers/        # Context Provider
│
└── shared/              # 📦 共有リソース
    ├── types/           # 型定義
    ├── utils/           # ユーティリティ関数
    ├── constants/       # 定数定義
    └── errors/          # カスタムエラークラス
```

## 具体的な実装例

### Before: 現在の実装（UIとロジックの混在）

```typescript
// src/components/features/PeopleListItem.tsx
const PeopleListItem = ({ person, onEditClick }) => {
  const { allUserConnections } = useConnections();
  
  // ビジネスロジックがUIコンポーネント内に存在
  const connectionData = useMemo(() => {
    const relatedConnections = allUserConnections.filter(
      conn => conn.fromPersonId === person.id || conn.toPersonId === person.id
    );
    
    const categorizedConnections = {
      general: 0,
      family: 0,
      professional: 0,
      partner: 0
    };
    
    relatedConnections.forEach(conn => {
      conn.types.forEach(type => {
        if (GENERAL_CONNECTION_TYPES.includes(type)) categorizedConnections.general++;
        // ... 複雑な分類ロジック
      });
    });
    
    return categorizedConnections;
  }, [person.id, allUserConnections]);
  
  return <Card>...</Card>;
};
```

### After: 改善後の実装（責務の分離）

```typescript
// src/domain/services/connections/ConnectionAnalyzer.ts
export class ConnectionAnalyzer {
  static analyzePersonConnections(
    personId: string,
    allConnections: Connection[]
  ): ConnectionSummary {
    const relatedConnections = this.filterRelatedConnections(personId, allConnections);
    return this.categorizeConnections(relatedConnections);
  }
  
  private static filterRelatedConnections(
    personId: string,
    connections: Connection[]
  ): Connection[] {
    return connections.filter(
      conn => conn.fromPersonId === personId || conn.toPersonId === personId
    );
  }
  
  private static categorizeConnections(connections: Connection[]): ConnectionSummary {
    // ビジネスロジックをここに集約
    const summary = new ConnectionSummary();
    // ... 分類ロジック
    return summary;
  }
}

// src/presentation/hooks/usePersonConnections.ts
export function usePersonConnections(personId: string): ConnectionSummary {
  const { allUserConnections } = useConnections();
  
  return useMemo(() => 
    ConnectionAnalyzer.analyzePersonConnections(personId, allUserConnections),
    [personId, allUserConnections]
  );
}

// src/presentation/components/features/people/PeopleListItem.tsx
const PeopleListItem = ({ person, onEditClick }) => {
  // UIは表示に専念
  const connectionSummary = usePersonConnections(person.id);
  
  return (
    <Card>
      <ConnectionBadges summary={connectionSummary} />
      {/* 純粋なUI表示ロジック */}
    </Card>
  );
};
```

## 移行計画

### Phase 1: 基盤整備（Week 1）

#### タスク
1. 新ディレクトリ構造の作成
2. 共有リソースの移動
   - `types/` → `shared/types/`
   - 定数定義の集約
3. インフラストラクチャ層の確立
   - Firebase設定の移動
   - リポジトリインターフェースの定義

#### 成果物
- 新しいフォルダ構造
- 型定義の整理
- リポジトリパターンの基盤

### Phase 2: ドメイン層の構築（Week 2-3）

#### タスク
1. エンティティクラスの作成
2. ドメインサービスの実装
   - 既存Contextからビジネスロジックを抽出
   - 純粋関数として再実装
3. リポジトリ実装
   - Firebaseアクセスの抽象化

#### 成果物
- 独立したビジネスロジック層
- テスト可能なドメインサービス
- データアクセスの統一化

### Phase 3: プレゼンテーション層の整理（Week 4）

#### タスク
1. UIコンポーネントからロジックを除去
2. カスタムフックの整理
   - UIロジックとビジネスロジックの分離
3. コンポーネントの再構成

#### 成果物
- 純粋なUIコンポーネント
- 再利用可能なカスタムフック
- Storybookでのコンポーネントカタログ（オプション）

### Phase 4: 統合とテスト（Week 5）

#### タスク
1. 新旧コードの並行稼働確認
2. 段階的な切り替え
3. E2Eテストの実施

## 期待される効果

### 1. 開発効率の向上
- **責務の明確化**: 各開発者が担当領域に集中可能
- **並行開発**: UI開発とロジック開発を独立して進行
- **コードの再利用**: ビジネスロジックを異なるUIで活用

### 2. 保守性の改善
- **変更の局所化**: 修正の影響範囲が明確
- **テスタビリティ**: 各層を独立してテスト可能
- **ドキュメント化**: 構造が自己文書化される

### 3. スケーラビリティ
- **新機能の追加**: 配置場所が明確で迷わない
- **技術の変更**: UI層の変更がビジネスロジックに影響しない
- **チーム拡大**: 新メンバーの学習コストが低下

### 4. 品質向上
- **バグの減少**: 責務分離によりバグの混入が減少
- **パフォーマンス**: 各層で最適化が可能
- **型安全性**: インターフェースによる契約の明確化

## リスクと対策

### リスク
1. **移行期間中の混乱**: 新旧構造の並存
2. **学習コスト**: チームメンバーの新構造への適応
3. **過度な抽象化**: 必要以上に複雑な構造

### 対策
1. **段階的移行**: 機能単位で少しずつ移行
2. **ドキュメント整備**: アーキテクチャガイドの作成
3. **レビュープロセス**: 過度な抽象化を防ぐレビュー

## 成功指標

- コンポーネントの平均行数が50%削減
- ユニットテストのカバレッジが80%以上
- 新機能の実装時間が30%短縮
- バグ発生率が40%減少

## まとめ

この新しいアーキテクチャにより、FaceRosterは以下を実現します：

1. **明確な責務分離**: 各層が単一の責任を持つ
2. **高い保守性**: 変更に強い構造
3. **優れた開発体験**: 開発者が迷わない構造
4. **ビジネス価値**: 素早い機能追加と高品質

段階的な移行により、リスクを最小限に抑えながら、プロジェクトの長期的な成功を確保します。