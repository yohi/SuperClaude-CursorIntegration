/**
 * Optimized Command Bridge for SuperClaude Cursor Integration
 * Enhanced version with performance monitoring, progress tracking, and caching
 */

import { EventEmitter } from 'events';
import CommandBridge from './command-bridge.js';
import PerformanceMonitor from './performance-monitor.js';
import ProgressManager from './progress-manager.js';
import ResultCache from './result-cache.js';
import { v4 as uuidv4 } from 'uuid';

export default class OptimizedCommandBridge extends CommandBridge {
  constructor(options = {}) {
    super(options);

    this.performanceMonitor = new PerformanceMonitor(options.performance);
    this.progressManager = new ProgressManager(options.progress);
    this.resultCache = new ResultCache(options.cache);

    // 進行状況イベントのリスナー設定
    this.progressManager.on('progress', (data) => {
      this.emit('progress', data);
    });

    this.progressManager.on('complete', (data) => {
      this.emit('commandComplete', data);
    });

    this.progressManager.on('cancelled', (data) => {
      this.emit('commandCancelled', data);
    });
  }

  /**
   * Execute SuperClaude command with optimizations
   * @param {string} commandName - Command name to execute
   * @param {Array} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeCommand(commandName, args = [], options = {}) {
    const commandId = options.commandId || uuidv4();

    // キャッシュチェック
    if (!options.skipCache) {
      const cachedResult = this.resultCache.get(commandName, args);
      if (cachedResult) {
        const res = {
          ...cachedResult,
          _metrics: {
            ...(cachedResult._metrics || {}),
            commandId,
            cached: true,
            executionTime: 0,
            warnings: []
          }
        };
        return res;
      }
    }

    // パフォーマンス測定開始
    const perfContext = this.performanceMonitor.startMeasurement(commandName);

    // 進行状況追跡開始
    const progressContext = this.progressManager.startProgress(
      commandId,
      commandName,
      { totalSteps: this._estimateSteps(commandName) }
    );

    try {
      // コマンドとパラメータの検証
      this.validateParameters(commandName, args);

      // キャンセルチェック
      if (progressContext.cancelled) {
        throw new Error('Command was cancelled before execution');
      }

      // 進行状況更新: 初期化完了
      this.progressManager.updateProgress(commandId, {
        step: 10,
        status: 'validating',
        message: 'Validating command parameters...'
      });

      // SuperClaudeコマンドに変換
      const { command: scCommand } = this.translateCommand(commandName, args);
      const normalizedArgs = this.normalizeParameters(commandName, args);

      // 進行状況更新: 変換完了
      this.progressManager.updateProgress(commandId, {
        step: 20,
        status: 'preparing',
        message: 'Preparing SuperClaude command...'
      });

      // AbortSignalの統合 - 外部signalと内部signalを結合
      let externalAbortListener;
      if (options.signal) {
        // 外部signalが発火したら内部AbortControllerもabortする
        externalAbortListener = () => {
          progressContext.abortController.abort();
        };
        options.signal.addEventListener('abort', externalAbortListener, { once: true });
      }

      const combinedOptions = {
        ...options,
        signal: progressContext.abortController.signal,
        _cleanup: () => {
          // リスナーのクリーンアップ
          if (externalAbortListener && options.signal) {
            options.signal.removeEventListener('abort', externalAbortListener);
          }
        }
      };

      // 実際のSuperClaude CLI実行
      const result = await this._executeOptimizedCommand(
        scCommand,
        normalizedArgs,
        combinedOptions,
        commandId
      );

      // 実行履歴を記録
      this.recordExecution(commandName, args, result);

      // 結果をキャッシュ
      if (result.success && !options.skipCache) {
        this.resultCache.set(commandName, args, result);
      }

      // パフォーマンス測定終了
      const metrics = this.performanceMonitor.endMeasurement(perfContext, result);

      // メトリクス情報を結果に追加
      const finalResult = {
        ...result,
        _metrics: {
          executionTime: metrics.executionTime,
          commandId,
          cached: false,
          warnings: metrics.warning || []
        }
      };

      // 進行状況完了（メトリクス情報付きで通知）
      this.progressManager.completeProgress(commandId, finalResult);

      return finalResult;

    } catch (error) {
      // エラー時の処理
      const metrics = this.performanceMonitor.endMeasurement(perfContext, { success: false });

      this.progressManager.completeProgress(commandId, {
        success: false,
        message: error.message
      });

      // キャンセル時の追加チェック
      if (progressContext.cancelled || error.message.includes('cancelled')) {
        throw new Error(`Command '${commandName}' was cancelled`);
      }

      throw error;
    } finally {
      // リスナーのクリーンアップを確実に実行
      if (combinedOptions._cleanup) {
        combinedOptions._cleanup();
      }
    }
  }

  /**
   * Execute optimized SuperClaude CLI command
   * @private
   * @param {string} scCommand - SuperClaude command
   * @param {Array} args - Normalized arguments
   * @param {Object} options - Execution options
   * @param {string} commandId - Command ID for progress tracking
   * @returns {Promise<Object>} Execution result
   */
  async _executeOptimizedCommand(scCommand, args, options, commandId) {
    // 進行状況更新: 実行開始
    this.progressManager.updateProgress(commandId, {
      step: 30,
      status: 'executing',
      message: 'Executing SuperClaude command...'
    });

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let bootstrapTimer;
      let progressInterval;
      let finalizeTimer;

      bootstrapTimer = setTimeout(() => {
        // AbortSignalチェック
        if (options.signal?.aborted) {
          reject(new Error('Command execution was aborted'));
          return;
        }

        // 進行状況の段階的更新
        const progressSteps = [40, 50, 60, 70, 80, 90];
        const messages = [
          'Processing request...',
          'Analyzing data...',
          'Generating response...',
          'Formatting output...',
          'Finalizing results...',
          'Almost complete...'
        ];

        let currentProgressIndex = 0;
        progressInterval = setInterval(() => {
          if (currentProgressIndex < progressSteps.length) {
            this.progressManager.updateProgress(commandId, {
              step: progressSteps[currentProgressIndex],
              message: messages[currentProgressIndex]
            });
            currentProgressIndex++;
          } else {
            if (progressInterval) clearInterval(progressInterval);
          }
        }, 500); // 0.5秒間隔で更新

        // 模擬実行時間（実際の実装ではSuperClaude CLIのspawn）
        const executionTime = this._getEstimatedExecutionTime(scCommand);
        const delay = Math.max(executionTime - 100, 0);

        finalizeTimer = setTimeout(() => {
          if (progressInterval) clearInterval(progressInterval);

          // 最終AbortSignalチェック
          if (options.signal?.aborted) {
            reject(new Error('Command execution was aborted'));
            return;
          }

          resolve({
            success: true,
            command: scCommand,
            args: args,
            output: `Optimized mock execution result for ${scCommand}`,
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - startTime
          });
        }, delay);

      }, 100);

      // AbortSignalハンドラー
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          if (bootstrapTimer) clearTimeout(bootstrapTimer);
          if (finalizeTimer) clearTimeout(finalizeTimer);
          if (progressInterval) clearInterval(progressInterval);
          const err = new Error('Command execution was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }
    });
  }

  /**
   * Estimate execution steps for progress tracking
   * @private
   * @param {string} commandName - Command name
   * @returns {number} Estimated steps
   */
  _estimateSteps(commandName) {
    const stepEstimates = {
      research: 100,
      analyze: 80,
      review: 120,
      explain: 60
    };

    return stepEstimates[commandName] || 100;
  }

  /**
   * Get estimated execution time for command
   * @private
   * @param {string} scCommand - SuperClaude command
   * @returns {number} Estimated time in milliseconds
   */
  _getEstimatedExecutionTime(scCommand) {
    const timeEstimates = {
      '/sc:research': 2500,
      '/sc:analyze': 2000,
      '/sc:review': 3000,
      '/sc:explain': 1500
    };

    return timeEstimates[scCommand] || 2000;
  }

  /**
   * Cancel command execution
   * @param {string} commandId - Command ID to cancel
   * @param {string} reason - Cancellation reason
   * @returns {boolean} True if cancelled successfully
   */
  cancelCommand(commandId, reason = 'User cancelled') {
    return this.progressManager.cancelCommand(commandId, reason);
  }

  /**
   * Get active commands
   * @returns {Array} List of active commands
   */
  getActiveCommands() {
    return this.progressManager.getActiveCommands();
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    return this.performanceMonitor.getStatistics();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return this.resultCache.getStats();
  }

  /**
   * Get optimization recommendations
   * @returns {Array} Optimization recommendations
   */
  getOptimizationRecommendations() {
    return this.performanceMonitor.getOptimizationRecommendations();
  }

  /**
   * Clear cache
   * @param {string} commandName - Optional command name to clear
   */
  clearCache(commandName = null) {
    if (commandName) {
      this.resultCache.invalidate(commandName);
    } else {
      this.resultCache.clear();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    super.cleanup();
    this.progressManager.cleanup();
    this.resultCache.cleanup();
  }
}