/**
 * Optimized Command Bridge for SuperClaude Cursor Integration
 * Enhanced version with performance monitoring, progress tracking, and caching
 */

import { EventEmitter } from 'events';
import CommandBridge from './command-bridge.js';
import PerformanceMonitor from './performance-monitor.js';
import ProgressManager from './progress-manager.js';
import ResultCache from './result-cache.js';
import { randomUUID } from 'crypto';

export default class OptimizedCommandBridge extends EventEmitter {
  constructor(options = {}) {
    super();

    this.commandBridge = new CommandBridge(options);
    this.performanceMonitor = new PerformanceMonitor(options.performance);
    this.progressManager = new ProgressManager(options.progress);
    this.resultCache = new ResultCache(options.cache);

    // Setup event listeners
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
    this.validateParameters(commandName, args);

    const commandId = options.commandId || randomUUID();
    const cacheKey = this._getCacheKey(commandName, args);

    // Check cache first
    if (!options.skipCache && this.resultCache.has(cacheKey)) {
      const cachedResult = this.resultCache.get(cacheKey);
      return {
        ...cachedResult,
        cached: true,
        commandId
      };
    }

    // Start performance monitoring
    const perfContext = this.performanceMonitor.startMeasurement(commandName);

    // Create progress tracking
    const progressId = this.progressManager.createProgress(
      commandId,
      commandName,
      this._estimateSteps(commandName)
    );

    try {
      // Execute optimized command
      const result = await this._executeOptimizedCommand(commandName, args, progressId, options.signal);

      // Cache successful results
      if (result.success) {
        this.resultCache.set(cacheKey, result);
      }

      // Update progress to complete
      this.progressManager.completeProgress(progressId);

      // End performance measurement with result information
      const measurementResult = { success: result?.success !== false };
      this.performanceMonitor.endMeasurement(perfContext, measurementResult);

      return {
        ...result,
        cached: false,
        commandId
      };

    } catch (error) {
      // Handle errors
      this.progressManager.failProgress(progressId, error.message);
      this.performanceMonitor.endMeasurement(perfContext, {
        success: false,
        error: error.message || String(error)
      });
      throw error;
    }
  }

  /**
   * Execute optimized command with progress tracking
   * @param {string} command - Command name
   * @param {Array} args - Command arguments
   * @param {string} progressId - Progress ID
   * @param {AbortSignal} signal - Abort signal
   * @returns {Promise<Object>} Execution result
   */
  async _executeOptimizedCommand(command, args, progressId, signal = null) {
    if (signal && signal.aborted) {
      throw new Error('Command was cancelled');
    }

    // Progress update: Preparing
    this.progressManager.updateProgress(progressId, 25, 'Preparing command...');

    if (signal && signal.aborted) {
      throw new Error('Command was cancelled');
    }

    // Progress update: Executing
    this.progressManager.updateProgress(progressId, 50, 'Executing command...');

    // Execute the actual command
    const result = await this.commandBridge.executeCommand(command, args, { signal });

    // Progress update: Processing
    this.progressManager.updateProgress(progressId, 75, 'Processing results...');

    return result;
  }

  /**
   * Generate cache key for command and arguments
   * @param {string} command - Command name
   * @param {Array} args - Command arguments
   * @returns {string} Cache key
   */
  _getCacheKey(command, args) {
    return `${command}:${JSON.stringify(args)}`;
  }

  /**
   * Estimate steps for command execution
   * @param {string} command - Command name
   * @returns {number} Estimated steps
   */
  _estimateSteps(command) {
    const commandSteps = {
      research: 4,
      analyze: 3,
      review: 3,
      explain: 2
    };
    return commandSteps[command] || 3;
  }

  /**
   * Estimate execution time for command
   * @param {string} command - Command name
   * @returns {number} Estimated time in milliseconds
   */
  _estimateExecutionTime(command) {
    const commandTimes = {
      research: 15000, // 15 seconds
      analyze: 8000,   // 8 seconds
      review: 10000,   // 10 seconds
      explain: 5000    // 5 seconds
    };
    return commandTimes[command] || 10000; // 10 seconds default
  }

  /**
   * Validate command parameters
   * @param {string} commandName - Command name
   * @param {Array} args - Command arguments
   */
  validateParameters(commandName, args) {
    if (!commandName || typeof commandName !== 'string') {
      throw new Error('Command name is required');
    }
    if (!Array.isArray(args)) {
      throw new Error('Arguments must be an array');
    }
  }

  /**
   * Cancel command execution
   * @param {string} commandId - Command ID to cancel
   */
  cancelCommand(commandId) {
    this.progressManager.cancelCommand(commandId);
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
    return this.performanceMonitor.getRecommendations();
  }

  /**
   * Clear cache
   * @param {string} commandName - Optional command name to clear
   */
  clearCache(commandName = null) {
    this.resultCache.clear(commandName);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.commandBridge.cleanup();
    this.performanceMonitor.cleanup();
    this.progressManager.cleanup();
    this.resultCache.cleanup();
  }
}
