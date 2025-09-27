import { EventEmitter } from 'events';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { realpathSync } from 'fs';
import path from 'path';
import { watch } from 'chokidar';

/**
 * File Utilities for SuperClaude Cursor Integration
 *
 * Provides secure file operations, configuration persistence,
 * cross-platform path handling, and file watching capabilities.
 */
export class FileUtilities extends EventEmitter {
  constructor(options = {}) {
    super();

    this.baseDir = path.resolve(options.baseDir || process.cwd());
    try {
      this.baseDirRealPath = realpathSync(this.baseDir);
    } catch (error) {
      // baseDirが存在しない場合は、そのまま設定値を使用
      this.baseDirRealPath = this.baseDir;
    }
    this.enableFileWatching = options.enableFileWatching !== false;
    this.watchers = new Map();
    this.fileCache = new Map();
    this.maxCacheSize = options.maxCacheSize || 100;

    // セキュリティ設定
    this.allowedExtensions = options.allowedExtensions || [
      '.json', '.js', '.ts', '.md', '.txt', '.yml', '.yaml', '.xml', '.log'
    ];

    // 危険なファイル名（Windows予約名等）
    this.dangerousNames = [
      'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
      'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4',
      'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
  }

  /**
   * Write content to a file
   * @param {string} filePath - Relative file path
   * @param {string} content - File content
   * @param {Object} options - Write options
   */
  async writeFile(filePath, content, options = {}) {
    const safePath = this._validateAndNormalizePath(filePath);
    const fullPath = path.join(this.baseDir, safePath);

    // ディレクトリを作成（必要に応じて）
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(fullPath, content, { encoding: 'utf8', ...options });

    // キャッシュを更新
    if (this.fileCache.has(safePath)) {
      this.fileCache.set(safePath, {
        content,
        timestamp: Date.now()
      });
    }

    // ファイル変更イベントを発生
    this.emit('fileWritten', { filePath: safePath, content });
  }

  /**
   * Read content from a file
   * @param {string} filePath - Relative file path
   * @param {Object} options - Read options
   * @returns {Promise<string>} File content
   */
  async readFile(filePath, options = {}) {
    const safePath = this._validateAndNormalizePath(filePath);
    const fullPath = path.join(this.baseDir, safePath);

    // キャッシュチェック
    if (options.useCache && this.fileCache.has(safePath)) {
      const cached = this.fileCache.get(safePath);
      // キャッシュの有効期限チェック（5分）
      if (Date.now() - cached.timestamp < 300000) {
        return cached.content;
      }
    }

    try {
      const content = await fs.readFile(fullPath, { encoding: 'utf8', ...options });

      // キャッシュに保存
      if (options.useCache) {
        this._addToCache(safePath, content);
      }

      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Write JSON data to a file
   * @param {string} filePath - Relative file path
   * @param {Object} data - JSON data
   * @param {Object} options - Write options
   */
  async writeJsonFile(filePath, data, options = {}) {
    const jsonContent = JSON.stringify(data, null, 2);
    await this.writeFile(filePath, jsonContent, options);
  }

  /**
   * Read JSON data from a file
   * @param {string} filePath - Relative file path
   * @param {Object} options - Read options
   * @returns {Promise<Object>} Parsed JSON data
   */
  async readJsonFile(filePath, options = {}) {
    try {
      const content = await this.readFile(filePath, options);
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON format in file: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Relative file path
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    try {
      const safePath = this._validateAndNormalizePath(filePath);
      const fullPath = path.join(this.baseDir, safePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   * @param {string} dirPath - Relative directory path
   * @returns {Promise<boolean>} True if directory exists
   */
  async directoryExists(dirPath) {
    try {
      const safePath = this._validateAndNormalizePath(dirPath);
      const fullPath = path.join(this.baseDir, safePath);
      const stat = await fs.stat(fullPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Create a directory
   * @param {string} dirPath - Relative directory path
   */
  async createDirectory(dirPath) {
    const safePath = this._validateAndNormalizePath(dirPath);
    const fullPath = path.join(this.baseDir, safePath);
    await fs.mkdir(fullPath, { recursive: true });
  }

  /**
   * Remove a directory
   * @param {string} dirPath - Relative directory path
   */
  async removeDirectory(dirPath) {
    const safePath = this._validateAndNormalizePath(dirPath);
    const fullPath = path.join(this.baseDir, safePath);
    await fs.rm(fullPath, { recursive: true, force: true });
  }

  /**
   * Persist configuration object to file
   * @param {string} configPath - Configuration file path
   * @param {Object} config - Configuration object
   */
  async persistConfig(configPath, config) {
    await this.writeJsonFile(configPath, config);
  }

  /**
   * Load configuration from file
   * @param {string} configPath - Configuration file path
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfig(configPath) {
    return await this.readJsonFile(configPath);
  }

  /**
   * Update configuration with partial updates
   * @param {string} configPath - Configuration file path
   * @param {Object} updates - Updates object with dot notation keys
   */
  async updateConfig(configPath, updates) {
    const config = await this.loadConfig(configPath);

    // ドット記法でのネストした設定更新
    for (const [key, value] of Object.entries(updates)) {
      this._setNestedValue(config, key, value);
    }

    await this.persistConfig(configPath, config);
  }

  /**
   * Create backup of a file
   * @param {string} filePath - File to backup
   * @returns {Promise<string>} Backup file path
   */
  async createBackup(filePath) {
    const safePath = this._validateAndNormalizePath(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${safePath}.backup-${timestamp}`;

    const content = await this.readFile(safePath);
    await this.writeFile(backupPath, content);

    return backupPath;
  }

  /**
   * Normalize file path and ensure cross-platform compatibility
   * @param {string} filePath - File path to normalize
   * @returns {string} Normalized path
   */
  normalizePath(filePath) {
    // 基本的なパス正規化
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  /**
   * Check if path is absolute
   * @param {string} filePath - Path to check
   * @returns {boolean} True if absolute path
   */
  isAbsolutePath(filePath) {
    // Unix style 絶対パス or Windows style 絶対パス
    return path.isAbsolute(filePath) || /^[A-Za-z]:\\/.test(filePath);
  }

  /**
   * Watch a file for changes
   * @param {string} filePath - File to watch
   */
  async watchFile(filePath) {
    if (!this.enableFileWatching) return;

    const safePath = this._validateAndNormalizePath(filePath);
    const fullPath = path.join(this.baseDir, safePath);

    if (this.watchers.has(safePath)) {
      return; // Already watching
    }

    const watcher = watch(fullPath, { ignoreInitial: true });

    watcher.on('change', () => {
      this.fileCache.delete(safePath);
      this.emit('fileChanged', { filePath: safePath });
    });

    watcher.on('unlink', () => {
      this.fileCache.delete(safePath);
      this.emit('fileDeleted', { filePath: safePath });
    });

    this.watchers.set(safePath, watcher);
  }

  /**
   * Enable auto-reload for configuration files
   * @param {string} configPath - Configuration file to watch
   */
  async enableAutoReload(configPath) {
    if (!this.enableFileWatching) return;

    const safePath = this._validateAndNormalizePath(configPath);
    await this.watchFile(safePath);

    // 設定ファイル専用のリスナーを追加
    this.on('fileChanged', async (event) => {
      if (event.filePath === safePath) {
        try {
          const config = await this.loadConfig(safePath);
          this.emit('configReloaded', { filePath: safePath, config });
        } catch (error) {
          console.warn('Error reloading config:', error.message);
        }
      }
    });
  }

  /**
   * Check if file is a symbolic link
   * @param {string} filePath - File path to check
   * @returns {Promise<boolean>} True if symbolic link
   */
  async isSymbolicLink(filePath) {
    try {
      const safePath = this._validateAndNormalizePath(filePath);
      const fullPath = path.join(this.baseDir, safePath);
      const stat = await fs.lstat(fullPath);
      return stat.isSymbolicLink();
    } catch {
      return false;
    }
  }

  /**
   * Create a read stream for large files
   * @param {string} filePath - File path
   * @param {Object} options - Stream options
   * @returns {ReadStream} Read stream
   */
  async createReadStream(filePath, options = {}) {
    const safePath = this._validateAndNormalizePath(filePath);
    const fullPath = path.join(this.baseDir, safePath);
    return createReadStream(fullPath, options);
  }

  /**
   * Validate and normalize file path for security
   * @private
   * @param {string} filePath - File path to validate
   * @returns {string} Safe normalized path
   */
  _validateAndNormalizePath(filePath) {
    // 空のパスチェック
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      throw new Error('Invalid file path');
    }

    // 最初に絶対パスを検出（正規化前の原始的チェック）
    if (this.isAbsolutePath(filePath)) {
      throw new Error('Path outside base directory not allowed');
    }

    // 正規化
    const normalized = this.normalizePath(filePath);

    // クロスプラットフォーム対応のパストラバーサル検出
    // baseDir に対する解決済みパスを計算
    const resolvedTarget = path.resolve(this.baseDir, normalized);
    const relativePath = path.relative(this.baseDir, resolvedTarget);

    // パストラバーサル攻撃の検出
    // 1. 相対パスが '..' で始まる場合は baseDir の外側
    // 2. 解決済みパスが baseDir の外側にある場合
    if (relativePath.startsWith('..') || !resolvedTarget.startsWith(path.resolve(this.baseDir))) {
      throw new Error('Security violation: path traversal detected');
    }

    // シンボリックリンク経由での脱出を防ぐ
    // 1. ファイル自体がシンボリックリンクの場合をチェック
    let targetRealPath;
    try {
      targetRealPath = realpathSync(resolvedTarget);
      // ファイルターゲットのrealpathが取得できた場合、それを検証
      if (
        targetRealPath !== this.baseDirRealPath &&
        !targetRealPath.startsWith(`${this.baseDirRealPath}${path.sep}`)
      ) {
        throw new Error('Security violation: symlink escape detected');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // ファイルが存在しない場合は親ディレクトリをチェック
        let parentRealPath;
        try {
          parentRealPath = realpathSync(path.dirname(resolvedTarget));
        } catch (parentError) {
          if (parentError.code === 'ENOENT') {
            parentRealPath = this.baseDirRealPath;
          } else {
            throw parentError;
          }
        }

        if (
          parentRealPath !== this.baseDirRealPath &&
          !parentRealPath.startsWith(`${this.baseDirRealPath}${path.sep}`)
        ) {
          throw new Error('Security violation: symlink escape detected');
        }
      } else {
        // その他のエラーは再スロー
        throw error;
      }
    }

    // 空の相対パス（つまり baseDir そのもの）は許可しない
    if (relativePath === '' || relativePath === '.') {
      throw new Error('Invalid file path: cannot access base directory');
    }

    // 危険なファイル名の検出（拡張子を除いたベース名で検証）
    const fileName = path.basename(normalized);
    const baseName = path.parse(fileName).name.toUpperCase();
    if (this.dangerousNames.includes(baseName)) {
      throw new Error('Invalid file name: reserved system name');
    }

    return normalized;
  }

  /**
   * Set nested value using dot notation
   * @private
   * @param {Object} obj - Target object
   * @param {string} key - Dot notation key
   * @param {*} value - Value to set
   */
  _setNestedValue(obj, key, value) {
    const keys = key.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Add content to cache with size management
   * @private
   * @param {string} filePath - File path
   * @param {string} content - File content
   */
  _addToCache(filePath, content) {
    // キャッシュサイズ制限
    if (this.fileCache.size >= this.maxCacheSize) {
      const firstKey = this.fileCache.keys().next().value;
      this.fileCache.delete(firstKey);
    }

    this.fileCache.set(filePath, {
      content,
      timestamp: Date.now()
    });
  }

  /**
   * Cleanup resources and stop file watchers
   */
  cleanup() {
    // ファイル監視を停止
    for (const [filePath, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        console.warn(`Error closing watcher for ${filePath}:`, error.message);
      }
    }

    this.watchers.clear();
    this.fileCache.clear();
    this.removeAllListeners();
  }
}