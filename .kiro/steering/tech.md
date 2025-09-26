# Technology Stack

## Architecture Overview

### High-Level Architecture Design
SuperClaude Cursor統合システムは、**ハイブリッドNode.js + Python CLIアーキテクチャ**を採用しています。これにより、SuperClaudeの既存コアロジックを最大限活用しながら、Cursor IDEとのシームレスな統合を実現しています。

```
┌─────────────────────────────────────────────────────────────┐
│                    Cursor IDE Environment                    │
├─────────────────────────────────────────────────────────────┤
│  Cursor Bridge (Node.js/JavaScript)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Chat Commands   │  │ Config Manager │  │ Process IPC │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                 Inter-Process Communication                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Command Bridge  │  │  JSON Protocol  │  │ Error Handle │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                SuperClaude CLI (Python)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ 25 Slash Cmds   │  │   15 AI Agents  │  │  7 MCP Servers│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Principles
1. **コアロジック再利用**: SuperClaudeの既存Python実装を直接活用
2. **プロセス分離**: 安定性とスケーラビリティを確保
3. **アダプター層**: プラットフォーム固有実装の局所化
4. **抽象化レイヤー**: 結合度の最小化

## Frontend Technology Stack

### Cursor IDE Integration Layer
- **Primary Language**: JavaScript (Node.js 18+)
- **Package Manager**: npm
- **Execution Environment**: Cursor IDE Chat Commands API
- **Module System**: CommonJS/ESM hybrid

### Core Dependencies
```json
{
  "node": ">=18.0.0",
  "dependencies": {
    "child_process": "built-in",
    "fs": "built-in",
    "path": "built-in",
    "events": "built-in"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Communication Protocol
- **IPC Method**: JSON over stdout/stderr
- **Message Format**: Newline-Delimited JSON (NDJSON)
- **Delimiter**: 改行文字(\n)をレコードセパレーター
- **Encoding**: UTF-8
- **Buffer Management**: Stream processing with accumulation buffer

## Backend Technology Stack

### SuperClaude CLI Core
- **Primary Language**: Python 3.8+
- **Package Managers**: pipx (推奨) / pip
- **Distribution**: PyPI via `@bifrost_inc/superclaude`
- **Framework**: SuperClaudeフレームワーク既存実装

### Core Components
- **25 Slash Commands**: `/sc:research`, `/sc:analyze`, `/sc:review`, etc.
- **15 AI Agents**: 専門的なAI支援機能
- **7 Behavioral Modes**: タスク特化型動作モード
- **MCP Servers**: Model Context Protocolサーバー統合

### Python Dependencies (Inherited from SuperClaude)
- SuperClaudeの既存依存関係をそのまま継承
- MCP server integrations
- AI framework dependencies
- Configuration management libraries

## Development Environment

### Required Tools
```bash
# Core Runtime Requirements
node --version    # v18.0.0+
python --version  # v3.8.0+
npm --version     # v9.0.0+

# SuperClaude Installation
pipx install SuperClaude
# または
npm install -g @bifrost_inc/superclaude

# Development Tools
npm install -g eslint prettier jest
```

### IDE Extensions & Tools
- **Cursor IDE**: Primary target environment
- **ESLint**: Code quality and linting
- **Prettier**: Code formatting
- **Jest**: Testing framework

## Common Commands

### Development Commands
```bash
# プロジェクトセットアップ
npm install
npm run setup

# 開発サーバー起動
npm run dev

# テスト実行
npm test
npm run test:watch
npm run test:coverage

# コード品質チェック
npm run lint
npm run lint:fix
npm run format

# ビルド（必要に応じて）
npm run build

# SuperClaude CLI テスト
SuperClaude --version
SuperClaude install
```

### SuperClaude Specific Commands
```bash
# SuperClaude基本コマンド
SuperClaude /sc:research "query"
SuperClaude /sc:analyze path/to/code
SuperClaude /sc:review --pr

# Bridge経由での実行テスト
node index.js --command research --args "query"
node index.js --command analyze --args "path/to/code"
```

## Environment Variables

### Core Configuration
```bash
# SuperClaude CLI設定
SUPERCLAUDE_CLI_PATH="/usr/local/bin/SuperClaude"
SUPERCLAUDE_TIMEOUT="30000"  # 30秒

# Node.js Bridge設定
NODE_ENV="development"
LOG_LEVEL="info"
IPC_BUFFER_SIZE="1048576"    # 1MB

# Cursor IDE統合
CURSOR_CHAT_ENABLED="true"
CURSOR_COMMANDS_DIR="./commands"

# デバッグ設定
DEBUG_MODE="false"
VERBOSE_LOGGING="false"
```

### Project-Specific Variables
```bash
# プロジェクト設定パス
PROJECT_CONFIG_PATH="./.claude.json"
SETTINGS_PATH="./settings.json"

# 開発環境特有
DEV_MODE="true"
MOCK_SUPERCLAUDE="false"
```

## Port Configuration

### Development Ports (if applicable)
- **Debug Port**: 9229 (Node.js Inspector)
- **Mock Server**: 3001 (テスト用Mockサーバーがあれば)
- **Health Check**: 3000 (ヘルスチェックエンドポイントがあれば)

※ 現在の設計では外部ポートは使用せず、IPCベースの通信のみ

## Database & Storage

### File-Based Configuration
- **SuperClaude Config**: `.claude.json` (SuperClaudeネイティブ)
- **Settings**: `settings.json` (Bridge固有設定)
- **Project Config**: `CLAUDE.md` (プロジェクト固有設定)
- **Cache**: 必要に応じてローカルファイルシステム

### No External Database
現在の設計では外部データベースは使用せず、ファイルベースの設定管理のみ

## Security Considerations

### Process Security
- **Sandboxing**: Cursor IDEのサンドボックス環境で実行
- **Process Isolation**: Node.js Bridge と Python CLI の分離
- **Input Validation**: 全ての入力データのサニタイゼーション

### Data Security
- **Configuration Security**: 機密設定の暗号化保存
- **IPC Security**: プロセス間通信の検証
- **Log Security**: ログからの機密情報除去

### Dependency Security
```bash
# セキュリティスキャン
npm audit
npm audit fix

# SuperClaude更新
pipx upgrade SuperClaude
```

## Performance Considerations

### Response Time Requirements
- **軽量コマンド**: 3秒以内のレスポンス
- **重量コマンド**: 30秒以内のレスポンス + 進行状況表示
- **IPC Latency**: 100ms以内の通信遅延

### Resource Management
- **Memory Limits**: Node.jsプロセス最大512MB
- **CPU Usage**: 1コア相当の最大使用率
- **Buffer Size**: IPCバッファ1MB制限

### Optimization Strategies
- **Lazy Loading**: 必要時のみモジュール読み込み
- **Connection Pooling**: Python CLIプロセスの再利用
- **Caching**: コマンド結果の適切なキャッシュ

## Testing Strategy

### Testing Tools
```bash
# テストフレームワーク
npm install --save-dev jest

# テストユーティリティ
npm install --save-dev @jest/globals
npm install --save-dev jest-environment-node
```

### Test Types
- **Unit Tests**: 各コンポーネントの独立テスト
- **Integration Tests**: SuperClaude CLI連携テスト
- **E2E Tests**: Cursor IDE環境での実際のユーザーシナリオ
- **Performance Tests**: レスポンス時間とリソース使用量測定

### Continuous Integration
```bash
# GitHub Actions用コマンド
npm run test:ci
npm run lint:ci
npm run security:audit
```

## Deployment Architecture

### Package Distribution
- **GitHub Repository**: プライマリ配布チャネル
- **npm Registry**: オプション配布（将来的に）
- **Direct Download**: ZIP配布

### Installation Process
1. **SuperClaude CLI Setup**: `pipx install SuperClaude`
2. **Bridge Setup**: GitHubからクローン + `npm install`
3. **Cursor Integration**: チャットコマンドディレクトリに配置
4. **Configuration**: 設定ファイル初期化

### Update Mechanism
```bash
# SuperClaude更新
pipx upgrade SuperClaude

# Bridge更新
git pull origin main
npm install

# 設定検証
npm run validate:config
```

## Integration Points

### SuperClaude CLI Integration
- **Command Interface**: Python CLI コマンド実行
- **Configuration**: `.claude.json`, `settings.json` の共有
- **Data Flow**: JSON-based request/response

### Cursor IDE Integration
- **Chat Commands API**: Cursor IDEのチャットコマンドシステム
- **UI Feedback**: 進行状況とレスポンス表示
- **Session Management**: チャットセッションの管理

### Future Integrations
- **VS Code Extension**: 将来的な拡張可能性
- **Additional IDEs**: JetBrains IDEs等への対応検討
- **Cloud Integration**: リモート実行サポートの検討