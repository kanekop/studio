エラーの根本原因と解決策
問題：

FaceRosterContextがRosterContextにリファクタリングされた
useFaceRosterフックがuseRosterに変更された
しかし、多くのコンポーネントがまだ古い名前を使用している

解決策：

すべてのuseFaceRosterをuseRosterに変更
import { useFaceRoster } from '@/contexts/FaceRosterContext'をimport { useRoster } from '@/contexts'に変更
FaceRosterProviderへの参照を削除（AppProvidersがすべてを統合）

修正が必要な主要ファイル：

✅ src/app/(main)/page.tsx
✅ src/components/features/AppHeader.tsx
✅ src/components/features/RosterList.tsx
✅ src/components/features/ImageCanvas.tsx
他にも多数のファイルで同様の修正が必要です

これらの修正により、エラーは解消されるはずです。残りのファイルも同様に修正する必要がありますが、基本的なパターンは同じです：

インポートを@/contextsから行う
useFaceRosterをuseRosterに変更
必要に応じて他のContextフックも統合されたexportから使用