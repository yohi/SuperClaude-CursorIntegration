# API ドキュメント

SuperClaude Cursor統合システムの開発者向けAPIリファレンスです。

## Core Components

### CommandBridge

SuperClaudeコマンドの実行とマッピングを管理するコアコンポーネント。

```javascript
import CommandBridge from './src/command-bridge.js';

const bridge = new CommandBridge({
  superclaudePath: '/usr/local/bin/SuperClaude',
  timeout: 30000
});

// コマンド実行
const result = await bridge.executeCommand('research', ['技術調査']);
```

#### Methods

##### `executeCommand(command, args, options)`

SuperClaudeコマンドを実行します。

**Parameters:**
- `command` (string): 実行するコマンド名
- `args` (Array): コマンド引数
- `options` (Object): 実行オプション
  - `timeout` (number): タイムアウト時間（ミリ秒）
  - `signal` (AbortSignal): キャンセル用シグナル

**Returns:** Promise\<Object\>
- `success` (boolean): 実行成功フラグ
- `data` (any): 実行結果データ
- `error` (string): エラーメッセージ（失敗時）

### JsonProtocol

SuperClaude CLIとのJSON通信を処理するコンポーネント。

```javascript
import { JsonProtocol } from './src/json-protocol.js';

const protocol = new JsonProtocol();
const result = await protocol.sendCommand({
  command: 'analyze',
  args: ['src/']
});
```

#### Methods

##### `sendCommand(data)`

JSON形式でコマンドを送信します。

**Parameters:**
- `data` (Object): 送信データ
  - `command` (string): コマンド名
  - `args` (Array): 引数

**Returns:** Promise\<Object\>

### ConfigManager

設定ファイルの管理を行うコンポーネント。

```javascript
import ConfigManager from './src/config-manager.js';

const config = new ConfigManager();
const superclaudePath = config.get('superclaude.cliPath');
```

#### Methods

##### `get(key)`

設定値を取得します。

**Parameters:**
- `key` (string): 設定キー（ドット記法対応）

**Returns:** any

##### `set(key, value)`

設定値を更新します。

**Parameters:**
- `key` (string): 設定キー
- `value` (any): 設定値

### PerformanceMonitor

パフォーマンス測定とモニタリングを行うコンポーネント。

```javascript
import PerformanceMonitor from './src/performance-monitor.js';

const monitor = new PerformanceMonitor();
const context = monitor.startMeasurement('analyze');
// ... 処理実行 ...
monitor.endMeasurement(context, { success: true });
```

#### Methods

##### `startMeasurement(command)`

測定開始。

**Parameters:**
- `command` (string): コマンド名

**Returns:** Object - 測定コンテキスト

##### `endMeasurement(context, result)`

測定終了。

**Parameters:**
- `context` (Object): 測定コンテキスト
- `result` (Object): 実行結果

##### `getStatistics()`

統計情報取得。

**Returns:** Object - パフォーマンス統計

### ProgressManager

進行状況管理を行うコンポーネント。

```javascript
import ProgressManager from './src/progress-manager.js';

const progress = new ProgressManager();
const id = progress.createProgress('cmd-1', 'analyze', 4);
progress.updateProgress(id, 50, 'Analyzing...');
```

#### Methods

##### `createProgress(commandId, commandName, estimatedSteps)`

進行状況を作成。

**Parameters:**
- `commandId` (string): コマンドID
- `commandName` (string): コマンド名
- `estimatedSteps` (number): 推定ステップ数

**Returns:** string - プログレスID

##### `updateProgress(progressId, percentage, message)`

進行状況を更新。

**Parameters:**
- `progressId` (string): プログレスID
- `percentage` (number): 進行率（0-100）
- `message` (string): メッセージ

### ResultCache

実行結果のキャッシュを管理するコンポーネント。

```javascript
import ResultCache from './src/result-cache.js';

const cache = new ResultCache();
cache.set('analyze:src/', result);
const cached = cache.get('analyze:src/');
```

#### Methods

##### `set(key, value)`

キャッシュに値を保存。

**Parameters:**
- `key` (string): キャッシュキー
- `value` (any): 保存する値

##### `get(key)`

キャッシュから値を取得。

**Parameters:**
- `key` (string): キャッシュキー

**Returns:** any | null

##### `has(key)`

キャッシュにキーが存在するかチェック。

**Parameters:**
- `key` (string): キャッシュキー

**Returns:** boolean

## Events

### CommandBridge Events

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
```

### ProgressManager Events

```javascript
progress.on('progress', (data) => {
  console.log('Progress:', data.percentage);
});

progress.on('complete', (data) => {
  console.log('Completed:', data.commandId);
});
```

## Error Handling

### Error Types

#### CommandExecutionError

コマンド実行エラー。

```javascript
try {
  await bridge.executeCommand('invalid-command');
} catch (error) {
  if (error instanceof CommandExecutionError) {
    console.error('Command execution failed:', error.message);
  }
}
```

#### ConfigurationError

設定エラー。

```javascript
try {
  const config = new ConfigManager();
  config.load('/invalid/path');
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message);
  }
}
```

## Configuration Schema

### settings.json Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "superclaude": {
      "type": "object",
      "properties": {
        "cliPath": { "type": "string" },
        "timeout": { "type": "number", "minimum": 1000 },
        "maxRetries": { "type": "number", "minimum": 0 }
      },
      "required": ["cliPath"]
    },
    "cache": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "maxSize": { "type": "number", "minimum": 1 },
        "ttl": { "type": "number", "minimum": 1000 }
      }
    }
  },
  "required": ["superclaude"]
}
```

## Usage Examples

### Basic Command Execution

```javascript
import SuperClaudeBridge from './index.js';

const bridge = new SuperClaudeBridge();

// シンプルな実行
const result = await bridge.execute('research', ['AI技術トレンド']);
console.log(result.data);

// 進行状況監視付き実行
bridge.on('progress', (data) => {
  console.log(`Progress: ${data.percentage}% - ${data.message}`);
});

const analysisResult = await bridge.execute('analyze', ['src/components/']);
```

### Error Handling with Retry

```javascript
async function executeWithRetry(command, args, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await bridge.execute(command, args);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

### Custom Configuration

```javascript
const bridge = new SuperClaudeBridge({
  superclaude: {
    cliPath: '/custom/path/to/SuperClaude',
    timeout: 60000
  },
  cache: {
    enabled: true,
    maxSize: 200
  },
  performance: {
    monitoring: true
  }
});
```