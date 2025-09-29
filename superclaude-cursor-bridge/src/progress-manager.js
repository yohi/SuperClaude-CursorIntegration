/**
 * Progress Manager for Long-Running Commands
 * Handles progress tracking, status updates, and cancellation
 */

import { EventEmitter } from 'events';

export default class ProgressManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.activeCommands = new Map();
    this.updateInterval = options.updateInterval || 1000; // 1秒間隔
    this.maxSteps = options.maxSteps || 100;
  }

  /**
   * Create and start tracking progress for a command
   * @param {string} commandId - Unique command identifier
   * @param {string} commandName - Command name
   * @param {number} estimatedSteps - Estimated number of steps
   * @returns {string} Progress ID
   */
  createProgress(commandId, commandName, estimatedSteps = 10) {
    // 数値サニタイゼーションと境界値チェック
    const sanitizedSteps = Number(estimatedSteps);
    const totalSteps = Number.isFinite(sanitizedSteps) ? Math.max(1, sanitizedSteps) : 10;

    const context = {
      id: commandId,
      commandName,
      startTime: Date.now(),
      currentStep: 0,
      totalSteps,
      status: 'initializing',
      message: 'Starting command execution...',
      abortController: new AbortController(),
      cancelled: false,
      estimatedTimeRemaining: null
    };

    this.activeCommands.set(commandId, context);

    // 進行状況の定期更新を開始
    this._startProgressUpdates(commandId);

    this.emit('progress', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      progress: 0,
      status: context.status,
      message: context.message
    });

    return commandId;
  }

  /**
   * Start tracking progress for a command (legacy method)
   * @param {string} commandId - Unique command identifier
   * @param {string} commandName - Command name
   * @param {Object} options - Progress options
   * @returns {Object} Progress context
   */
  startProgress(commandId, commandName, options = {}) {
    const context = {
      id: commandId,
      commandName,
      startTime: Date.now(),
      currentStep: 0,
      totalSteps: Math.max(1, options.totalSteps || this.maxSteps),
      status: 'initializing',
      message: 'Starting command execution...',
      abortController: new AbortController(),
      cancelled: false,
      estimatedTimeRemaining: null
    };

    this.activeCommands.set(commandId, context);

    // 進行状況の定期更新を開始
    this._startProgressUpdates(commandId);

    this.emit('progress', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      progress: 0,
      status: context.status,
      message: context.message
    });

    return context;
  }

  /**
   * Update progress for a command
   * @param {string} commandId - Command identifier
   * @param {number|Object} percentageOrUpdate - Progress percentage or update object
   * @param {string} message - Progress message (optional)
   */
  updateProgress(commandId, percentageOrUpdate = {}, message = null) {
    const context = this.activeCommands.get(commandId);
    if (!context || context.cancelled) {
      return;
    }

    let update = {};

    // Handle different parameter formats
    if (typeof percentageOrUpdate === 'number') {
      // updateProgress(id, percentage, message) format
      const percentage = Math.max(0, Math.min(100, percentageOrUpdate));
      update.step = Math.round((percentage / 100) * context.totalSteps);
      if (message) {
        update.message = message;
      }
    } else {
      // updateProgress(id, updateObject) format
      update = percentageOrUpdate;
    }

    // Update context
    if (update.step !== undefined) {
      context.currentStep = Math.min(update.step, context.totalSteps);
    }
    if (update.status) {
      context.status = update.status;
    }
    if (update.message) {
      context.message = update.message;
    }

    // Calculate progress percentage
    const progressPercent = Math.round((context.currentStep / context.totalSteps) * 100);

    // Estimate time remaining
    if (context.currentStep > 0) {
      const elapsed = Date.now() - context.startTime;
      const avgTimePerStep = elapsed / context.currentStep;
      const remainingSteps = context.totalSteps - context.currentStep;
      context.estimatedTimeRemaining = Math.round(avgTimePerStep * remainingSteps);
    }

    this.emit('progress', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      progress: progressPercent,
      status: context.status,
      message: context.message,
      estimatedTimeRemaining: context.estimatedTimeRemaining,
      step: context.currentStep,
      totalSteps: context.totalSteps
    });
  }

  /**
   * Complete progress tracking for a command
   * @param {string} commandId - Command identifier
   * @param {Object} result - Final result
   */
  completeProgress(commandId, result = {}) {
    const context = this.activeCommands.get(commandId);
    if (!context) {
      return;
    }

    context.currentStep = context.totalSteps;
    context.status = result.success !== false ? 'completed' : 'failed';
    context.message = result.message || 'Command execution finished';

    this.emit('progress', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      progress: 100,
      status: context.status,
      message: context.message,
      executionTime: Date.now() - context.startTime
    });

    // 失敗時の専用イベント（ドキュメント整合性のため）
    if (context.status === 'failed') {
      this.emit('failed', {
        id: commandId,
        commandId: commandId,
        commandName: context.commandName,
        error: result.error || result.message || context.message,
        executionTime: Date.now() - context.startTime
      });
    }

    this.emit('complete', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      success: result.success !== false,
      executionTime: Date.now() - context.startTime,
      result
    });

    this._stopProgressUpdates(commandId);
    this.activeCommands.delete(commandId);
  }

  /**
   * Mark progress as failed
   * @param {string} commandId - Command identifier
   * @param {string} errorMessage - Error message
   */
  failProgress(commandId, errorMessage = 'Command execution failed') {
    const context = this.activeCommands.get(commandId);
    if (!context) {
      return;
    }

    context.status = 'failed';
    context.message = errorMessage;

    this.emit('progress', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      progress: Math.round((context.currentStep / context.totalSteps) * 100),
      status: 'failed',
      message: errorMessage,
      executionTime: Date.now() - context.startTime
    });

    // 明示的なfailedイベント
    this.emit('failed', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      error: errorMessage,
      executionTime: Date.now() - context.startTime
    });

    this.emit('complete', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      success: false,
      executionTime: Date.now() - context.startTime,
      error: errorMessage
    });

    this._stopProgressUpdates(commandId);
    this.activeCommands.delete(commandId);
  }

  /**
   * Cancel a command execution
   * @param {string} commandId - Command identifier
   * @param {string} reason - Cancellation reason
   */
  cancelCommand(commandId, reason = 'User cancelled') {
    const context = this.activeCommands.get(commandId);
    if (!context || context.cancelled) {
      return false;
    }

    context.cancelled = true;
    context.status = 'cancelled';
    context.message = reason;

    // Trigger abort signal
    context.abortController.abort();

    this.emit('progress', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      progress: Math.round((context.currentStep / context.totalSteps) * 100),
      status: 'cancelled',
      message: reason
    });

    this.emit('cancelled', {
      id: commandId,
      commandId: commandId,
      commandName: context.commandName,
      reason,
      executionTime: Date.now() - context.startTime
    });

    this._stopProgressUpdates(commandId);
    this.activeCommands.delete(commandId);

    return true;
  }

  /**
   * Get abort signal for a command
   * @param {string} commandId - Command identifier
   * @returns {AbortSignal|null} Abort signal or null
   */
  getAbortSignal(commandId) {
    const context = this.activeCommands.get(commandId);
    return context ? context.abortController.signal : null;
  }

  /**
   * Check if command is cancelled
   * @param {string} commandId - Command identifier
   * @returns {boolean} True if cancelled
   */
  isCancelled(commandId) {
    const context = this.activeCommands.get(commandId);
    return context ? context.cancelled : false;
  }

  /**
   * Get active commands list
   * @returns {Array} List of active commands
   */
  getActiveCommands() {
    return Array.from(this.activeCommands.values()).map(context => ({
      id: context.id,
      commandName: context.commandName,
      status: context.status,
      progress: Math.round((context.currentStep / context.totalSteps) * 100),
      message: context.message,
      startTime: context.startTime,
      estimatedTimeRemaining: context.estimatedTimeRemaining
    }));
  }

  /**
   * Start periodic progress updates
   * @private
   * @param {string} commandId - Command identifier
   */
  _startProgressUpdates(commandId) {
    const intervalId = setInterval(() => {
      const context = this.activeCommands.get(commandId);
      if (!context || context.cancelled) {
        clearInterval(intervalId);
        return;
      }

      // Emit heartbeat for long-running commands
      const terminal = new Set(['completed', 'failed', 'cancelled']);
      if (!terminal.has(context.status) && Date.now() - context.startTime > 5000) {
        this.emit('heartbeat', {
          id: commandId,
          commandName: context.commandName,
          runningTime: Date.now() - context.startTime
        });
      }
    }, this.updateInterval);

    // Store interval ID for cleanup
    const context = this.activeCommands.get(commandId);
    if (context) {
      context.intervalId = intervalId;
    }
  }

  /**
   * Stop progress updates
   * @private
   * @param {string} commandId - Command identifier
   */
  _stopProgressUpdates(commandId) {
    const context = this.activeCommands.get(commandId);
    if (context && context.intervalId) {
      clearInterval(context.intervalId);
      delete context.intervalId;
    }
  }

  /**
   * Cleanup all active commands
   */
  cleanup() {
    for (const [commandId] of this.activeCommands) {
      this.cancelCommand(commandId, 'System cleanup');
    }
    this.activeCommands.clear();
  }
}
