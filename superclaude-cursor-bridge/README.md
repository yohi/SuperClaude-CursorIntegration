# SuperClaude Cursor Bridge

SuperClaudeの拡張フレームワークをCursor IDEで利用可能にする統合システム

## 概要

このプロジェクトは、ClaudeCodeの拡張フレームワークであるSuperClaudeをCursor IDEでも使用可能にする統合ブリッジです。既存のSuperClaudeコアロジックを最大限活用し、Cursor IDEのチャットコマンド機能と統合します。

## 特徴

- **ハイブリッドアーキテクチャ**: Node.js Bridge + Python CLI
- **25個のSuperClaudeコマンド**を完全サポート
- **15個のAIエージェント**と**7個の動作モード**に対応
- **7個のMCPサーバー**統合
- **軽量な実装**: 既存のSuperClaudeコアロジックを直接利用

## 必要要件

- Node.js 18.0.0 以上
- Python 3.8 以上
- pipx (SuperClaude CLIインストール用)
- Cursor IDE

## インストール

### 1. SuperClaude CLIのセットアップ

```bash
# pipxを使用 (推奨)
pipx install SuperClaude
SuperClaude install

# または npm を使用
npm install -g @bifrost_inc/superclaude
superclaude install
```

### 2. Bridge プロジェクトのセットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd superclaude-cursor-bridge

# 依存関係をインストール
npm install
```

### 3. 設定

```bash
# SuperClaude設定の初期化
SuperClaude init

# Bridge設定の調整（必要に応じて）
cp config/default.json config/local.json
# local.json を編集
```

## 開発

### テスト実行

```bash
# 全テスト実行
npm test

# 監視モード
npm run test:watch

# カバレッジ
npm run test:coverage
```

### リンティング

```bash
# リンティング実行
npm run lint

# 自動修正
npm run lint:fix
```

### クリーンアップ

```bash
# 不要ファイルの確認と削除（対話式）
npm run cleanup

# 自動削除（CI/CD用）
npm run cleanup:auto
```

**自動削除されるファイル:**
- 一時ファイル: `*.tmp`, `*.temp`, `*.swp`, `*.swo`, `*~`
- システムファイル: `.DS_Store`, `Thumbs.db`
- テスト成果物: `coverage/`, `test-results/`, `.nyc_output/`
- ログファイル: `debug.log`, `error.log`

**保護されるファイル:**
- `node_modules/`, `.git/`, `src/`, `tests/`, `scripts/`, `.claude/`は削除されません

## アーキテクチャ

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

## ライセンス

MIT License

## 貢献

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## サポート

問題や質問がある場合は、GitHubのIssuesを使用してください。