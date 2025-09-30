# SuperClaude for Cursor - クイックリファレンス

## 🚀 基本コマンド

### 📊 コード分析
```bash
/sc:analyze src/components/Button.tsx    # ファイル分析
/sc:analyze src/                         # ディレクトリ分析
/sc:review --pr                          # プルリクエストレビュー
/sc:explain function calculateTotal      # コード説明
```

### 🔍 調査・検索
```bash
/sc:research React 18 新機能            # 技術調査
/sc:search "useState"                    # コード検索
/sc:benchmark api-endpoint               # パフォーマンス測定
```

### 🛠️ 開発支援
```bash
/sc:implement user authentication        # 機能実装
/sc:generate component Button            # コード生成
/sc:refactor legacy-code.js              # リファクタリング
/sc:optimize database-queries            # 最適化
```

### 🧪 テスト
```bash
/sc:test src/utils/                      # テスト作成・実行
/sc:coverage --report                    # カバレッジ確認
/sc:mock api-service                     # モック作成
```

---

## ⚙️ 設定ファイル

### `.claude.json` (基本設定)
```json
{
  "project_name": "my-project",
  "context": {
    "framework": "React",
    "language": "TypeScript"
  },
  "superclaude": {
    "cliPath": "SuperClaude",
    "timeout": 30000
  }
}
```

### `bridge-config.json` (詳細設定)
```json
{
  "superclaude": {
    "cliPath": "/usr/local/bin/SuperClaude",
    "timeout": 30000,
    "maxRetries": 3
  },
  "cache": {
    "enabled": true,
    "maxSize": 100,
    "ttl": 300000
  },
  "logging": {
    "level": "info",
    "file": "logs/bridge.log"
  }
}
```

---

## 🔧 よく使うオプション

### 共通オプション
- `--verbose, -v`: 詳細出力
- `--quiet, -q`: 簡潔出力
- `--format json`: JSON形式出力
- `--output file.json`: ファイル出力
- `--timeout 60000`: タイムアウト指定

### 分析オプション
- `--depth 3`: 分析深度指定
- `--include "*.ts"`: 対象ファイル指定
- `--exclude "*.test.js"`: 除外ファイル指定
- `--metrics`: メトリクス詳細表示

---

## 🚨 トラブルシューティング

### CLI not found
```bash
pipx install SuperClaude
which SuperClaude
```

### タイムアウト
```json
{ "superclaude": { "timeout": 60000 } }
```

### メモリ不足
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### デバッグモード
```bash
DEBUG=superclaude:* npm start
```

---

## 📊 パフォーマンス目標

| メトリクス | 目標 | 警告 | 危険 |
|-----------|------|------|------|
| 応答時間 | <2秒 | >5秒 | >10秒 |
| メモリ | <200MB | >500MB | >800MB |
| CPU | <50% | >80% | >95% |
| キャッシュヒット率 | >70% | <50% | <30% |

---

## 🛠️ 開発コマンド

```bash
# テスト
npm test                    # 全テスト実行
npm run test:watch         # 監視モード
npm run test:coverage      # カバレッジ

# 品質チェック
npm run lint               # リンティング
npm run lint:fix           # 自動修正

# クリーンアップ
npm run cleanup            # 不要ファイル削除
npm run cleanup:auto       # 自動削除
```

---

## 📚 ドキュメント

- **[包括的ドキュメント](COMPREHENSIVE_DOCUMENTATION.md)** - 完全ガイド
- **[日本語README](README_JAPANESE.md)** - 基本情報
- **[API仕様](../superclaude-cursor-bridge/docs/api.md)** - 開発者向け
- **[ユーザーマニュアル](../superclaude-cursor-bridge/docs/user-manual.md)** - 使用方法

---

## 🎯 25コマンド一覧

### 分析系 (6個)
- `analyze` - コード分析
- `review` - コードレビュー
- `explain` - コード説明
- `debug` - デバッグ支援
- `audit` - セキュリティ監査
- `profile` - パフォーマンス分析

### 調査系 (4個)
- `research` - 技術調査
- `search` - コード検索
- `benchmark` - 性能測定
- `compare` - 比較分析

### 開発系 (6個)
- `implement` - 機能実装
- `generate` - コード生成
- `refactor` - リファクタリング
- `optimize` - 最適化
- `migrate` - マイグレーション
- `scaffold` - プロジェクト雛形

### テスト系 (4個)
- `test` - テスト作成・実行
- `coverage` - カバレッジ確認
- `mock` - モック作成
- `validate` - バリデーション

### 管理系 (5個)
- `task` - タスク管理
- `estimate` - 工数見積もり
- `workflow` - ワークフロー
- `document` - ドキュメント生成
- `deploy` - デプロイ支援

---

## 💡 使用例

### プロジェクト分析
```bash
/sc:analyze . --depth 2 --format json --output analysis.json
/sc:research "プロジェクト構造 ベストプラクティス"
/sc:estimate "新機能開発" --complexity high
```

### コード品質向上
```bash
/sc:review src/ --verbose
/sc:refactor src/legacy/ --target modern
/sc:optimize src/utils/ --focus performance
```

### テスト強化
```bash
/sc:test src/components/ --generate
/sc:coverage --threshold 80
/sc:mock external-api --type rest
```

---

**🎉 このクイックリファレンスで効率的にSuperClaude for Cursorを活用しましょう！**
