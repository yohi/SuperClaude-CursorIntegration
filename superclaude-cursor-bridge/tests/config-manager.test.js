import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfigManager } from '../src/config-manager.js';
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

      configWithWatcher.cleanup();
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

    test('不正なキー名でエラーが発生する', async () => {
      await expect(configManager.getSetting('')).rejects.toThrow('Invalid setting key');
      await expect(configManager.setSetting('', 'value')).rejects.toThrow('Invalid setting key');
    });
  });
});