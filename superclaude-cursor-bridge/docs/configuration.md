# 設定ガイド

SuperClaude Cursor統合システムの設定方法を説明します。

## 設定ファイル概要

### .claude.json

SuperClaudeのメイン設定ファイルです：

```json
{
  "version": "1.0",
  "project_name": "my-project",
  "context": {
    "framework": "React",
    "language": "TypeScript",
    "description": "Webアプリケーションプロジェクト"
  },
  "ai_settings": {
    "model": "claude-3-opus",
    "temperature": 0.7
  }
}
```

#### 主要設定項目

- `project_name`: プロジェクト名
- `context.framework`: 使用フレームワーク
- `context.language`: 主要プログラミング言語
- `ai_settings.model`: 使用するAIモデル

### settings.json

Bridge固有の設定ファイルです：

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
    "ttl": 3600000
  },
  "performance": {
    "monitoring": true,
    "logLevel": "info"
  }
}
```

#### Bridge設定項目

- `superclaude.cliPath`: SuperClaude CLIの実行パス
- `superclaude.timeout`: コマンド実行タイムアウト（ミリ秒）
- `cache.enabled`: キャッシュ機能の有効/無効
- `performance.monitoring`: パフォーマンス監視の有効/無効

## 環境変数

以下の環境変数で設定を上書きできます：

```bash
# SuperClaude CLI設定
export SUPERCLAUDE_CLI_PATH="/usr/local/bin/SuperClaude"
export SUPERCLAUDE_TIMEOUT="30000"

# デバッグ設定
export DEBUG_MODE="true"
export LOG_LEVEL="debug"
```

## プロジェクト固有設定

### フレームワーク別設定例

#### React プロジェクト

```json
{
  "context": {
    "framework": "React",
    "language": "TypeScript",
    "testing": "Jest + Testing Library",
    "bundler": "Vite"
  }
}
```

#### Node.js プロジェクト

```json
{
  "context": {
    "framework": "Express",
    "language": "JavaScript",
    "database": "PostgreSQL",
    "orm": "Prisma"
  }
}
```

## 設定の検証

設定ファイルの妥当性を確認：

```bash
# 設定検証スクリプトの実行
npm run validate:config

# SuperClaude CLI接続テスト
node scripts/test-connection.js
```

## トラブルシューティング

設定に関する問題は[トラブルシューティングガイド](troubleshooting.md)を参照してください。