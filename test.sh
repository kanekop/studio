# 1) 開発ブランチで
rm -rf node_modules package-lock.json
npm install            # 最新互換範囲で解決し直す
npm audit fix --force  # 互換性を無視してセキュリティ修正する場合
# 2) テストが通るのを確認したら
git add package-lock.json
git commit -m "chore: update lock file"
git push && open PR