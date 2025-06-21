# 1. ローカルの変更を強制的に取り消して、リモートの最新に合わせる
git fetch origin
git reset --hard origin/master  # ← "main" の部分は自分のブランチ名に合わせて変える
