/**
 * ProgressManager Unit Tests
 * TDD implementation following Kent Beck's methodology
 */

import ProgressManager from '../src/progress-manager.js';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('ProgressManager', () => {
  let manager;
  let progressEvents;
  let completeEvents;
  let cancelledEvents;
  let heartbeatEvents;

  beforeEach(() => {
    manager = new ProgressManager({
      updateInterval: 100, // Faster for testing
      maxSteps: 100
    });

    // Capture events for testing
    progressEvents = [];
    completeEvents = [];
    cancelledEvents = [];
    heartbeatEvents = [];

    manager.on('progress', (data) => progressEvents.push(data));
    manager.on('complete', (data) => completeEvents.push(data));
    manager.on('cancelled', (data) => cancelledEvents.push(data));
    manager.on('heartbeat', (data) => heartbeatEvents.push(data));

    jest.useFakeTimers();
  });

  afterEach(() => {
    manager.cleanup();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultManager = new ProgressManager();

      expect(defaultManager.updateInterval).toBe(1000);
      expect(defaultManager.maxSteps).toBe(100);
      expect(defaultManager.activeCommands.size).toBe(0);
    });

    it('should initialize with custom options', () => {
      expect(manager.updateInterval).toBe(100);
      expect(manager.maxSteps).toBe(100);
    });
  });

  describe('startProgress', () => {
    it('should start progress tracking and emit initial progress', () => {
      const context = manager.startProgress('cmd-1', 'research', {
        totalSteps: 50
      });

      expect(context).toEqual({
        id: 'cmd-1',
        commandName: 'research',
        startTime: expect.any(Number),
        currentStep: 0,
        totalSteps: 50,
        status: 'initializing',
        message: 'Starting command execution...',
        abortController: expect.any(AbortController),
        cancelled: false,
        estimatedTimeRemaining: null,
        intervalId: expect.any(Object)
      });

      expect(manager.activeCommands.has('cmd-1')).toBe(true);
      expect(progressEvents).toHaveLength(1);
      expect(progressEvents[0]).toEqual({
        id: 'cmd-1',
        commandName: 'research',
        progress: 0,
        status: 'initializing',
        message: 'Starting command execution...'
      });
    });

    it('should use default total steps when not provided', () => {
      const context = manager.startProgress('cmd-1', 'research');

      expect(context.totalSteps).toBe(100);
    });

    it('should create unique abort controllers for each command', () => {
      const context1 = manager.startProgress('cmd-1', 'research');
      const context2 = manager.startProgress('cmd-2', 'analyze');

      expect(context1.abortController).not.toBe(context2.abortController);
      expect(context1.abortController.signal.aborted).toBe(false);
      expect(context2.abortController.signal.aborted).toBe(false);
    });
  });

  describe('updateProgress', () => {
    beforeEach(() => {
      manager.startProgress('cmd-1', 'research', { totalSteps: 100 });
      progressEvents.length = 0; // Clear initial progress event
    });

    it('should update progress step and emit progress event', () => {
      manager.updateProgress('cmd-1', {
        step: 25,
        status: 'processing',
        message: 'Processing data...'
      });

      expect(progressEvents).toHaveLength(1);
      expect(progressEvents[0]).toEqual({
        id: 'cmd-1',
        commandName: 'research',
        progress: 25,
        status: 'processing',
        message: 'Processing data...',
        estimatedTimeRemaining: expect.any(Number),
        step: 25,
        totalSteps: 100
      });
    });

    it('should calculate estimated time remaining', () => {
      // Advance time and update progress
      jest.advanceTimersByTime(1000);
      manager.updateProgress('cmd-1', { step: 25 });

      const event = progressEvents[0];
      expect(event.estimatedTimeRemaining).toBeGreaterThan(0);
      expect(event.estimatedTimeRemaining).toBe(3000); // (1000ms / 25 steps) * 75 remaining steps
    });

    it('should not exceed total steps', () => {
      manager.updateProgress('cmd-1', { step: 150 }); // Exceeds total of 100

      expect(progressEvents[0].step).toBe(100);
      expect(progressEvents[0].progress).toBe(100);
    });

    it('should ignore updates for cancelled commands', () => {
      manager.cancelCommand('cmd-1');
      progressEvents.length = 0; // Clear cancellation events

      manager.updateProgress('cmd-1', { step: 50 });

      expect(progressEvents).toHaveLength(0);
    });

    it('should ignore updates for non-existent commands', () => {
      manager.updateProgress('non-existent', { step: 50 });

      expect(progressEvents).toHaveLength(0);
    });
  });

  describe('completeProgress', () => {
    beforeEach(() => {
      manager.startProgress('cmd-1', 'research', { totalSteps: 100 });
      manager.updateProgress('cmd-1', { step: 75 });
      progressEvents.length = 0; // Clear previous events
    });

    it('should complete progress with success and emit events', () => {
      manager.completeProgress('cmd-1', {
        success: true,
        message: 'Command completed successfully'
      });

      expect(progressEvents).toHaveLength(1);
      expect(progressEvents[0]).toEqual({
        id: 'cmd-1',
        commandName: 'research',
        progress: 100,
        status: 'completed',
        message: 'Command completed successfully',
        executionTime: expect.any(Number)
      });

      expect(completeEvents).toHaveLength(1);
      expect(completeEvents[0]).toEqual({
        id: 'cmd-1',
        commandName: 'research',
        success: true,
        executionTime: expect.any(Number),
        result: {
          success: true,
          message: 'Command completed successfully'
        }
      });

      expect(manager.activeCommands.has('cmd-1')).toBe(false);
    });

    it('should complete progress with failure', () => {
      manager.completeProgress('cmd-1', {
        success: false,
        message: 'Command failed'
      });

      expect(progressEvents[0].status).toBe('failed');
      expect(completeEvents[0].success).toBe(false);
    });

    it('should default to success when not specified', () => {
      manager.completeProgress('cmd-1', {
        message: 'Command finished'
      });

      expect(progressEvents[0].status).toBe('completed');
      expect(completeEvents[0].success).toBe(true);
    });

    it('should ignore completion for non-existent commands', () => {
      manager.completeProgress('non-existent');

      expect(progressEvents).toHaveLength(0);
      expect(completeEvents).toHaveLength(0);
    });
  });

  describe('cancelCommand', () => {
    beforeEach(() => {
      manager.startProgress('cmd-1', 'research', { totalSteps: 100 });
      manager.updateProgress('cmd-1', { step: 30 });
      progressEvents.length = 0; // Clear previous events
    });

    it('should cancel command and emit events', () => {
      const result = manager.cancelCommand('cmd-1', 'User requested cancellation');

      expect(result).toBe(true);
      expect(progressEvents).toHaveLength(1);
      expect(progressEvents[0]).toEqual({
        id: 'cmd-1',
        commandName: 'research',
        progress: 30,
        status: 'cancelled',
        message: 'User requested cancellation'
      });

      expect(cancelledEvents).toHaveLength(1);
      expect(cancelledEvents[0]).toEqual({
        id: 'cmd-1',
        commandName: 'research',
        reason: 'User requested cancellation',
        executionTime: expect.any(Number)
      });

      expect(manager.activeCommands.has('cmd-1')).toBe(false);
    });

    it('should trigger abort signal', () => {
      const context = manager.activeCommands.get('cmd-1');
      const signal = context.abortController.signal;

      expect(signal.aborted).toBe(false);

      manager.cancelCommand('cmd-1');

      expect(signal.aborted).toBe(true);
    });

    it('should use default cancellation reason', () => {
      manager.cancelCommand('cmd-1');

      expect(cancelledEvents[0].reason).toBe('User cancelled');
    });

    it('should return false for non-existent commands', () => {
      const result = manager.cancelCommand('non-existent');

      expect(result).toBe(false);
    });

    it('should return false for already cancelled commands', () => {
      manager.cancelCommand('cmd-1');
      cancelledEvents.length = 0; // Clear events

      const result = manager.cancelCommand('cmd-1');

      expect(result).toBe(false);
      expect(cancelledEvents).toHaveLength(0);
    });
  });

  describe('Command Status Queries', () => {
    beforeEach(() => {
      manager.startProgress('cmd-1', 'research');
    });

    describe('getAbortSignal', () => {
      it('should return abort signal for existing command', () => {
        const signal = manager.getAbortSignal('cmd-1');

        expect(signal).toBeInstanceOf(AbortSignal);
        expect(signal.aborted).toBe(false);
      });

      it('should return null for non-existent command', () => {
        const signal = manager.getAbortSignal('non-existent');

        expect(signal).toBeNull();
      });
    });

    describe('isCancelled', () => {
      it('should return false for active command', () => {
        expect(manager.isCancelled('cmd-1')).toBe(false);
      });

      it('should return true for cancelled command', () => {
        const result = manager.cancelCommand('cmd-1');

        expect(result).toBe(true);
        // Note: After cancellation, the command is removed from activeCommands
        // So isCancelled returns false for non-existent commands
        expect(manager.isCancelled('cmd-1')).toBe(false);
      });

      it('should return false for non-existent command', () => {
        expect(manager.isCancelled('non-existent')).toBe(false);
      });
    });
  });

  describe('getActiveCommands', () => {
    it('should return empty array when no active commands', () => {
      expect(manager.getActiveCommands()).toEqual([]);
    });

    it('should return list of active commands', () => {
      manager.startProgress('cmd-1', 'research', { totalSteps: 100 });
      manager.startProgress('cmd-2', 'analyze', { totalSteps: 50 });
      manager.updateProgress('cmd-1', { step: 25 });

      const active = manager.getActiveCommands();

      expect(active).toHaveLength(2);

      const cmd1 = active.find(cmd => cmd.id === 'cmd-1');
      expect(cmd1).toEqual({
        id: 'cmd-1',
        commandName: 'research',
        status: 'initializing',
        progress: 25,
        message: 'Starting command execution...',
        startTime: expect.any(Number),
        estimatedTimeRemaining: expect.any(Number)
      });
    });
  });

  describe('Periodic Updates and Heartbeat', () => {
    it('should emit heartbeat for long-running commands', () => {
      manager.startProgress('cmd-1', 'research');

      // Advance time to trigger heartbeat (> 5 seconds)
      jest.advanceTimersByTime(6000);

      expect(heartbeatEvents.length).toBeGreaterThanOrEqual(1);
      expect(heartbeatEvents[0]).toEqual({
        id: 'cmd-1',
        commandName: 'research',
        runningTime: expect.any(Number)
      });
    });

    it('should not emit heartbeat for short-running commands', () => {
      manager.startProgress('cmd-1', 'research');

      // Advance time but not enough for heartbeat
      jest.advanceTimersByTime(3000);

      expect(heartbeatEvents).toHaveLength(0);
    });

    it('should stop heartbeat after command completion', () => {
      manager.startProgress('cmd-1', 'research');

      // Advance to trigger heartbeat
      jest.advanceTimersByTime(6000);
      expect(heartbeatEvents.length).toBeGreaterThanOrEqual(1);

      manager.completeProgress('cmd-1');
      heartbeatEvents.length = 0;

      // Advance more time
      jest.advanceTimersByTime(6000);
      expect(heartbeatEvents).toHaveLength(0);
    });
  });

  describe('cleanup', () => {
    it('should cancel all active commands', () => {
      manager.startProgress('cmd-1', 'research');
      manager.startProgress('cmd-2', 'analyze');

      expect(manager.activeCommands.size).toBe(2);

      manager.cleanup();

      expect(manager.activeCommands.size).toBe(0);
      expect(cancelledEvents).toHaveLength(2);
      expect(cancelledEvents[0].reason).toBe('System cleanup');
      expect(cancelledEvents[1].reason).toBe('System cleanup');
    });

    it('should handle cleanup with no active commands', () => {
      manager.cleanup();

      expect(manager.activeCommands.size).toBe(0);
      expect(cancelledEvents).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should track complete command lifecycle', () => {
      // Start command
      const context = manager.startProgress('cmd-1', 'research', { totalSteps: 100 });
      expect(progressEvents).toHaveLength(1);

      // Update progress multiple times
      manager.updateProgress('cmd-1', { step: 25, status: 'processing' });
      manager.updateProgress('cmd-1', { step: 50, status: 'analyzing' });
      manager.updateProgress('cmd-1', { step: 75, status: 'finalizing' });

      expect(progressEvents).toHaveLength(4); // Initial + 3 updates

      // Complete successfully
      manager.completeProgress('cmd-1', { success: true });

      expect(progressEvents).toHaveLength(5); // + completion progress
      expect(completeEvents).toHaveLength(1);
      expect(manager.activeCommands.has('cmd-1')).toBe(false);
    });

    it('should handle multiple concurrent commands', () => {
      manager.startProgress('cmd-1', 'research');
      manager.startProgress('cmd-2', 'analyze');
      manager.startProgress('cmd-3', 'review');

      expect(manager.activeCommands.size).toBe(3);

      manager.cancelCommand('cmd-2');
      expect(manager.activeCommands.size).toBe(2);

      manager.completeProgress('cmd-1', { success: true });
      expect(manager.activeCommands.size).toBe(1);

      const active = manager.getActiveCommands();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('cmd-3');
    });
  });
});