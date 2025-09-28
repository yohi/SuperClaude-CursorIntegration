# インストールガイド

SuperClaude Cursor統合システムのインストール手順を説明します。

## 前提条件

- Node.js 18以上
- Python 3.8以上
- Cursor IDE

## 1. SuperClaude CLIのインストール

### pipxを使用（推奨）

```bash
# pipxのインストール（未インストールの場合）
pip install pipx

# SuperClaude CLIのインストール
pipx install SuperClaude

# SuperClaudeの初期化
SuperClaude install
```

### npmを使用（代替）

```bash
# SuperClaude CLIのインストール
npm install -g @bifrost_inc/superclaude

# SuperClaudeの初期化
superclaude install
```

## 2. Bridgeのセットアップ

### GitHubからのクローン

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/superclaude-cursor-bridge.git
cd superclaude-cursor-bridge

# 依存関係のインストール
npm install
```

### 設定の初期化

```bash
# 設定ファイルの作成
cp config/default-settings.json settings.json

# SuperClaude CLIパスの設定
# settings.jsonを編集してSuperClaude CLIのパスを指定
```

## 3. Cursor IDEとの統合

### チャットコマンドの配置

```bash
# Cursor IDEチャットコマンドディレクトリに配置
# （具体的な配置方法はCursor IDEのバージョンに依存）
```

## 4. 動作確認

```bash
# 基本動作テスト
npm test

# SuperClaude CLIとの接続テスト
node scripts/test-connection.js
```

## 次のステップ

- [ユーザーマニュアル](user-manual.md)でコマンドの使用方法を確認
- [設定ガイド](configuration.md)で詳細な設定を行う
- 問題が発生した場合は[トラブルシューティング](troubleshooting.md)を確認