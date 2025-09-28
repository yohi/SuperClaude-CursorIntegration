/**
 * Result Cache for SuperClaude Command Execution
 * Implements intelligent caching with TTL and memory management
 */

import crypto from 'crypto';

export default class ResultCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5分
    this.commandTTLs = {
      research: 10 * 60 * 1000, // 10分 - research結果は比較的長期有効
      analyze: 5 * 60 * 1000,   // 5分 - コード解析は中期有効
      review: 15 * 60 * 1000,   // 15分 - レビューは長期有効
      explain: 30 * 60 * 1000   // 30分 - 説明は最も長期有効
    };

    // クリーンアップ用タイマー
    this.cleanupInterval = setInterval(() => {
      this._cleanup();
    }, 60 * 1000); // 1分間隔でクリーンアップ

    // Node.jsプロセスを維持しないようにunrefを呼び出し
    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Generate cache key for command and arguments
   * @param {string} commandName - Command name
   * @param {Array} args - Command arguments
   * @returns {string} Cache key
   */
  _generateKey(commandName, args = []) {
    const normalizedArgs = this._normalizeArgs(args);
    const keyData = `${commandName}:${JSON.stringify(normalizedArgs)}`;
    return crypto.createHash('sha256').update(keyData).digest('hex');
  }

  /**
   * Normalize arguments for consistent caching
   * @private
   * @param {Array} args - Arguments to normalize
   * @returns {Array} Normalized arguments
   */
  _normalizeArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return arg.trim().toLowerCase();
      }
      if (typeof arg === 'object' && arg !== null) {
        // オブジェクトのプロパティをソートして一貫性を保つ
        const sorted = {};
        Object.keys(arg).sort().forEach(key => {
          sorted[key] = arg[key];
        });
        return sorted;
      }
      return arg;
    });
  }

  /**
   * Get cached result for command
   * @param {string} commandName - Command name
   * @param {Array} args - Command arguments
   * @returns {Object|null} Cached result or null
   */
  get(commandName, args = []) {
    const key = this._generateKey(commandName, args);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTLチェック
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // ヒット回数を更新
    entry.hitCount++;
    entry.lastAccessed = Date.now();

    return {
      ...entry.result,
      _cacheInfo: {
        cached: true,
        hitCount: entry.hitCount,
        cachedAt: entry.cachedAt,
        lastAccessed: entry.lastAccessed
      }
    };
  }

  /**
   * Store result in cache
   * @param {string} commandName - Command name
   * @param {Array} args - Command arguments
   * @param {Object} result - Result to cache
   * @param {number} customTTL - Custom TTL in milliseconds
   * @returns {boolean} True if cached successfully
   */
  set(commandName, args = [], result, customTTL = null) {
    // キャッシュ対象外の結果をチェック
    if (!this._shouldCache(commandName, result)) {
      return false;
    }

    const key = this._generateKey(commandName, args);
    const ttl = customTTL || this.commandTTLs[commandName] || this.defaultTTL;
    const now = Date.now();

    const entry = {
      key,
      commandName,
      args: this._normalizeArgs(args),
      result: this._cloneResult(result),
      cachedAt: now,
      expiresAt: now + ttl,
      lastAccessed: now,
      hitCount: 0,
      size: this._estimateSize(result)
    };

    // メモリ制限チェック
    if (this._needsEviction()) {
      this._evictOldEntries();
    }

    this.cache.set(key, entry);
    return true;
  }

  /**
   * Check if result should be cached
   * @private
   * @param {string} commandName - Command name
   * @param {Object} result - Result to check
   * @returns {boolean} True if should be cached
   */
  _shouldCache(commandName, result) {
    // エラー結果はキャッシュしない
    if (!result || result.success === false) {
      return false;
    }

    // 大きすぎる結果はキャッシュしない (> 1MB)
    if (this._estimateSize(result) > 1024 * 1024) {
      return false;
    }

    // 特定のコマンドのみキャッシュ
    const cacheableCommands = ['research', 'analyze', 'review', 'explain'];
    return cacheableCommands.includes(commandName);
  }

  /**
   * Estimate memory size of result
   * @private
   * @param {Object} result - Result to estimate
   * @returns {number} Estimated size in bytes
   */
  _estimateSize(result) {
    try {
      return JSON.stringify(result).length * 2; // UTF-16推定
    } catch {
      return 1024; // デフォルト1KB
    }
  }

  /**
   * Clone result for safe storage
   * @private
   * @param {Object} result - Result to clone
   * @returns {Object} Cloned result
   */
  _cloneResult(result) {
    try {
      return JSON.parse(JSON.stringify(result));
    } catch {
      return { ...result };
    }
  }

  /**
   * Check if cache needs eviction
   * @private
   * @returns {boolean} True if eviction needed
   */
  _needsEviction() {
    return this.cache.size >= this.maxSize;
  }

  /**
   * Evict old or less frequently used entries
   * @private
   */
  _evictOldEntries() {
    const entries = Array.from(this.cache.values());

    // まず期限切れエントリを削除
    const now = Date.now();
    const expired = entries.filter(entry => entry.expiresAt < now);
    expired.forEach(entry => this.cache.delete(entry.key));

    // まだ制限を超えている場合、LRU方式で削除
    if (this.cache.size >= this.maxSize) {
      const sortedEntries = entries
        .filter(entry => entry.expiresAt >= now)
        .sort((a, b) => {
          // アクセス頻度とアクセス時刻を考慮
          const scoreA = a.hitCount * 0.7 + (a.lastAccessed / 1000) * 0.3;
          const scoreB = b.hitCount * 0.7 + (b.lastAccessed / 1000) * 0.3;
          return scoreA - scoreB;
        });

      const toRemove = Math.ceil(this.maxSize * 0.2); // 20%削除
      for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
        this.cache.delete(sortedEntries[i].key);
      }
    }
  }

  /**
   * Cleanup expired entries
   * @private
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate cache for specific command
   * @param {string} commandName - Command name to invalidate
   * @param {Array} args - Optional specific arguments
   */
  invalidate(commandName, args = null) {
    if (args !== null) {
      // 特定の引数の組み合わせのみ無効化
      const key = this._generateKey(commandName, args);
      this.cache.delete(key);
    } else {
      // コマンド全体を無効化
      for (const [key, entry] of this.cache.entries()) {
        if (entry.commandName === commandName) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

    const commandStats = {};
    entries.forEach(entry => {
      if (!commandStats[entry.commandName]) {
        commandStats[entry.commandName] = { count: 0, hits: 0, size: 0 };
      }
      commandStats[entry.commandName].count++;
      commandStats[entry.commandName].hits += entry.hitCount;
      commandStats[entry.commandName].size += entry.size;
    });

    return {
      totalEntries: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      totalSize,
      averageHitsPerEntry: entries.length > 0 ? (totalHits / entries.length).toFixed(2) : 0,
      memoryUsage: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      commandBreakdown: commandStats,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.cachedAt)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.cachedAt)) : null
    };
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}