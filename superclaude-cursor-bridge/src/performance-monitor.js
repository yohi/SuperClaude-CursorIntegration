/**
 * Performance Monitor for SuperClaude Command Execution
 * Monitors response times, memory usage, and provides optimization insights
 */

export default class PerformanceMonitor {
  constructor(options = {}) {
    this.maxHistorySize = options.maxHistorySize || 100;
    this.performanceHistory = [];
    this.thresholds = {
      lightCommand: options.lightCommandThreshold || 3000, // 3秒
      heavyCommand: options.heavyCommandThreshold || 30000, // 30秒
      memoryWarning: options.memoryWarning || 512 * 1024 * 1024, // 512MB
      memoryDeltaThreshold: options.memoryDeltaThreshold || 256 * 1024 * 1024, // 256MB増加
      memoryHighDelta: options.memoryHighDelta || 300 * 1024 * 1024 // 300MB以上は高警告
    };
  }

  /**
   * Start performance measurement for a command
   * @param {string} commandName - Name of the command
   * @returns {Object} Performance context
   */
  startMeasurement(commandName) {
    const context = {
      commandName,
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      id: `${commandName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    return context;
  }

  /**
   * End performance measurement and record results
   * @param {Object} context - Performance context from startMeasurement
   * @param {Object} result - Command execution result
   * @returns {Object} Performance metrics
   */
  endMeasurement(context, result = {}) {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();

    const metrics = {
      id: context.id,
      commandName: context.commandName,
      executionTime: endTime - context.startTime,
      memoryUsed: {
        rss: endMemory.rss - context.startMemory.rss,
        heapUsed: endMemory.heapUsed - context.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - context.startMemory.heapTotal
      },
      success: result.success !== false,
      timestamp: new Date().toISOString(),
      warning: this._generateWarnings(
        endTime - context.startTime,
        endMemory,
        context.startMemory
      )
    };

    this._recordMetrics(metrics);
    return metrics;
  }

  /**
   * Generate performance warnings
   * @private
   * @param {number} executionTime - Execution time in ms
   * @param {Object} endMemoryUsage - End memory usage object
   * @param {Object} startMemoryUsage - Start memory usage object
   * @returns {Array} Array of warnings
   */
  _generateWarnings(executionTime, endMemoryUsage, startMemoryUsage) {
    const warnings = [];

    if (executionTime > this.thresholds.lightCommand) {
      warnings.push({
        type: 'slow_execution',
        message: `Command took ${executionTime}ms (threshold: ${this.thresholds.lightCommand}ms)`,
        severity: executionTime > this.thresholds.heavyCommand ? 'high' : 'medium'
      });
    }

    // メモリ増分での警告判定
    if (startMemoryUsage && endMemoryUsage) {
      const memoryDelta = endMemoryUsage.rss - startMemoryUsage.rss;

      if (memoryDelta > this.thresholds.memoryDeltaThreshold) {
        warnings.push({
          type: 'memory',
          message: `Memory increased by ${Math.round(memoryDelta / 1024 / 1024)}MB during execution`,
          severity: memoryDelta >= this.thresholds.memoryHighDelta ? 'high' : 'medium'
        });
      }
    } else {
      // 開始時メモリが不明な場合は従来通りの絶対値判定（但し高いしきい値で）
      if (endMemoryUsage.rss > this.thresholds.memoryWarning * 2) {
        warnings.push({
          type: 'memory',
          message: `High absolute memory usage: ${Math.round(endMemoryUsage.rss / 1024 / 1024)}MB`,
          severity: 'medium'
        });
      }
    }

    return warnings;
  }

  /**
   * Record metrics in history
   * @private
   * @param {Object} metrics - Performance metrics
   */
  _recordMetrics(metrics) {
    this.performanceHistory.unshift(metrics);

    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getStatistics() {
    if (this.performanceHistory.length === 0) {
      return {
        totalExecutions: 0,
        averageExecutionTime: 0,
        fastestExecution: 0,
        slowestExecution: 0,
        successRate: 0,
        commandBreakdown: {}
      };
    }

    const executions = this.performanceHistory;
    const executionTimes = executions.map(e => e.executionTime);
    const successCount = executions.filter(e => e.success).length;

    // コマンド別統計
    const commandBreakdown = {};
    executions.forEach(execution => {
      if (!commandBreakdown[execution.commandName]) {
        commandBreakdown[execution.commandName] = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          successCount: 0
        };
      }

      const cmd = commandBreakdown[execution.commandName];
      cmd.count++;
      cmd.totalTime += execution.executionTime;
      cmd.avgTime = cmd.totalTime / cmd.count;
      if (execution.success) cmd.successCount++;
    });

    return {
      totalExecutions: executions.length,
      averageExecutionTime: Math.round(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length),
      fastestExecution: Math.min(...executionTimes),
      slowestExecution: Math.max(...executionTimes),
      successRate: (successCount / executions.length * 100).toFixed(2),
      commandBreakdown,
      recentWarnings: executions
        .slice(0, 10)
        .flatMap(e => e.warning || [])
        .filter(w => w.severity === 'high' || w.type === 'memory')
    };
  }

  /**
   * Get optimization recommendations
   * @returns {Array} Array of optimization recommendations
   */
  getOptimizationRecommendations() {
    const stats = this.getStatistics();
    const recommendations = [];

    if (stats.averageExecutionTime > this.thresholds.lightCommand) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        recommendation: 'Consider implementing command result caching to reduce average execution time',
        currentValue: `${stats.averageExecutionTime}ms`,
        targetValue: `<${this.thresholds.lightCommand}ms`
      });
    }

    // 失敗率が高い場合
    if (parseFloat(stats.successRate) < 95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        recommendation: 'Improve error handling and retry mechanisms',
        currentValue: `${stats.successRate}% success rate`,
        targetValue: '>95% success rate'
      });
    }

    // メモリ使用量の警告が多い場合
    const memoryWarnings = stats.recentWarnings.filter(w => w.type === 'memory');
    if (memoryWarnings.length > 3) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        recommendation: 'Implement memory usage optimization and garbage collection',
        currentValue: `${memoryWarnings.length} recent memory warnings`,
        targetValue: '<2 memory warnings per 10 executions'
      });
    }

    return recommendations;
  }

  /**
   * Check if command execution is within performance thresholds
   * @param {string} commandName - Command name
   * @param {number} executionTime - Execution time in ms
   * @returns {boolean} True if within thresholds
   */
  isWithinThresholds(commandName, executionTime) {
    // 軽量コマンドの判定（researchやexplainは通常軽量）
    const isLightCommand = ['research', 'explain', 'help'].includes(commandName);
    const threshold = isLightCommand ? this.thresholds.lightCommand : this.thresholds.heavyCommand;

    return executionTime <= threshold;
  }

  /**
   * Clear performance history
   */
  clearHistory() {
    this.performanceHistory = [];
  }
}