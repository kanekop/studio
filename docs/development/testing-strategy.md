# テスト戦略

## 概要

FaceRosterの品質を保証するための包括的なテスト戦略を定義します。

## テストピラミッド

```
     /\
    /  \    E2Eテスト（10%）
   /    \   - ユーザーシナリオ
  /------\  統合テスト（30%）
 /        \ - API連携、コンポーネント間
/----------\単体テスト（60%）
            - 関数、コンポーネント
```

## 単体テスト

### 対象
- ユーティリティ関数
- カスタムフック
- 個別コンポーネント
- ビジネスロジック

### ツール
- Jest
- React Testing Library
- @testing-library/user-event

### 実装例
```typescript
// PersonCard.test.tsx
describe('PersonCard', () => {
  const mockPerson: Person = {
    id: '1',
    name: '山田太郎',
    company: '株式会社ABC',
    // ... その他のプロパティ
  };

  it('人物名を表示する', () => {
    render(<PersonCard person={mockPerson} />);
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
  });

  it('クリックで編集ダイアログを開く', async () => {
    const user = userEvent.setup();
    render(<PersonCard person={mockPerson} />);
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

## 統合テスト

### 対象
- 複数コンポーネントの連携
- Context/State管理
- Firebase連携
- ルーティング

### 実装例
```typescript
// PeopleManagement.integration.test.tsx
describe('人物管理機能', () => {
  beforeEach(() => {
    // Firebaseモック設定
    mockFirebase();
  });

  it('新規人物を作成して一覧に表示', async () => {
    const user = userEvent.setup();
    render(<PeopleManagementPage />);
    
    // 新規作成ボタンをクリック
    await user.click(screen.getByText('新規人物'));
    
    // フォーム入力
    await user.type(screen.getByLabelText('名前'), '佐藤花子');
    await user.type(screen.getByLabelText('会社'), '株式会社XYZ');
    
    // 保存
    await user.click(screen.getByText('保存'));
    
    // 一覧に表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('佐藤花子')).toBeInTheDocument();
    });
  });
});
```

## E2Eテスト

### ツール
- Playwright または Cypress

### 主要シナリオ
```typescript
// e2e/user-journey.spec.ts
test('ユーザージャーニー：初回利用', async ({ page }) => {
  // 1. サインアップ
  await page.goto('/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Test123!');
  await page.click('button:has-text("登録")');
  
  // 2. 画像アップロード
  await page.click('text=新しい名簿');
  await page.setInputFiles('input[type="file"]', 'test-image.jpg');
  
  // 3. 顔識別と人物登録
  await page.click('.face-region');
  await page.fill('[name="name"]', 'テスト太郎');
  await page.click('button:has-text("保存")');
  
  // 4. 確認
  await expect(page.locator('text=テスト太郎')).toBeVisible();
});
```

## パフォーマンステスト

### 計測項目
- 初期読み込み時間
- インタラクション応答時間
- メモリ使用量
- バンドルサイズ

### 実装
```typescript
// performance.test.ts
describe('パフォーマンス', () => {
  it('人物リストの初期表示が3秒以内', async () => {
    const startTime = performance.now();
    render(<PeopleList people={generateMockPeople(1000)} />);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(3000);
  });
});
```

## アクセシビリティテスト

### ツール
- jest-axe
- Lighthouse CI

### 実装例
```typescript
// a11y.test.tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('アクセシビリティ', () => {
  it('PersonCardにアクセシビリティ違反がない', async () => {
    const { container } = render(<PersonCard person={mockPerson} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## ビジュアルリグレッションテスト

### ツール
- Chromatic（Storybook連携）
- Percy

### 設定
```typescript
// .storybook/main.js
module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
};

// PersonCard.stories.tsx
export default {
  title: 'Components/PersonCard',
  component: PersonCard,
};

export const Default = () => <PersonCard person={mockPerson} />;
export const WithLongName = () => <PersonCard person={longNamePerson} />;
```

## テスト自動化

### CI/CDパイプライン
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run test:a11y
```

### pre-commitフック
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "jest --findRelatedTests"
    ]
  }
}
```

## モックとスタブ

### Firebaseモック
```typescript
// __mocks__/firebase.ts
export const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ data: () => mockData })),
      set: jest.fn(() => Promise.resolve()),
    })),
  })),
};
```

### APIモック（MSW）
```typescript
// mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/upload', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ id: '123', url: 'https://example.com/image.jpg' })
    );
  }),
];
```

## カバレッジ目標

### 全体
- ステートメント: 80%以上
- ブランチ: 75%以上
- 関数: 80%以上

### 重要モジュール
- ビジネスロジック: 90%以上
- ユーティリティ: 95%以上
- UIコンポーネント: 70%以上

### レポート設定
```json
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
    },
  },
};
```

## テストデータ管理

### ファクトリー
```typescript
// test/factories/person.factory.ts
export const createPerson = (overrides?: Partial<Person>): Person => ({
  id: faker.datatype.uuid(),
  name: faker.name.fullName(),
  company: faker.company.name(),
  createdAt: faker.date.past(),
  ...overrides,
});
```

### シードデータ
```typescript
// test/seeds/index.ts
export const seedDatabase = async () => {
  const people = Array.from({ length: 10 }, createPerson);
  await Promise.all(people.map(p => firestore.collection('people').add(p)));
};
``` 