import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { watch } from 'chokidar';

/**
 * Configuration Manager for SuperClaude Cursor Integration
 *
 * Manages configuration files, provides validation, and supports
 * dynamic configuration updates with file watching capabilities.
 */
export class ConfigManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.configDir = options.configDir || process.cwd();
    this.autoReload = options.autoReload !== false;
    this.settings = new Map();
    this.watchers = [];

    // デフォルト設定
    this.defaultConfig = this._getDefaultConfiguration();

    // ファイル監視の初期化
    if (this.autoReload) {
      this._initializeFileWatching();
    }
  }

  /**
   * Get default configuration settings
   * @private
   * @returns {Object} Default configuration object
   */
  _getDefaultConfiguration() {
    return {
      superclaude: {
        cliPath: 'SuperClaude',
        timeout: 30000
      },
      ipc: {
        timeout: 30000,
        bufferSize: 1048576
      },
      logging: {
        level: 'info',
        file: null
      }
    };
  }

  /**
   * Load SuperClaude configuration (.claude.json)
   * @returns {Promise<Object>} Configuration object
   */
  async loadSuperClaudeConfig() {
    try {
      const configPath = path.join(this.configDir, '.claude.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);

      // 設定の妥当性検証
      await this.validateConfig(config);

      return config;
    } catch (error) {
      if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
        // ファイルが存在しない場合はデフォルト設定を返す
        return { ...this.defaultConfig };
      }

      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in .claude.json');
      }

      throw error;
    }
  }

  /**
   * Load settings.json file
   * @returns {Promise<Object>} Settings object
   */
  async loadSettings() {
    try {
      const settingsPath = path.join(this.configDir, 'settings.json');
      const settingsData = await fs.readFile(settingsPath, 'utf8');
      return JSON.parse(settingsData);
    } catch (error) {
      if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
        return {};
      }

      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in settings.json');
      }

      throw error;
    }
  }

  /**
   * Save bridge-specific configuration
   * @param {Object} config - Bridge configuration object
   */
  async saveBridgeConfig(config) {
    const configPath = path.join(this.configDir, 'bridge-config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

    // 設定をメモリに保存
    Object.entries(config).forEach(([section, values]) => {
      if (typeof values === 'object' && values !== null) {
        Object.entries(values).forEach(([key, value]) => {
          this.settings.set(`${section}.${key}`, value);
        });
      } else {
        this.settings.set(section, values);
      }
    });
  }

  /**
   * Load bridge-specific configuration
   * @returns {Promise<Object>} Bridge configuration object
   */
  async loadBridgeConfig() {
    try {
      const configPath = path.join(this.configDir, 'bridge-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
        return { ...this.defaultConfig };
      }

      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in bridge-config.json');
      }

      throw error;
    }
  }

  /**
   * Get a specific setting value
   * @param {string} key - Setting key (dot notation supported)
   * @param {*} defaultValue - Default value if setting not found
   * @returns {Promise<*>} Setting value
   */
  async getSetting(key, defaultValue = undefined) {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Invalid setting key');
    }

    // メモリから取得を試行
    if (this.settings.has(key)) {
      return this.settings.get(key);
    }

    // デフォルト設定から取得を試行
    const keyParts = key.split('.');
    let value = this.defaultConfig;

    try {
      for (const part of keyParts) {
        value = value[part];
        if (value === undefined) {
          break;
        }
      }

      return value !== undefined ? value : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Set a specific setting value
   * @param {string} key - Setting key (dot notation supported)
   * @param {*} value - Setting value
   */
  async setSetting(key, value) {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Invalid setting key');
    }

    const previousValue = await this.getSetting(key);
    this.settings.set(key, value);

    // 設定変更イベントを発生
    this.emit('configChanged', {
      key,
      value,
      previousValue
    });

    // ファイルに永続化
    await this._persistSettings();
  }

  /**
   * Validate configuration object
   * @param {Object} config - Configuration to validate
   * @throws {Error} If validation fails
   */
  async validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration format');
    }

    // 必須設定項目の検証
    if (!config.superclaude) {
      throw new Error('Missing required configuration: superclaude section');
    }

    // cliPathが必須
    if (!config.superclaude.cliPath) {
      throw new Error('Missing required configuration: superclaude.cliPath');
    }

    // 型の検証
    if (config.superclaude.timeout !== undefined &&
        (typeof config.superclaude.timeout !== 'number' || config.superclaude.timeout < 0)) {
      throw new Error('Invalid configuration type: timeout must be a positive number');
    }

    return true;
  }

  /**
   * Initialize file watching for automatic reload
   * @private
   */
  _initializeFileWatching() {
    const filesToWatch = [
      path.join(this.configDir, '.claude.json'),
      path.join(this.configDir, 'settings.json'),
      path.join(this.configDir, 'bridge-config.json')
    ];

    filesToWatch.forEach(filePath => {
      const watcher = watch(filePath, { ignoreInitial: true });

      watcher.on('change', async () => {
        try {
          // ファイルが変更された場合の処理
          this.emit('fileReloaded', { filePath });

          // 設定の再読み込み
          if (path.basename(filePath) === '.claude.json') {
            await this.loadSuperClaudeConfig();
          } else if (path.basename(filePath) === 'settings.json') {
            await this.loadSettings();
          } else if (path.basename(filePath) === 'bridge-config.json') {
            await this.loadBridgeConfig();
          }
        } catch (error) {
          console.warn('Error reloading configuration file:', error.message);
        }
      });

      this.watchers.push(watcher);
    });
  }

  /**
   * Persist current settings to file
   * @private
   */
  async _persistSettings() {
    try {
      const settingsObject = {};

      // Map形式の設定をオブジェクト形式に変換
      for (const [key, value] of this.settings.entries()) {
        const keyParts = key.split('.');
        let current = settingsObject;

        for (let i = 0; i < keyParts.length - 1; i++) {
          if (!current[keyParts[i]]) {
            current[keyParts[i]] = {};
          }
          current = current[keyParts[i]];
        }

        current[keyParts[keyParts.length - 1]] = value;
      }

      const configPath = path.join(this.configDir, 'bridge-config.json');
      await fs.writeFile(configPath, JSON.stringify(settingsObject, null, 2), 'utf8');
    } catch (error) {
      console.warn('Failed to persist settings:', error.message);
      // 永続化エラーは例外を投げずに警告のみ
    }
  }

  /**
   * Cleanup resources and stop file watchers
   */
  cleanup() {
    // ファイル監視を停止
    this.watchers.forEach(watcher => {
      try {
        watcher.close();
      } catch (error) {
        console.warn('Error closing file watcher:', error.message);
      }
    });

    this.watchers = [];
    this.settings.clear();
    this.removeAllListeners();
  }
}