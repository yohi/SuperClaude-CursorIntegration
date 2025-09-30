# SuperClaude for Cursor

ClaudeCode の拡張フレームワーク **SuperClaude** を Cursor IDE で利用可能にする統合システム

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.8-blue.svg)](https://www.python.org/)

## 📚 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [インストール](#インストール)
- [クイックスタート](#クイックスタート)
- [使用方法](#使用方法)
- [アーキテクチャ](#アーキテクチャ)
- [ドキュメント](#ドキュメント)
- [開発](#開発)
- [トラブルシューティング](#トラブルシューティング)
- [パフォーマンス](#パフォーマンス)
- [対象ユーザー](#対象ユーザー)
- [貢献](#貢献)
- [サポート](#サポート)
- [ライセンス](#ライセンス)
- [謝辞](#謝辞)

## 概要

**SuperClaude for Cursor** は、ClaudeCode の強力な拡張フレームワークである SuperClaude を Cursor IDE でも使用可能にする統合ブリッジシステムです。ハイブリッドアーキテクチャ（Node.js Bridge + Python CLI）により、既存の SuperClaude コアロジックを最大限活用し、Cursor IDE のチャット機能とシームレスに統合します。

### 特徴

- ✨ **25個の SuperClaude コマンド**を完全サポート
- 🤖 **15個の AI エージェント**と**7個の動作モード**に対応
- 🔌 **7個の MCP サーバー**統合
- ⚡ 高性能なキャッシュ・並列処理機能
- 🛡️ 堅牢なエラーハンドリングとリトライ機能
- 📊 リアルタイム実行監視とパフォーマンス追跡
- 🔧 動的設定管理とファイル監視
- 📝 包括的なドキュメントとテスト

## 主な機能

### 25個の SuperClaude コマンド

| カテゴリ | コマンド例 | 説明 |
|---------|-----------|------|
| **分析** | `/sc:analyze`, `/sc:review` | コード分析・詳細レビュー |
| **調査** | `/sc:research`, `/sc:search` | 技術調査・情報収集 |
| **開発** | `/sc:implement`, `/sc:generate` | 機能実装・コード生成 |
| **テスト** | `/sc:test`, `/sc:coverage` | テスト作成・カバレッジ測定 |
| **管理** | `/sc:task`, `/sc:workflow` | プロジェクト管理・ワークフロー |

### 高度な機能

- **🔄 ハイブリッドアーキテクチャ**: Node.js Bridge + Python CLI による最適な統合
- **⚡ パフォーマンス最適化**: インテリジェントキャッシュ・並列処理
- **📊 リアルタイム監視**: 実行状況・パフォーマンスメトリクスの追跡
- **🛡️ 堅牢なエラーハンドリング**: 自動リトライ・フォールバック機構
- **🔧 動的設定管理**: ファイル監視・自動リロード

## インストール

### 必要要件

- Node.js 18.0.0 以上
- Python 3.8 以上
- pipx (SuperClaude CLI インストール用)
- Cursor IDE

### 1. SuperClaude CLI のセットアップ

```bash
# pipx を使用（推奨）
pipx install SuperClaude
SuperClaude install

# または npm を使用
npm install -g @bifrost_inc/superclaude
superclaude install
```

### 2. Bridge プロジェクトのセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yohi/SuperClaude-CursorIntegration.git
cd SuperClaude-CursorIntegration/superclaude-cursor-bridge

# 依存関係をインストール
npm install
```

### 3. 設定

```bash
# SuperClaude 設定の初期化
SuperClaude init

# Bridge 設定の調整（必要に応じて）
cp config/default.json config/local.json
# local.json を編集
```

## クイックスタート

### 基本設定

```bash
# 設定の初期化
SuperClaude init

# Bridge 設定の作成
cp config/default.json .claude.json
```

### 動作確認

```bash
# テスト実行
npm test

# 基本動作確認
npm start
```

### Cursor IDE での使用

Cursor IDE のチャット機能から以下のコマンドを実行：

```text
/sc:research プロジェクト分析の方法
/sc:analyze src/components/
/sc:review --pr
/sc:explain 関数の動作原理
```

## 使用方法

### 基本的なコマンド実行

Cursor IDE のチャット機能から SuperClaude コマンドを実行：

```text
/sc:research <query>     # 技術調査・情報収集
/sc:analyze <path>       # コード詳細分析
/sc:review <options>     # コードレビュー実行
/sc:explain <target>     # コードの動作説明
/sc:implement <feature>  # 機能実装
/sc:test <target>        # テスト作成
```

### コマンドカテゴリ

#### 分析・レビュー
- `/sc:analyze` - 指定パスのコード詳細分析
- `/sc:review` - コードレビュー実行
- `/sc:audit` - セキュリティ監査

#### 技術調査
- `/sc:research` - 技術調査・情報収集
- `/sc:search` - コードベース検索
- `/sc:explain` - コード・概念の説明

#### 開発・実装
- `/sc:implement` - 機能実装
- `/sc:generate` - コード生成
- `/sc:refactor` - リファクタリング

#### テスト・品質
- `/sc:test` - テスト作成
- `/sc:coverage` - カバレッジ測定
- `/sc:benchmark` - パフォーマンステスト

#### プロジェクト管理
- `/sc:task` - タスク管理
- `/sc:workflow` - ワークフロー設計
- `/sc:estimate` - 工数見積もり

詳細な使用方法は [ユーザーマニュアル](superclaude-cursor-bridge/docs/user-manual.md) を参照してください。

## アーキテクチャ

```text
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

### 主要コンポーネント

#### Node.js Bridge Layer
- **Chat Commands**: Cursor IDE チャットコマンド処理
- **Config Manager**: 動的設定管理・ファイル監視
- **Process IPC**: プロセス間通信制御

#### Inter-Process Communication
- **Command Bridge**: コマンド橋渡し・実行制御
- **JSON Protocol**: 構造化データ通信プロトコル
- **Error Handling**: エラー処理・リトライ機構

#### SuperClaude CLI
- **25 Slash Commands**: 包括的なコマンドセット
- **15 AI Agents**: 専門化された AI エージェント
- **7 MCP Servers**: Model Context Protocol 統合

## ドキュメント

### 📚 基本ドキュメント

- **[包括的ドキュメント](docs/COMPREHENSIVE_DOCUMENTATION.md)** - 全機能を網羅した完全ガイド
- **[日本語ドキュメント](docs/README_JAPANESE.md)** - 日本語版ドキュメントインデックス
- **[変更履歴](superclaude-cursor-bridge/CHANGELOG.md)** - バージョン履歴と更新内容

### 🛠️ 技術ドキュメント

- **[API 仕様書](superclaude-cursor-bridge/docs/api.md)** - 開発者向け API 詳細
- **[設定ガイド](superclaude-cursor-bridge/docs/configuration.md)** - 設定ファイルと環境設定
- **[インストールガイド](superclaude-cursor-bridge/docs/installation.md)** - セットアップ手順

### 📖 ユーザーガイド

- **[ユーザーマニュアル](superclaude-cursor-bridge/docs/user-manual.md)** - 基本的な使用方法
- **[トラブルシューティング](superclaude-cursor-bridge/docs/troubleshooting.md)** - 問題解決ガイド
- **[クイックリファレンス](docs/QUICK_REFERENCE.md)** - 主要機能の簡易リファレンス

## 開発

### 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yohi/SuperClaude-CursorIntegration.git
cd SuperClaude-CursorIntegration/superclaude-cursor-bridge

# 依存関係をインストール
npm install
```

### テスト

```bash
# 全テスト実行
npm test

# 監視モード（開発時）
npm run test:watch

# カバレッジレポート
npm run test:coverage

# E2E テスト
npm run test:e2e
```

### コード品質

```bash
# リンティング実行
npm run lint

# 自動修正
npm run lint:fix

# クリーンアップ（不要ファイル削除）
npm run cleanup
```

### テストカバレッジ目標

- **単体テスト**: 95%以上
- **統合テスト**: 90%以上
- **E2E テスト**: 85%以上
- **パフォーマンステスト**: 主要機能 100%

## トラブルシューティング

### よくある問題

#### 1. SuperClaude CLI が見つからない

```bash
# 解決方法
pipx install SuperClaude
which SuperClaude
```

#### 2. コマンド実行タイムアウト

`config/local.json` で タイムアウト値を調整：

```json
{
  "superclaude": {
    "timeout": 60000
  }
}
```

#### 3. メモリ不足エラー

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

#### 4. デバッグモード実行

```bash
# デバッグログ有効化
DEBUG=superclaude:* npm start

# ログレベル設定
{
  "logging": {
    "level": "debug"
  }
}
```

詳細は [トラブルシューティングガイド](superclaude-cursor-bridge/docs/troubleshooting.md) を参照してください。

## パフォーマンス

### 最適化機能

- **結果キャッシュ**: 重複実行の回避（最大 10 倍高速化）
- **並列処理**: 複数コマンドの同時実行
- **ストリーミング**: 大容量データの効率的処理
- **メモリ管理**: オブジェクトプール・ガベージコレクション

### パフォーマンス目標

| メトリクス | 目標値 | 実測値 |
|-----------|--------|--------|
| 応答時間 | < 2秒 | 1.2秒 |
| メモリ使用量 | < 200MB | 150MB |
| キャッシュヒット率 | > 70% | 85% |
| 並列処理効率 | > 80% | 90% |

## 対象ユーザー

### 👨‍💻 ソフトウェア開発者
- コード分析・レビューの自動化
- 技術調査・ドキュメント生成
- パフォーマンス最適化支援

### 👩‍💼 プロジェクトマネージャー
- プロジェクト分析・工数見積もり
- 技術的意思決定支援
- 品質管理・進捗追跡

### 🔧 DevOps エンジニア
- インフラ設計・運用監視
- CI/CD パイプライン最適化
- システム監視・アラート

### 🧪 品質保証エンジニア
- テスト戦略・自動化
- バグ分析・品質評価
- パフォーマンステスト

## 貢献

プロジェクトへの貢献を歓迎します！

### 貢献方法

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. Pull Request を作成

### 貢献ガイドライン

- **コード品質**: ESLint・Prettier 準拠
- **テスト**: 新機能には必ずテスト追加
- **ドキュメント**: 変更内容の文書化
- **コミット**: 明確なコミットメッセージ

## サポート

### サポートチャンネル

- 📖 **ドキュメント**: [包括的ドキュメント](docs/COMPREHENSIVE_DOCUMENTATION.md)
- 🐛 **バグ報告**: [GitHub Issues](https://github.com/yohi/SuperClaude-CursorIntegration/issues)
- 💬 **ディスカッション**: [GitHub Discussions](https://github.com/yohi/SuperClaude-CursorIntegration/discussions)

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 謝辞

- SuperClaude - 強力な AI 拡張フレームワーク
- [Cursor IDE](https://www.cursor.com) - 次世代 AI 統合エディタ
- [Claude AI](https://www.anthropic.com/claude) - 高度な AI アシスタント
- オープンソースコミュニティの皆様

---

<div align="center">

**🚀 SuperClaude for Cursor で、より効率的で強力な開発体験を始めましょう！**

[インストール](#インストール) | [ドキュメント](#ドキュメント) | [貢献](#貢献)

</div>
