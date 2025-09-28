/**
 * Optimized Command Registry
 * Enhanced version with performance monitoring and caching
 */

import { EventEmitter } from 'events';
import Research from './research.js';
import Analyze from './analyze.js';
import Review from './review.js';
import Explain from './explain.js';
import OptimizedCommandBridge from '../src/optimized-command-bridge.js';

export default class OptimizedCommandRegistry extends EventEmitter {
  constructor(dependencies = {}) {
    super();
    // 最適化されたCommandBridgeを使用
    this.commandBridge = dependencies.commandBridge ||
      new OptimizedCommandBridge(dependencies.bridgeOptions);

    this.jsonProtocol = dependencies.jsonProtocol;

    const optimizedDependencies = {
      commandBridge: this.commandBridge,
      jsonProtocol: this.jsonProtocol
    };

    this.commands = {
      research: new Research(optimizedDependencies),
      analyze: new Analyze(optimizedDependencies),
      review: new Review(optimizedDependencies),
      explain: new Explain(optimizedDependencies)
    };

    // 進行状況イベントのプロキシ
    this.commandBridge.on('progress', (data) => {
      this.emit?.('progress', data);
    });

    this.commandBridge.on('commandComplete', (data) => {
      this.emit?.('commandComplete', data);
    });

    this.commandBridge.on('commandCancelled', (data) => {
      this.emit?.('commandCancelled', data);
    });
  }

  /**
   * Get command instance
   * @param {string} commandName - Command name
   * @returns {Object} Command instance
   */
  getCommand(commandName) {
    const command = this.commands[commandName];
    if (!command) {
      throw new Error(`Command '${commandName}' not found`);
    }
    return command;
  }

  /**
   * Execute command with optimizations
   * @param {string} commandName - Command name
   * @param {...any} args - Command arguments
   * @returns {Promise<Object>} Execution result
   */
  async executeCommand(commandName, ...args) {
    const command = this.getCommand(commandName);
    return await command.execute(...args);
  }

  /**
   * Execute command with progress tracking
   * @param {string} commandName - Command name
   * @param {Object} progressOptions - Progress options
   * @param {...any} args - Command arguments
   * @returns {Promise<Object>} Execution result with progress tracking
   */
  async executeCommandWithProgress(commandName, progressOptions = {}, ...args) {
    const command = this.getCommand(commandName);

    const options = {
      ...progressOptions,
      commandId: progressOptions.commandId || `${commandName}_${Date.now()}`
    };

    // コマンドの独自のexecuteメソッドを呼び出すことで
    // 入力検証とCLI引数の整形を適切に実行
    const commandArgs = [...args];
    const lastArg = commandArgs[commandArgs.length - 1];
    if (lastArg && typeof lastArg === 'object' && !Array.isArray(lastArg)) {
      commandArgs[commandArgs.length - 1] = { ...lastArg, ...options };
    } else {
      commandArgs.push({ ...options });
    }
    return await command.execute(...commandArgs);
  }

  /**
   * Cancel command execution
   * @param {string} commandId - Command ID
   * @param {string} reason - Cancellation reason
   * @returns {boolean} Success status
   */
  cancelCommand(commandId, reason) {
    return this.commandBridge.cancelCommand(commandId, reason);
  }

  /**
   * Get available commands
   * @returns {Array} List of command names
   */
  getAvailableCommands() {
    return Object.keys(this.commands);
  }

  /**
   * Get active commands
   * @returns {Array} List of active commands
   */
  getActiveCommands() {
    return this.commandBridge.getActiveCommands();
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    return this.commandBridge.getPerformanceStats();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return this.commandBridge.getCacheStats();
  }

  /**
   * Get optimization recommendations
   * @returns {Array} Optimization recommendations
   */
  getOptimizationRecommendations() {
    return this.commandBridge.getOptimizationRecommendations();
  }

  /**
   * Clear command cache
   * @param {string} commandName - Optional command name
   */
  clearCache(commandName) {
    this.commandBridge.clearCache(commandName);
  }

  /**
   * Get system health status
   * @returns {Object} System health information
   */
  getSystemHealth() {
    const perfStats = this.getPerformanceStats();
    const cacheStats = this.getCacheStats();
    const activeCommands = this.getActiveCommands();
    const recommendations = this.getOptimizationRecommendations();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      performance: {
        averageResponseTime: perfStats.averageExecutionTime,
        successRate: parseFloat(perfStats.successRate),
        activeCommands: activeCommands.length
      },
      cache: {
        hitRate: cacheStats.totalEntries > 0 ?
          ((cacheStats.totalHits / cacheStats.totalEntries) * 100).toFixed(2) : 0,
        memoryUsage: cacheStats.memoryUsage,
        utilization: `${cacheStats.totalEntries}/${cacheStats.maxSize}`
      },
      warnings: recommendations.filter(r => r.priority === 'high').length,
      recommendations: recommendations.length
    };

    // ヘルスステータスの判定
    if (health.performance.successRate < 95 || health.performance.averageResponseTime > 5000) {
      health.status = 'degraded';
    }
    if (health.performance.successRate < 90 || health.warnings > 2) {
      health.status = 'unhealthy';
    }

    return health;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.commandBridge.cleanup();
  }
}

export { Research, Analyze, Review, Explain, OptimizedCommandBridge };