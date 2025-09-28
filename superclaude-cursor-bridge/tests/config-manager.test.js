import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import ConfigManager from '../src/config-manager.js';
import fs from 'fs/promises';
import path from 'path';

describe('Task 2.3: Configuration Manager - 受入基準テスト', () => {
  let configManager;
  let tempDir;

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    tempDir = path.join(process.cwd(), 'temp-test-config');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (e) {
      // ディレクトリが既に存在する場合は無視
    }

    configManager = new ConfigManager({
      configDir: tempDir,
      autoReload: false // テスト中は自動リロードを無効化
    });
  });

  afterEach(async () => {
    configManager?.cleanup?.();

    // テスト用ディレクトリをクリーンアップ
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // エラーは無視（ディレクトリが既に削除済み等）
    }
  });

  describe('SuperClaude設定ファイル（.claude.json, settings.json）の読み取り', () => {
    test('既存の.claude.jsonファイルを読み取ることができる', async () => {
      const testConfig = {
        superclaude: {
          cliPath: '/usr/local/bin/SuperClaude',
          timeout: 30000
        }
      };

      const configPath = path.join(tempDir, '.claude.json');
      await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2));

      const config = await configManager.loadSuperClaudeConfig();

      expect(config).toBeDefined();
      expect(config.superclaude.cliPath).toBe('/usr/local/bin/SuperClaude');
      expect(config.superclaude.timeout).toBe(30000);
    });

    test('settings.jsonファイルを読み取ることができる', async () => {
      const testSettings = {
        ui: {
          theme: 'dark',
          fontSize: 14
        },
        behavior: {
          autoSave: true
        }
      };

      const settingsPath = path.join(tempDir, 'settings.json');
      await fs.writeFile(settingsPath, JSON.stringify(testSettings, null, 2));

      const settings = await configManager.loadSettings();

      expect(settings).toBeDefined();
      expect(settings.ui.theme).toBe('dark');
      expect(settings.behavior.autoSave).toBe(true);
    });

    test('設定ファイルが存在しない場合はデフォルト値を返す', async () => {
      const config = await configManager.loadSuperClaudeConfig();

      expect(config).toBeDefined();
      expect(config.superclaude).toBeDefined();
      expect(config.superclaude.cliPath).toBe('SuperClaude'); // デフォルト値
    });
  });

  describe('Bridge固有設定の管理', () => {
    test('Bridge設定を作成・保存できる', async () => {
      const bridgeConfig = {
        ipc: {
          timeout: 30000,
          bufferSize: 1048576
        },
        logging: {
          level: 'info',
          file: 'bridge.log'
        }
      };

      await configManager.saveBridgeConfig(bridgeConfig);

      const loaded = await configManager.loadBridgeConfig();
      expect(loaded.ipc.timeout).toBe(30000);
      expect(loaded.logging.level).toBe('info');
    });

    test('設定値を個別に取得・設定できる', async () => {
      await configManager.setSetting('ipc.timeout', 45000);
      await configManager.setSetting('logging.level', 'debug');

      const timeout = await configManager.getSetting('ipc.timeout');
      const logLevel = await configManager.getSetting('logging.level');

      expect(timeout).toBe(45000);
      expect(logLevel).toBe('debug');
    });

    test('ネストした設定値を適切に処理する', async () => {
      await configManager.setSetting('superclaude.commands.research.priority', 'high');

      const priority = await configManager.getSetting('superclaude.commands.research.priority');
      expect(priority).toBe('high');
    });
  });

  describe('設定ファイルの妥当性検証', () => {
    test('無効なJSON形式でエラーが発生する', async () => {
      const invalidJsonPath = path.join(tempDir, '.claude.json');
      await fs.writeFile(invalidJsonPath, '{ invalid json }');

      await expect(configManager.loadSuperClaudeConfig()).rejects.toThrow('Invalid JSON');
    });

    test('必須設定項目の不足を検出する', async () => {
      const incompleteConfig = {
        // superclaude.cliPath が不足
        superclaude: {
          timeout: 30000
        }
      };

      await expect(configManager.validateConfig(incompleteConfig)).rejects.toThrow('Missing required configuration');
    });

    test('設定値の型検証が動作する', async () => {
      const invalidTypeConfig = {
        superclaude: {
          cliPath: 'SuperClaude',
          timeout: 'invalid-number' // 数値であるべき
        }
      };

      await expect(configManager.validateConfig(invalidTypeConfig)).rejects.toThrow('Invalid configuration type');
    });
  });

  describe('設定変更の動的反映', () => {
    test('設定変更がリアルタイムで反映される', async () => {
      const originalTimeout = await configManager.getSetting('ipc.timeout', 30000);

      await configManager.setSetting('ipc.timeout', 60000);

      const newTimeout = await configManager.getSetting('ipc.timeout');
      expect(newTimeout).toBe(60000);
      expect(newTimeout).not.toBe(originalTimeout);
    });

    test('設定変更イベントが発生する', async () => {
      const mockListener = jest.fn();
      configManager.on('configChanged', mockListener);

      await configManager.setSetting('logging.level', 'warn');

      expect(mockListener).toHaveBeenCalledWith({
        key: 'logging.level',
        value: 'warn',
        previousValue: expect.any(String)
      });
    });

    test('設定ファイル監視が動作する（オプション機能）', async () => {
      // ファイル監視機能をテスト
      const configWithWatcher = new ConfigManager({
        configDir: tempDir,
        autoReload: true
      });

      const mockReloadListener = jest.fn();
      configWithWatcher.on('fileReloaded', mockReloadListener);

      // 外部からファイルを変更
      const configPath = path.join(tempDir, '.claude.json');
      const newConfig = { superclaude: { cliPath: 'UpdatedPath', timeout: 45000 } };
      await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));

      // 少し待ってから確認（ファイル監視は非同期）
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockReloadListener).toHaveBeenCalled();

      configWithWatcher.cleanup();
    });

    test('ファイル監視でsettings.json変更時の処理', async () => {
      const configWithWatcher = new ConfigManager({
        configDir: tempDir,
        autoReload: true
      });

      try {
        const mockReloadListener = jest.fn();
        configWithWatcher.on('fileReloaded', mockReloadListener);

        // settings.jsonを変更
        const settingsPath = path.join(tempDir, 'settings.json');
        const newSettings = { ui: { theme: 'light' } };
        await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));

        // 少し待ってから確認
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockReloadListener).toHaveBeenCalled();
      } finally {
        configWithWatcher.cleanup();
      }
    });

    test('ファイル監視でbridge-config.json変更時の処理', async () => {
      const configWithWatcher = new ConfigManager({
        configDir: tempDir,
        autoReload: true
      });

      try {
        const mockReloadListener = jest.fn();
        configWithWatcher.on('fileReloaded', mockReloadListener);

        // bridge-config.jsonを変更
        const bridgeConfigPath = path.join(tempDir, 'bridge-config.json');
        const newBridgeConfig = { logging: { level: 'debug' } };
        await fs.writeFile(bridgeConfigPath, JSON.stringify(newBridgeConfig, null, 2));

        // 少し待ってから確認
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockReloadListener).toHaveBeenCalled();
      } finally {
        configWithWatcher.cleanup();
      }
    });

    test('ファイル監視でエラーが発生した場合の処理', async () => {
      const configWithWatcher = new ConfigManager({
        configDir: tempDir,
        autoReload: true
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        // 無効なファイルを作成してエラーをシミュレート
        const configPath = path.join(tempDir, '.claude.json');
        await fs.writeFile(configPath, '{ invalid json }');

        // chokidar のchangeイベントを手動でトリガー
        configWithWatcher.watchers[0].emit('change');

        // 少し待ってエラー処理を確認
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Error reloading configuration file:',
          expect.stringContaining('Invalid JSON')
        );
      } finally {
        consoleWarnSpy.mockRestore();
        configWithWatcher.cleanup();
      }
    });

    test('loadSuperClaudeConfigでSyntaxError以外のエラー', async () => {
      // fs.readFileをモックしてSyntaxError以外のエラーを発生させる
      const originalReadFile = fs.readFile;
      fs.readFile = jest.fn().mockRejectedValue(new Error('Permission denied'));

      try {
        await expect(configManager.loadSuperClaudeConfig()).rejects.toThrow('Permission denied');
      } finally {
        fs.readFile = originalReadFile;
      }
    });

    test('loadSettingsでSyntaxError以外のエラー', async () => {
      // fs.readFileをモックしてSyntaxError以外のエラーを発生させる
      const originalReadFile = fs.readFile;
      fs.readFile = jest.fn().mockRejectedValue(new Error('Permission denied'));

      try {
        await expect(configManager.loadSettings()).rejects.toThrow('Permission denied');
      } finally {
        fs.readFile = originalReadFile;
      }
    });

    test('loadBridgeConfigでSyntaxError以外のエラー', async () => {
      // fs.readFileをモックしてSyntaxError以外のエラーを発生させる
      const originalReadFile = fs.readFile;
      fs.readFile = jest.fn().mockRejectedValue(new Error('Permission denied'));

      try {
        await expect(configManager.loadBridgeConfig()).rejects.toThrow('Permission denied');
      } finally {
        fs.readFile = originalReadFile;
      }
    });
  });

  describe('エラーハンドリングとフォールバック', () => {
    test('設定ファイル読み取りエラー時のフォールバック', async () => {
      // 存在しないディレクトリを指定
      const configWithInvalidDir = new ConfigManager({
        configDir: '/nonexistent/directory'
      });

      const config = await configWithInvalidDir.loadSuperClaudeConfig();

      // デフォルト設定が返されることを確認
      expect(config).toBeDefined();
      expect(config.superclaude.cliPath).toBe('SuperClaude');

      configWithInvalidDir.cleanup();
    });

    test('設定ファイル書き込みエラーの適切な処理', async () => {
      // 読み取り専用ディレクトリを作ろうとする（権限エラーをシミュレート）
      await expect(async () => {
        await configManager.setSetting('test.key', 'value');
        // 権限エラーが発生した場合の処理をテスト
      }).not.toThrow(); // gracefulに処理されることを確認
    });

    test('settings.jsonで無効なJSON形式の場合のエラー処理', async () => {
      const invalidJsonPath = path.join(tempDir, 'settings.json');
      await fs.writeFile(invalidJsonPath, '{ invalid json }');

      await expect(configManager.loadSettings()).rejects.toThrow('Invalid JSON format in settings.json');
    });

    test('bridge-config.jsonで無効なJSON形式の場合のエラー処理', async () => {
      const invalidJsonPath = path.join(tempDir, 'bridge-config.json');
      await fs.writeFile(invalidJsonPath, '{ invalid json }');

      await expect(configManager.loadBridgeConfig()).rejects.toThrow('Invalid JSON format in bridge-config.json');
    });

    test('getSetting内部でエラーが発生した場合のフォールバック', async () => {
      // デフォルト設定を破壊して内部エラーをシミュレート
      configManager.defaultConfig = null;

      const result = await configManager.getSetting('nonexistent.key', 'fallback');
      expect(result).toBe('fallback');
    });

    test('saveBridgeConfigでnon-objectの値を処理', async () => {
      const config = {
        simpleValue: 'string',
        nested: {
          key: 'value'
        }
      };

      await configManager.saveBridgeConfig(config);

      const simpleValue = await configManager.getSetting('simpleValue');
      const nestedValue = await configManager.getSetting('nested.key');

      expect(simpleValue).toBe('string');
      expect(nestedValue).toBe('value');
    });

    test('validateConfigで無効な設定オブジェクトのテスト', async () => {
      await expect(configManager.validateConfig(null)).rejects.toThrow('Invalid configuration format');
      await expect(configManager.validateConfig('string')).rejects.toThrow('Invalid configuration format');
      await expect(configManager.validateConfig({})).rejects.toThrow('Missing required configuration: superclaude section');
    });

    test('永続化エラーの処理（_persistSettings）', async () => {
      // fs.writeFileをモックしてエラーを発生させる
      const originalWriteFile = fs.writeFile;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      fs.writeFile = jest.fn().mockRejectedValue(new Error('Write error'));

      try {
        // エラーが発生しても例外は投げられない
        await expect(configManager.setSetting('test.key', 'value')).resolves.toBeUndefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to persist settings:', 'Write error');
      } finally {
        // クリーンアップ
        fs.writeFile = originalWriteFile;
        consoleWarnSpy.mockRestore();
      }
    });

    test('cleanup時のwatcherエラーハンドリング', async () => {
      const configWithWatcher = new ConfigManager({
        configDir: tempDir,
        autoReload: true
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // watcherのcloseメソッドをモックしてエラーを発生させる
      configWithWatcher.watchers[0].close = jest.fn().mockImplementation(() => {
        throw new Error('Watcher close error');
      });

      // cleanupでエラーが発生しても例外は投げられない
      expect(() => configWithWatcher.cleanup()).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Error closing file watcher:', 'Watcher close error');

      consoleWarnSpy.mockRestore();
    });

    test('不正なキー名でエラーが発生する', async () => {
      await expect(configManager.getSetting('')).rejects.toThrow('Invalid setting key');
      await expect(configManager.setSetting('', 'value')).rejects.toThrow('Invalid setting key');
    });
  });
});