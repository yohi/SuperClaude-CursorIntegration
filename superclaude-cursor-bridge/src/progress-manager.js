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
   * Start tracking progress for a command
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
      totalSteps: options.totalSteps || this.maxSteps,
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
      progress: 0,
      status: context.status,
      message: context.message
    });

    return context;
  }

  /**
   * Update progress for a command
   * @param {string} commandId - Command identifier
   * @param {Object} update - Progress update
   */
  updateProgress(commandId, update = {}) {
    const context = this.activeCommands.get(commandId);
    if (!context || context.cancelled) {
      return;
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
      commandName: context.commandName,
      progress: 100,
      status: context.status,
      message: context.message,
      executionTime: Date.now() - context.startTime
    });

    this.emit('complete', {
      id: commandId,
      commandName: context.commandName,
      success: result.success !== false,
      executionTime: Date.now() - context.startTime,
      result
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
      commandName: context.commandName,
      progress: context.currentStep / context.totalSteps * 100,
      status: 'cancelled',
      message: reason
    });

    this.emit('cancelled', {
      id: commandId,
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
      if (context.status === 'running' && Date.now() - context.startTime > 5000) {
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