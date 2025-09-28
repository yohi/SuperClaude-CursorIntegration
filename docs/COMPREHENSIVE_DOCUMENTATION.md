# SuperClaude for Cursor - 包括的ドキュメント

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [インストールガイド](#インストールガイド)
4. [使用方法](#使用方法)
5. [コマンドリファレンス](#コマンドリファレンス)
6. [API仕様](#api仕様)
7. [設定ガイド](#設定ガイド)
8. [開発者ガイド](#開発者ガイド)
9. [トラブルシューティング](#トラブルシューティング)
10. [パフォーマンス最適化](#パフォーマンス最適化)

---

## プロジェクト概要

### 🎯 概要

**SuperClaude for Cursor** は、ClaudeCodeの拡張フレームワークである**SuperClaude**をCursor IDEで利用可能にする統合システムです。ハイブリッドNode.js + Python CLIアーキテクチャを採用し、既存のSuperClaudeコアロジックを最大限活用しながら、Cursor IDEとのシームレスな統合を実現しています。

### ✨ 主な特徴

- **🔄 ハイブリッドアーキテクチャ**: Node.js Bridge + Python CLI
- **⚡ 25個のSuperClaudeコマンド**を完全サポート
- **🤖 15個のAIエージェント**と**7個の動作モード**に対応
- **🔗 7個のMCPサーバー**統合
- **💡 軽量な実装**: 既存のSuperClaudeコアロジックを直接利用
- **📊 パフォーマンス監視**: リアルタイム実行状況追跡
- **💾 結果キャッシュ**: 高速な応答時間
- **🔧 動的設定**: ファイル監視による自動リロード

### 🎯 対象ユーザー

- **ソフトウェア開発者**: コード分析・レビュー・最適化
- **プロジェクトマネージャー**: 技術調査・アーキテクチャ設計
- **品質保証エンジニア**: テスト戦略・バグ分析
- **DevOpsエンジニア**: インフラ設計・運用監視

---

## システムアーキテクチャ

### 🏗️ 全体アーキテクチャ

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

### 🔄 データフロー

```
User Chat Command → Cursor Bridge (Node.js) → IPC → SuperClaude CLI (Python) →
Core Processing → JSON Response → Bridge → Formatted Output → User Interface
```

### 🧩 主要コンポーネント

#### 1. **Cursor Bridge Layer**
- **役割**: Cursor IDEとSuperClaude CLI間のインターフェース
- **技術**: Node.js/JavaScript
- **機能**: チャットコマンド登録、コマンドディスパッチ、エラーハンドリング

#### 2. **Command Translation Layer**
- **役割**: コマンド変換とパラメータ検証
- **技術**: JavaScript ES Modules
- **機能**: 25コマンドマッピング、実行履歴管理、統計収集

#### 3. **IPC Communication Layer**
- **役割**: プロセス間通信の管理
- **技術**: JSON Protocol, child_process
- **機能**: 構造化データ通信、タイムアウト制御、プロセス管理

#### 4. **SuperClaude Core Layer**
- **役割**: 既存のSuperClaudeコアロジック
- **技術**: Python CLI
- **機能**: AI処理、MCP統合、エージェント実行

---

## インストールガイド

### 📋 必要要件

- **Node.js**: 18.0.0 以上
- **Python**: 3.8 以上
- **pipx**: SuperClaude CLIインストール用
- **Cursor IDE**: 最新版推奨

### 🚀 インストール手順

#### ステップ 1: SuperClaude CLIのセットアップ

```bash
# pipxを使用 (推奨)
pipx install SuperClaude
SuperClaude install

# または npm を使用
npm install -g @bifrost_inc/superclaude
superclaude install
```

#### ステップ 2: Bridge プロジェクトのセットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd superclaude-cursor-bridge

# 依存関係をインストール
npm install
```

#### ステップ 3: 設定の初期化

```bash
# SuperClaude設定の初期化
SuperClaude init

# Bridge設定の調整（必要に応じて）
cp config/default.json config/local.json
# local.json を編集
```

#### ステップ 4: 動作確認

```bash
# テスト実行
npm test

# 基本動作確認
npm start
```

### 🔧 設定ファイルの作成

#### `.claude.json` (プロジェクトルート)

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

#### `bridge-config.json` (Bridge設定)

```json
{
  "superclaude": {
    "cliPath": "/usr/local/bin/SuperClaude",
    "timeout": 30000,
    "maxRetries": 3
  },
  "ipc": {
    "timeout": 30000,
    "bufferSize": 1048576
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

## 使用方法

### 💬 基本的なコマンド実行

Cursor IDEのチャット機能から以下のようにSuperClaudeコマンドを実行できます：

```
/sc:research プロジェクト分析の方法
/sc:analyze src/components/
/sc:review --pr
/sc:explain 関数の動作原理
```

### 🎯 実行例

#### コード分析

```
/sc:analyze src/components/Button.tsx
```

**実行結果例:**
```
📊 コード分析結果

ファイル: src/components/Button.tsx
行数: 45行
複雑度: 低 (3/10)
品質スコア: A

🔍 分析詳細:
- TypeScript使用: ✅
- Propsの型定義: ✅
- エラーハンドリング: ⚠️ 改善推奨
- テストカバレッジ: ❌ 未実装

💡 改善提案:
1. エラーバウンダリーの追加
2. ユニットテストの実装
3. アクセシビリティ属性の追加
```

#### 技術調査

```
/sc:research React 18の新機能
```

**実行結果例:**
```
🔍 技術調査結果: React 18の新機能

📋 主要な新機能:
1. **Concurrent Features**
   - Automatic Batching
   - Transitions
   - Suspense improvements

2. **Strict Mode の強化**
   - 開発時の副作用検出
   - 将来の機能への準備

3. **新しいHooks**
   - useId()
   - useDeferredValue()
   - useTransition()

🔗 参考資料:
- React 18 公式ドキュメント
- Migration Guide
- Breaking Changes
```

### 📊 進行状況の監視

長時間実行されるコマンドは進行状況が表示されます：

```
🚀 実行中: /sc:analyze large-project/

┌─────────────────────────────────────┐
│ ■■■■■■■□□□ 70% - ファイル解析中    │
│                                     │
│ 処理済み: 142/203 ファイル          │
│ 経過時間: 00:02:15                  │
│ 推定残り: 00:00:45                  │
└─────────────────────────────────────┘
```

### 💾 キャッシュの活用

同じコマンドと引数の組み合わせは自動的にキャッシュされ、高速に結果が返されます：

```
/sc:analyze src/utils/helpers.js

💾 キャッシュから結果を取得 (0.1秒)
```

---

## コマンドリファレンス

### 📚 利用可能なコマンド一覧

#### 🔍 コード分析系コマンド

| コマンド | 説明 | 使用例 |
|---------|------|--------|
| `/sc:analyze` | コードの詳細分析 | `/sc:analyze src/components/` |
| `/sc:review` | コードレビュー | `/sc:review --pr` |
| `/sc:explain` | コードの説明 | `/sc:explain function calculateTotal` |
| `/sc:debug` | デバッグ支援 | `/sc:debug error-log.txt` |

#### 🔬 調査・研究系コマンド

| コマンド | 説明 | 使用例 |
|---------|------|--------|
| `/sc:research` | 技術調査 | `/sc:research GraphQL vs REST` |
| `/sc:search` | コード検索 | `/sc:search "useState"` |
| `/sc:benchmark` | パフォーマンス測定 | `/sc:benchmark api-endpoint` |

#### 🛠️ 開発支援系コマンド

| コマンド | 説明 | 使用例 |
|---------|------|--------|
| `/sc:implement` | 機能実装 | `/sc:implement user authentication` |
| `/sc:generate` | コード生成 | `/sc:generate component Button` |
| `/sc:refactor` | リファクタリング支援 | `/sc:refactor legacy-code.js` |
| `/sc:optimize` | パフォーマンス最適化 | `/sc:optimize database-queries` |

#### 🧪 テスト系コマンド

| コマンド | 説明 | 使用例 |
|---------|------|--------|
| `/sc:test` | テスト作成・実行 | `/sc:test src/utils/` |
| `/sc:coverage` | テストカバレッジ | `/sc:coverage --report` |
| `/sc:mock` | モック作成 | `/sc:mock api-service` |

#### 📋 プロジェクト管理系コマンド

| コマンド | 説明 | 使用例 |
|---------|------|--------|
| `/sc:task` | タスク管理 | `/sc:task list --priority high` |
| `/sc:estimate` | 工数見積もり | `/sc:estimate feature-development` |
| `/sc:workflow` | ワークフロー設計 | `/sc:workflow ci-cd-pipeline` |

#### 📖 ドキュメント系コマンド

| コマンド | 説明 | 使用例 |
|---------|------|--------|
| `/sc:document` | ドキュメント生成 | `/sc:document --format markdown` |
| `/sc:readme` | README作成 | `/sc:readme --template standard` |
| `/sc:changelog` | 変更履歴生成 | `/sc:changelog --version 1.2.0` |

### 🔧 コマンドオプション

#### 共通オプション

- `--verbose, -v`: 詳細出力
- `--quiet, -q`: 簡潔出力
- `--format <type>`: 出力形式 (json, markdown, text)
- `--output <file>`: 出力ファイル指定
- `--timeout <ms>`: タイムアウト時間

#### 分析系オプション

- `--depth <level>`: 分析深度 (1-5)
- `--include <pattern>`: 対象ファイルパターン
- `--exclude <pattern>`: 除外ファイルパターン
- `--metrics`: メトリクス詳細表示

#### 実行例

```bash
# 詳細分析（深度3、JSON出力）
/sc:analyze src/ --depth 3 --format json --output analysis.json

# 特定ファイル除外でのレビュー
/sc:review --exclude "*.test.js" --verbose

# タイムアウト指定での調査
/sc:research "microservices architecture" --timeout 60000
```

---

## API仕様

### 🔌 Core Components API

#### CommandBridge

SuperClaudeコマンドの実行とマッピングを管理するコアコンポーネント。

```javascript
import CommandBridge from './src/command-bridge.js';

const bridge = new CommandBridge({
  superclaudePath: '/usr/local/bin/SuperClaude',
  timeout: 30000,
  maxHistorySize: 100
});

// コマンド実行
const result = await bridge.executeCommand('research', ['技術調査'], {
  timeout: 60000,
  signal: abortController.signal
});
```

##### Methods

**`executeCommand(command, args, options)`**

SuperClaudeコマンドを実行します。

- **Parameters:**
  - `command` (string): 実行するコマンド名
  - `args` (Array): コマンド引数
  - `options` (Object): 実行オプション
    - `timeout` (number): タイムアウト時間（ミリ秒）
    - `signal` (AbortSignal): キャンセル用シグナル
    - `skipCache` (boolean): キャッシュをスキップ

- **Returns:** `Promise<Object>`
  - `success` (boolean): 実行成功フラグ
  - `data` (any): 実行結果データ
  - `error` (string): エラーメッセージ（失敗時）
  - `executionTime` (number): 実行時間（ミリ秒）
  - `fromCache` (boolean): キャッシュからの取得フラグ

**`getAvailableCommands()`**

利用可能なコマンド一覧を取得します。

- **Returns:** `Array<string>` - コマンド名の配列

**`getExecutionHistory()`**

実行履歴を取得します。

- **Returns:** `Array<Object>` - 実行履歴の配列

**`getExecutionStats()`**

実行統計を取得します。

- **Returns:** `Object` - 統計情報オブジェクト

#### JsonProtocol

SuperClaude CLIとのJSON通信を処理するコンポーネント。

```javascript
import { JsonProtocol } from './src/json-protocol.js';

const protocol = new JsonProtocol({
  cliPath: 'SuperClaude',
  timeout: 30000
});

const result = await protocol.executeCommand('/sc:analyze src/');
```

##### Methods

**`executeCommand(command)`**

JSON形式でコマンドを実行します。

- **Parameters:**
  - `command` (string): 実行するコマンド

- **Returns:** `Promise<Object>`
  - `status` (string): 実行ステータス
  - `data` (any): 実行結果
  - `commandId` (number): コマンドID

#### ConfigManager

設定ファイルの管理を行うコンポーネント。

```javascript
import ConfigManager from './src/config-manager.js';

const config = new ConfigManager({
  configDir: process.cwd(),
  autoReload: true
});

const superclaudePath = await config.getSetting('superclaude.cliPath');
await config.setSetting('cache.enabled', true);
```

##### Methods

**`getSetting(key, defaultValue)`**

設定値を取得します。

- **Parameters:**
  - `key` (string): 設定キー（ドット記法対応）
  - `defaultValue` (any): デフォルト値

- **Returns:** `Promise<any>` - 設定値

**`setSetting(key, value)`**

設定値を更新します。

- **Parameters:**
  - `key` (string): 設定キー
  - `value` (any): 設定値

**`loadSuperClaudeConfig()`**

SuperClaude設定を読み込みます。

- **Returns:** `Promise<Object>` - 設定オブジェクト

**`validateConfig(config)`**

設定の妥当性を検証します。

- **Parameters:**
  - `config` (Object): 検証する設定

- **Returns:** `Promise<boolean>` - 検証結果

#### PerformanceMonitor

パフォーマンス測定とモニタリングを行うコンポーネント。

```javascript
import PerformanceMonitor from './src/performance-monitor.js';

const monitor = new PerformanceMonitor();
const context = monitor.startMeasurement('analyze');
// ... 処理実行 ...
monitor.endMeasurement(context, { success: true });
```

##### Methods

**`startMeasurement(command)`**

測定を開始します。

- **Parameters:**
  - `command` (string): コマンド名

- **Returns:** `Object` - 測定コンテキスト

**`endMeasurement(context, result)`**

測定を終了します。

- **Parameters:**
  - `context` (Object): 測定コンテキスト
  - `result` (Object): 実行結果

**`getStatistics()`**

統計情報を取得します。

- **Returns:** `Object` - パフォーマンス統計

#### ProgressManager

進行状況管理を行うコンポーネント。

```javascript
import ProgressManager from './src/progress-manager.js';

const progress = new ProgressManager();
const id = progress.createProgress('cmd-1', 'analyze', 4);
progress.updateProgress(id, 50, 'Analyzing files...');
progress.completeProgress(id);
```

##### Methods

**`createProgress(commandId, commandName, estimatedSteps)`**

進行状況を作成します。

- **Parameters:**
  - `commandId` (string): コマンドID
  - `commandName` (string): コマンド名
  - `estimatedSteps` (number): 推定ステップ数

- **Returns:** `string` - プログレスID

**`updateProgress(progressId, percentage, message)`**

進行状況を更新します。

- **Parameters:**
  - `progressId` (string): プログレスID
  - `percentage` (number): 進行率（0-100）
  - `message` (string): メッセージ

**`completeProgress(progressId)`**

進行状況を完了にします。

- **Parameters:**
  - `progressId` (string): プログレスID

#### ResultCache

実行結果のキャッシュを管理するコンポーネント。

```javascript
import ResultCache from './src/result-cache.js';

const cache = new ResultCache({
  maxSize: 100,
  ttl: 300000 // 5分
});

cache.set('analyze:src/', result);
const cached = cache.get('analyze:src/');
```

##### Methods

**`set(key, value)`**

キャッシュに値を保存します。

- **Parameters:**
  - `key` (string): キャッシュキー
  - `value` (any): 保存する値

**`get(key)`**

キャッシュから値を取得します。

- **Parameters:**
  - `key` (string): キャッシュキー

- **Returns:** `any | null` - キャッシュされた値

**`has(key)`**

キャッシュにキーが存在するかチェックします。

- **Parameters:**
  - `key` (string): キャッシュキー

- **Returns:** `boolean` - 存在フラグ

**`clear()`**

キャッシュをクリアします。

**`getStats()`**

キャッシュ統計を取得します。

- **Returns:** `Object` - 統計情報

### 🎭 Events

#### CommandBridge Events

```javascript
bridge.on('commandStarted', (data) => {
  console.log('Command started:', data.command);
});

bridge.on('commandCompleted', (data) => {
  console.log('Command completed:', data.result);
});

bridge.on('commandFailed', (data) => {
  console.error('Command failed:', data.error);
});

bridge.on('commandCancelled', (data) => {
  console.log('Command cancelled:', data.command);
});
```

#### ProgressManager Events

```javascript
progress.on('progress', (data) => {
  console.log(`Progress: ${data.percentage}% - ${data.message}`);
});

progress.on('complete', (data) => {
  console.log('Completed:', data.commandId);
});

progress.on('failed', (data) => {
  console.error('Failed:', data.error);
});
```

#### ConfigManager Events

```javascript
config.on('configChanged', (data) => {
  console.log('Config changed:', data.key, data.value);
});

config.on('fileReloaded', (data) => {
  console.log('File reloaded:', data.filePath);
});
```

### ❌ Error Handling

#### Error Types

**CommandExecutionError**

コマンド実行エラー。

```javascript
try {
  await bridge.executeCommand('invalid-command');
} catch (error) {
  if (error.name === 'CommandExecutionError') {
    console.error('Command execution failed:', error.message);
    console.error('Command:', error.command);
    console.error('Args:', error.args);
  }
}
```

**ConfigurationError**

設定エラー。

```javascript
try {
  const config = new ConfigManager();
  await config.loadSuperClaudeConfig();
} catch (error) {
  if (error.name === 'ConfigurationError') {
    console.error('Configuration error:', error.message);
  }
}
```

**TimeoutError**

タイムアウトエラー。

```javascript
try {
  await bridge.executeCommand('long-running-command', [], { timeout: 5000 });
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.error('Command timed out after 5 seconds');
  }
}
```

---

## 設定ガイド

### ⚙️ 設定ファイル

#### 設定ファイルの優先順位

1. `bridge-config.json` (Bridge固有設定)
2. `.claude.json` (プロジェクト設定)
3. `settings.json` (ユーザー設定)
4. デフォルト設定

#### 設定スキーマ

**bridge-config.json**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "superclaude": {
      "type": "object",
      "properties": {
        "cliPath": {
          "type": "string",
          "description": "SuperClaude CLI実行パス"
        },
        "timeout": {
          "type": "number",
          "minimum": 1000,
          "description": "コマンドタイムアウト（ミリ秒）"
        },
        "maxRetries": {
          "type": "number",
          "minimum": 0,
          "description": "最大リトライ回数"
        }
      },
      "required": ["cliPath"]
    },
    "ipc": {
      "type": "object",
      "properties": {
        "timeout": {
          "type": "number",
          "minimum": 1000,
          "description": "IPC通信タイムアウト"
        },
        "bufferSize": {
          "type": "number",
          "minimum": 1024,
          "description": "バッファサイズ（バイト）"
        }
      }
    },
    "cache": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "description": "キャッシュ有効フラグ"
        },
        "maxSize": {
          "type": "number",
          "minimum": 1,
          "description": "最大キャッシュ数"
        },
        "ttl": {
          "type": "number",
          "minimum": 1000,
          "description": "キャッシュ生存時間（ミリ秒）"
        }
      }
    },
    "logging": {
      "type": "object",
      "properties": {
        "level": {
          "type": "string",
          "enum": ["error", "warn", "info", "debug"],
          "description": "ログレベル"
        },
        "file": {
          "type": "string",
          "description": "ログファイルパス"
        }
      }
    }
  },
  "required": ["superclaude"]
}
```

### 🔧 設定例

#### 開発環境設定

```json
{
  "superclaude": {
    "cliPath": "/usr/local/bin/SuperClaude",
    "timeout": 60000,
    "maxRetries": 3
  },
  "ipc": {
    "timeout": 30000,
    "bufferSize": 2097152
  },
  "cache": {
    "enabled": true,
    "maxSize": 200,
    "ttl": 600000
  },
  "logging": {
    "level": "debug",
    "file": "logs/bridge-dev.log"
  }
}
```

#### 本番環境設定

```json
{
  "superclaude": {
    "cliPath": "SuperClaude",
    "timeout": 30000,
    "maxRetries": 1
  },
  "ipc": {
    "timeout": 20000,
    "bufferSize": 1048576
  },
  "cache": {
    "enabled": true,
    "maxSize": 50,
    "ttl": 300000
  },
  "logging": {
    "level": "warn",
    "file": "logs/bridge-prod.log"
  }
}
```

#### 軽量設定（低スペック環境）

```json
{
  "superclaude": {
    "cliPath": "SuperClaude",
    "timeout": 15000,
    "maxRetries": 0
  },
  "ipc": {
    "timeout": 10000,
    "bufferSize": 524288
  },
  "cache": {
    "enabled": false
  },
  "logging": {
    "level": "error"
  }
}
```

### 🔄 動的設定更新

設定ファイルは自動監視され、変更時に自動リロードされます：

```javascript
const config = new ConfigManager({ autoReload: true });

config.on('configChanged', (data) => {
  console.log(`設定変更: ${data.key} = ${data.value}`);
});

config.on('fileReloaded', (data) => {
  console.log(`ファイル再読み込み: ${data.filePath}`);
});
```

### 🌍 環境変数

環境変数による設定オーバーライドも可能です：

```bash
# SuperClaude CLIパス
export SUPERCLAUDE_CLI_PATH="/custom/path/SuperClaude"

# タイムアウト設定
export SUPERCLAUDE_TIMEOUT=45000

# キャッシュ設定
export SUPERCLAUDE_CACHE_ENABLED=true
export SUPERCLAUDE_CACHE_MAX_SIZE=150

# ログレベル
export SUPERCLAUDE_LOG_LEVEL=debug
```

---

## 開発者ガイド

### 🛠️ 開発環境セットアップ

#### 必要なツール

- **Node.js**: 18.0.0以上
- **npm**: 8.0.0以上
- **Git**: バージョン管理
- **VSCode**: 推奨エディタ（Cursor IDE互換）

#### 開発用依存関係

```bash
# 開発依存関係のインストール
npm install --save-dev

# 主要な開発ツール
# - Jest: テストフレームワーク
# - ESLint: コード品質チェック
# - Prettier: コードフォーマット
```

### 🧪 テスト戦略

#### テストの種類

1. **単体テスト**: 個別コンポーネントのテスト
2. **統合テスト**: コンポーネント間連携のテスト
3. **E2Eテスト**: エンドツーエンドの動作テスト
4. **パフォーマンステスト**: 性能・負荷テスト

#### テスト実行

```bash
# 全テスト実行
npm test

# 監視モード（開発時）
npm run test:watch

# カバレッジレポート
npm run test:coverage

# 特定テストファイル実行
npm test -- command-bridge.test.js

# E2Eテスト実行
npm run test:e2e
```

#### テスト作成ガイドライン

**単体テストの例:**

```javascript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import CommandBridge from '../src/command-bridge.js';

describe('CommandBridge', () => {
  let bridge;

  beforeEach(() => {
    bridge = new CommandBridge({
      superclaudePath: 'mock-superclaude',
      timeout: 5000
    });
  });

  afterEach(() => {
    bridge.cleanup();
  });

  test('should execute command successfully', async () => {
    const result = await bridge.executeCommand('research', ['test query']);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.executionTime).toBeGreaterThan(0);
  });

  test('should handle command timeout', async () => {
    await expect(
      bridge.executeCommand('long-running-command', [], { timeout: 100 })
    ).rejects.toThrow('timeout');
  });
});
```

**統合テストの例:**

```javascript
import { describe, test, expect } from '@jest/globals';
import CursorBridge from '../src/cursor-bridge.js';
import CommandBridge from '../src/command-bridge.js';

describe('CursorBridge Integration', () => {
  test('should register and execute commands', async () => {
    const commandBridge = new CommandBridge();
    const cursorBridge = new CursorBridge({}, { commandBridge });

    const commands = await cursorBridge.registerChatCommands();
    expect(commands).toHaveLength(25);

    const result = await cursorBridge.dispatchCommand('research', ['test']);
    expect(result.success).toBe(true);
  });
});
```

### 🔧 コード品質

#### ESLint設定

```json
{
  "extends": ["standard"],
  "env": {
    "node": true,
    "es2022": true,
    "jest": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

#### コード品質チェック

```bash
# リンティング実行
npm run lint

# 自動修正
npm run lint:fix

# 型チェック（TypeScript使用時）
npm run type-check
```

### 📦 ビルドとデプロイ

#### ビルドスクリプト

```bash
# 本番用ビルド
npm run build

# 開発用ビルド（ソースマップ付き）
npm run build:dev

# クリーンビルド
npm run clean && npm run build
```

#### デプロイメント

```bash
# パッケージング
npm pack

# npm公開（メンテナー用）
npm publish

# Docker イメージビルド
docker build -t superclaude-cursor-bridge .
```

### 🔄 継続的インテグレーション

#### GitHub Actions設定例

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run tests
      run: npm test

    - name: Run coverage
      run: npm run test:coverage

    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

### 🐛 デバッグ

#### デバッグ設定

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug SuperClaude Bridge",
  "program": "${workspaceFolder}/index.js",
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "superclaude:*"
  },
  "console": "integratedTerminal",
  "skipFiles": ["<node_internals>/**"]
}
```

#### ログ出力

```javascript
import debug from 'debug';

const log = debug('superclaude:command-bridge');

class CommandBridge {
  async executeCommand(command, args) {
    log('Executing command: %s with args: %o', command, args);

    try {
      const result = await this._execute(command, args);
      log('Command completed successfully: %o', result);
      return result;
    } catch (error) {
      log('Command failed: %s', error.message);
      throw error;
    }
  }
}
```

### 📚 開発ベストプラクティス

#### コーディング規約

1. **ES Modules使用**: `import/export`を使用
2. **非同期処理**: `async/await`を優先
3. **エラーハンドリング**: 適切な例外処理
4. **型安全性**: JSDocによる型注釈
5. **テスタビリティ**: 依存性注入の活用

#### パフォーマンス最適化

```javascript
// 良い例: 並列処理
const results = await Promise.all([
  bridge.executeCommand('analyze', ['file1.js']),
  bridge.executeCommand('analyze', ['file2.js']),
  bridge.executeCommand('analyze', ['file3.js'])
]);

// 悪い例: 逐次処理
const results = [];
results.push(await bridge.executeCommand('analyze', ['file1.js']));
results.push(await bridge.executeCommand('analyze', ['file2.js']));
results.push(await bridge.executeCommand('analyze', ['file3.js']));
```

#### メモリ管理

```javascript
class CommandBridge {
  constructor() {
    this.activeCommands = new Map();
    this.executionHistory = [];
    this.maxHistorySize = 100;
  }

  cleanup() {
    // リソースのクリーンアップ
    this.activeCommands.clear();
    this.executionHistory.length = 0;
    this.removeAllListeners();
  }

  recordExecution(command, args, result) {
    // 履歴サイズ制限
    if (this.executionHistory.length >= this.maxHistorySize) {
      this.executionHistory.shift();
    }

    this.executionHistory.push({
      command,
      args,
      result,
      timestamp: Date.now()
    });
  }
}
```

---

## トラブルシューティング

### 🚨 よくある問題と解決方法

#### 1. SuperClaude CLIが見つからない

**症状:**
```
Error: SuperClaude CLI not found at path: SuperClaude
```

**解決方法:**

```bash
# SuperClaude CLIのインストール確認
which SuperClaude

# パスが見つからない場合
pipx install SuperClaude
# または
npm install -g @bifrost_inc/superclaude

# 設定ファイルでパス指定
{
  "superclaude": {
    "cliPath": "/full/path/to/SuperClaude"
  }
}
```

#### 2. コマンド実行タイムアウト

**症状:**
```
Error: Command execution timed out after 30000ms
```

**解決方法:**

```json
{
  "superclaude": {
    "timeout": 60000
  }
}
```

または実行時指定:

```javascript
await bridge.executeCommand('analyze', ['large-project/'], {
  timeout: 120000
});
```

#### 3. メモリ不足エラー

**症状:**
```
Error: JavaScript heap out of memory
```

**解決方法:**

```bash
# Node.jsメモリ制限を増加
export NODE_OPTIONS="--max-old-space-size=4096"

# または起動時指定
node --max-old-space-size=4096 index.js
```

設定でキャッシュサイズを調整:

```json
{
  "cache": {
    "enabled": true,
    "maxSize": 50,
    "ttl": 300000
  }
}
```

#### 4. 設定ファイル読み込みエラー

**症状:**
```
Error: Invalid JSON format in .claude.json
```

**解決方法:**

```bash
# JSON構文チェック
cat .claude.json | jq .

# 設定ファイル再作成
cp config/default.json .claude.json
```

#### 5. ポート競合エラー

**症状:**
```
Error: EADDRINUSE: address already in use
```

**解決方法:**

```bash
# 使用中のプロセス確認
lsof -i :3000

# プロセス終了
kill -9 <PID>

# 別ポート使用
export PORT=3001
```

### 🔍 デバッグ手順

#### 1. ログレベル設定

```json
{
  "logging": {
    "level": "debug",
    "file": "logs/debug.log"
  }
}
```

#### 2. 詳細ログ出力

```bash
# デバッグモード実行
DEBUG=superclaude:* npm start

# 特定モジュールのみ
DEBUG=superclaude:command-bridge npm start
```

#### 3. ステップバイステップ実行

```javascript
// デバッグ用の詳細ログ
const bridge = new CommandBridge({ debug: true });

bridge.on('commandStarted', (data) => {
  console.log('🚀 Command started:', data);
});

bridge.on('commandProgress', (data) => {
  console.log('⏳ Progress:', data);
});

bridge.on('commandCompleted', (data) => {
  console.log('✅ Command completed:', data);
});

bridge.on('commandFailed', (data) => {
  console.error('❌ Command failed:', data);
});
```

### 📊 パフォーマンス診断

#### 1. 実行時間測定

```javascript
const monitor = new PerformanceMonitor();

// 測定開始
const context = monitor.startMeasurement('analyze');

try {
  const result = await bridge.executeCommand('analyze', ['src/']);
  monitor.endMeasurement(context, { success: true });
} catch (error) {
  monitor.endMeasurement(context, { success: false, error: error.message });
}

// 統計表示
console.log(monitor.getStatistics());
```

#### 2. メモリ使用量監視

```javascript
function logMemoryUsage() {
  const usage = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(usage.external / 1024 / 1024)} MB`
  });
}

// 定期的にメモリ使用量をログ出力
setInterval(logMemoryUsage, 10000);
```

#### 3. キャッシュ効率分析

```javascript
const cache = new ResultCache();

// キャッシュ統計取得
const stats = cache.getStats();
console.log('Cache Statistics:', {
  hitRate: `${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)}%`,
  totalEntries: stats.size,
  memoryUsage: `${Math.round(stats.memoryUsage / 1024 / 1024)} MB`
});
```

### 🛠️ 復旧手順

#### 1. 設定リセット

```bash
# 設定ファイルバックアップ
cp .claude.json .claude.json.backup

# デフォルト設定復元
cp config/default.json .claude.json

# Bridge設定リセット
rm bridge-config.json
npm run setup
```

#### 2. キャッシュクリア

```bash
# キャッシュディレクトリクリア
rm -rf .cache/

# プログラムからクリア
const cache = new ResultCache();
cache.clear();
```

#### 3. 完全再初期化

```bash
# 依存関係再インストール
rm -rf node_modules/
rm package-lock.json
npm install

# SuperClaude CLI再インストール
pipx uninstall SuperClaude
pipx install SuperClaude
SuperClaude install
```

### 📞 サポート情報

#### ログ収集

問題報告時は以下の情報を含めてください：

```bash
# システム情報
node --version
npm --version
SuperClaude --version

# 設定情報
cat .claude.json
cat bridge-config.json

# ログファイル
tail -n 100 logs/bridge.log

# エラー詳細
npm test 2>&1 | tee test-output.log
```

#### 問題報告テンプレート

```markdown
## 問題の概要
[問題の簡潔な説明]

## 再現手順
1. [ステップ1]
2. [ステップ2]
3. [ステップ3]

## 期待される動作
[期待していた結果]

## 実際の動作
[実際に起こった結果]

## 環境情報
- OS: [例: Ubuntu 20.04]
- Node.js: [例: v18.17.0]
- SuperClaude: [例: v1.2.3]
- Bridge: [例: v0.1.0]

## 追加情報
[ログファイル、設定ファイル、スクリーンショットなど]
```

---

## パフォーマンス最適化

### ⚡ 最適化戦略

#### 1. キャッシュ最適化

**結果キャッシュの活用:**

```javascript
const cache = new ResultCache({
  maxSize: 200,        // キャッシュ最大数
  ttl: 600000,         // 10分間有効
  algorithm: 'lru'     // LRU (Least Recently Used)
});

// キャッシュキーの最適化
function generateCacheKey(command, args, options = {}) {
  const normalizedArgs = args.map(arg =>
    typeof arg === 'string' ? arg.toLowerCase().trim() : arg
  );

  const keyData = {
    command,
    args: normalizedArgs,
    // オプションの一部のみをキーに含める
    depth: options.depth,
    format: options.format
  };

  return crypto.createHash('md5')
    .update(JSON.stringify(keyData))
    .digest('hex');
}
```

**階層キャッシュ:**

```javascript
class HierarchicalCache {
  constructor() {
    this.l1Cache = new Map(); // メモリキャッシュ（高速）
    this.l2Cache = new ResultCache(); // ディスクキャッシュ（大容量）
  }

  async get(key) {
    // L1キャッシュから取得試行
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }

    // L2キャッシュから取得試行
    const l2Result = this.l2Cache.get(key);
    if (l2Result) {
      // L1キャッシュにプロモート
      this.l1Cache.set(key, l2Result);
      return l2Result;
    }

    return null;
  }

  set(key, value) {
    this.l1Cache.set(key, value);
    this.l2Cache.set(key, value);
  }
}
```

#### 2. 並列処理最適化

**コマンド並列実行:**

```javascript
class ParallelCommandExecutor {
  constructor(maxConcurrency = 4) {
    this.maxConcurrency = maxConcurrency;
    this.activeCommands = new Set();
  }

  async executeParallel(commands) {
    const results = new Map();
    const queue = [...commands];

    while (queue.length > 0 || this.activeCommands.size > 0) {
      // 空きスロットがある場合、新しいコマンドを開始
      while (queue.length > 0 && this.activeCommands.size < this.maxConcurrency) {
        const command = queue.shift();
        const promise = this.executeCommand(command)
          .then(result => {
            results.set(command.id, result);
          })
          .finally(() => {
            this.activeCommands.delete(promise);
          });

        this.activeCommands.add(promise);
      }

      // 1つ以上のコマンド完了を待機
      if (this.activeCommands.size > 0) {
        await Promise.race(this.activeCommands);
      }
    }

    return results;
  }
}
```

**ストリーミング処理:**

```javascript
class StreamingProcessor {
  async processLargeDataset(data, processor) {
    const CHUNK_SIZE = 100;
    const results = [];

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);

      // チャンクを並列処理
      const chunkResults = await Promise.all(
        chunk.map(item => processor(item))
      );

      results.push(...chunkResults);

      // メモリ圧迫を避けるため、適度に待機
      if (i % (CHUNK_SIZE * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }
}
```

#### 3. メモリ最適化

**オブジェクトプール:**

```javascript
class CommandContextPool {
  constructor(maxSize = 50) {
    this.pool = [];
    this.maxSize = maxSize;
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }

    return this.createContext();
  }

  release(context) {
    // コンテキストをリセット
    context.reset();

    if (this.pool.length < this.maxSize) {
      this.pool.push(context);
    }
  }

  createContext() {
    return {
      id: null,
      command: null,
      args: null,
      startTime: null,
      reset() {
        this.id = null;
        this.command = null;
        this.args = null;
        this.startTime = null;
      }
    };
  }
}
```

**ガベージコレクション最適化:**

```javascript
class MemoryManager {
  constructor() {
    this.gcInterval = setInterval(() => {
      if (global.gc) {
        global.gc();
      }
    }, 30000); // 30秒ごと
  }

  cleanup() {
    clearInterval(this.gcInterval);
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      heapUsed: usage.heapUsed / 1024 / 1024,
      external: usage.external / 1024 / 1024
    };
  }

  isMemoryPressure() {
    const usage = this.getMemoryUsage();
    return usage.heapUsed > 500; // 500MB以上で圧迫状態
  }
}
```

#### 4. I/O最適化

**バッチ処理:**

```javascript
class BatchProcessor {
  constructor(batchSize = 10, flushInterval = 1000) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.batch = [];
    this.timer = null;
  }

  add(item) {
    this.batch.push(item);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  async flush() {
    if (this.batch.length === 0) return;

    const items = this.batch.splice(0);

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    try {
      await this.processBatch(items);
    } catch (error) {
      console.error('Batch processing failed:', error);
      // 失敗したアイテムを再キューに追加
      this.batch.unshift(...items);
    }
  }

  async processBatch(items) {
    // バッチ処理の実装
    console.log(`Processing batch of ${items.length} items`);
  }
}
```

**接続プール:**

```javascript
class ConnectionPool {
  constructor(maxConnections = 5) {
    this.maxConnections = maxConnections;
    this.activeConnections = new Set();
    this.waitingQueue = [];
  }

  async acquire() {
    if (this.activeConnections.size < this.maxConnections) {
      const connection = await this.createConnection();
      this.activeConnections.add(connection);
      return connection;
    }

    // 接続が利用可能になるまで待機
    return new Promise((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  release(connection) {
    this.activeConnections.delete(connection);

    if (this.waitingQueue.length > 0) {
      const resolve = this.waitingQueue.shift();
      this.activeConnections.add(connection);
      resolve(connection);
    } else {
      this.destroyConnection(connection);
    }
  }

  async createConnection() {
    // 接続作成の実装
    return { id: Date.now() };
  }

  destroyConnection(connection) {
    // 接続破棄の実装
    console.log('Connection destroyed:', connection.id);
  }
}
```

### 📊 パフォーマンス監視

#### リアルタイム監視

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => {
      this.collectMetrics();
    }, 5000); // 5秒ごと
  }

  collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };

    this.metrics.set(metrics.timestamp, metrics);

    // 古いメトリクスを削除（直近1時間分のみ保持）
    const oneHourAgo = Date.now() - 3600000;
    for (const [timestamp] of this.metrics) {
      if (timestamp < oneHourAgo) {
        this.metrics.delete(timestamp);
      }
    }
  }

  getPerformanceReport() {
    const recentMetrics = Array.from(this.metrics.values())
      .slice(-12); // 直近1分間（5秒×12）

    if (recentMetrics.length === 0) return null;

    const avgMemory = recentMetrics.reduce((sum, m) =>
      sum + m.memory.heapUsed, 0) / recentMetrics.length;

    const avgCpu = recentMetrics.reduce((sum, m) =>
      sum + m.cpu.user + m.cpu.system, 0) / recentMetrics.length;

    return {
      averageMemoryUsage: Math.round(avgMemory / 1024 / 1024), // MB
      averageCpuUsage: Math.round(avgCpu / 1000), // ms
      activeHandles: recentMetrics[recentMetrics.length - 1].activeHandles,
      activeRequests: recentMetrics[recentMetrics.length - 1].activeRequests
    };
  }
}
```

#### アラート機能

```javascript
class PerformanceAlerter {
  constructor(monitor, thresholds = {}) {
    this.monitor = monitor;
    this.thresholds = {
      memoryUsage: 500, // MB
      cpuUsage: 80,     // %
      responseTime: 5000, // ms
      ...thresholds
    };
    this.alerts = new Map();
  }

  checkAlerts() {
    const report = this.monitor.getPerformanceReport();
    if (!report) return;

    // メモリ使用量チェック
    if (report.averageMemoryUsage > this.thresholds.memoryUsage) {
      this.triggerAlert('HIGH_MEMORY_USAGE', {
        current: report.averageMemoryUsage,
        threshold: this.thresholds.memoryUsage
      });
    }

    // CPU使用量チェック
    if (report.averageCpuUsage > this.thresholds.cpuUsage) {
      this.triggerAlert('HIGH_CPU_USAGE', {
        current: report.averageCpuUsage,
        threshold: this.thresholds.cpuUsage
      });
    }
  }

  triggerAlert(type, data) {
    const alertKey = `${type}_${Date.now()}`;

    if (!this.alerts.has(type)) {
      this.alerts.set(type, Date.now());

      console.warn(`🚨 Performance Alert: ${type}`, data);

      // アラート通知の実装
      this.sendNotification(type, data);
    }
  }

  sendNotification(type, data) {
    // Slack、メール、ログファイルなどへの通知
    console.log(`Notification sent for ${type}:`, data);
  }
}
```

### 🎯 最適化チェックリスト

#### ✅ 実装時チェック項目

- [ ] **キャッシュ戦略**: 適切なキャッシュキーとTTL設定
- [ ] **並列処理**: CPU集約的タスクの並列化
- [ ] **メモリ管理**: オブジェクトプールとガベージコレクション
- [ ] **I/O最適化**: バッチ処理と接続プール
- [ ] **エラーハンドリング**: 適切なリトライとフォールバック
- [ ] **監視**: パフォーマンスメトリクスの収集
- [ ] **アラート**: 閾値ベースの自動アラート
- [ ] **プロファイリング**: 定期的な性能測定

#### 📈 パフォーマンス目標

| メトリクス | 目標値 | 警告レベル | 危険レベル |
|-----------|--------|-----------|-----------|
| 応答時間 | < 2秒 | > 5秒 | > 10秒 |
| メモリ使用量 | < 200MB | > 500MB | > 800MB |
| CPU使用率 | < 50% | > 80% | > 95% |
| キャッシュヒット率 | > 70% | < 50% | < 30% |
| エラー率 | < 1% | > 5% | > 10% |

---

## 📝 まとめ

**SuperClaude for Cursor** は、SuperClaudeの強力な機能をCursor IDEで活用するための、包括的で高性能な統合システムです。

### 🎯 主な利点

- **🚀 高性能**: キャッシュ、並列処理、最適化機能
- **🔧 柔軟性**: 25コマンド、15エージェント、7MCPサーバー対応
- **📊 監視**: リアルタイムパフォーマンス追跡
- **🛡️ 堅牢性**: 包括的エラーハンドリングとテスト
- **📚 保守性**: モジュラー設計と詳細ドキュメント

### 🔄 継続的改善

このシステムは継続的に改善されており、コミュニティからのフィードバックと貢献を歓迎しています。

### 📞 サポート

- **GitHub Issues**: バグ報告・機能要望
- **ドキュメント**: 包括的なガイドとAPI仕様
- **コミュニティ**: 開発者フォーラムとディスカッション

---

**🎉 SuperClaude for Cursorで、より効率的で強力な開発体験をお楽しみください！**
