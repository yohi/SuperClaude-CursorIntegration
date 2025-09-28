/**
 * OptimizedCommandBridge Unit Tests
 * TDD implementation following Kent Beck's methodology
 */

import OptimizedCommandBridge from '../src/optimized-command-bridge.js';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('../src/command-bridge.js');
jest.mock('../src/performance-monitor.js');
jest.mock('../src/progress-manager.js');
jest.mock('../src/result-cache.js');
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `test-uuid-${++uuidCounter}`)
}));

describe('OptimizedCommandBridge', () => {
  let bridge;
  let mockCommandBridge;
  let mockPerformanceMonitor;
  let mockProgressManager;
  let mockResultCache;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mocks with realistic behavior
    mockPerformanceMonitor = {
      startMeasurement: jest.fn(() => ({ id: 'perf-context-1' })),
      endMeasurement: jest.fn(() => ({
        executionTime: 1500,
        warnings: []
      })),
      getStatistics: jest.fn(() => ({ totalCommands: 5 })),
      getOptimizationRecommendations: jest.fn(() => [])
    };

    mockProgressManager = {
      startProgress: jest.fn(() => ({
        cancelled: false,
        abortController: new AbortController()
      })),
      updateProgress: jest.fn(),
      completeProgress: jest.fn(),
      cancelCommand: jest.fn(() => true),
      getActiveCommands: jest.fn(() => []),
      cleanup: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    };

    mockResultCache = {
      get: jest.fn(() => null),
      set: jest.fn(),
      invalidate: jest.fn(),
      clear: jest.fn(),
      cleanup: jest.fn(),
      getStats: jest.fn(() => ({ hits: 10, misses: 20 }))
    };

    mockCommandBridge = {
      validateParameters: jest.fn(),
      translateCommand: jest.fn(() => ({ command: '/sc:research' })),
      normalizeParameters: jest.fn(() => ['test query']),
      recordExecution: jest.fn(),
      cleanup: jest.fn()
    };

    // Mock the imported classes
    const CommandBridge = require('../src/command-bridge.js').default;
    const PerformanceMonitor = require('../src/performance-monitor.js').default;
    const ProgressManager = require('../src/progress-manager.js').default;
    const ResultCache = require('../src/result-cache.js').default;

    CommandBridge.mockImplementation(() => mockCommandBridge);
    PerformanceMonitor.mockImplementation(() => mockPerformanceMonitor);
    ProgressManager.mockImplementation(() => mockProgressManager);
    ResultCache.mockImplementation(() => mockResultCache);

    // Make ProgressManager extend EventEmitter for event handling
    Object.setPrototypeOf(mockProgressManager, EventEmitter.prototype);
    EventEmitter.call(mockProgressManager);

    bridge = new OptimizedCommandBridge({
      performance: { enabled: true },
      progress: { enabled: true },
      cache: { enabled: true }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with performance monitoring', () => {
      expect(bridge.performanceMonitor).toBeDefined();
      expect(bridge.progressManager).toBeDefined();
      expect(bridge.resultCache).toBeDefined();
    });

    it('should setup progress event listeners', () => {
      expect(mockProgressManager.on).toHaveBeenCalledWith('progress', expect.any(Function));
      expect(mockProgressManager.on).toHaveBeenCalledWith('complete', expect.any(Function));
      expect(mockProgressManager.on).toHaveBeenCalledWith('cancelled', expect.any(Function));
    });
  });

  describe('executeCommand', () => {
    beforeEach(() => {
      // Setup default successful execution
      bridge._executeOptimizedCommand = jest.fn().mockResolvedValue({
        success: true,
        command: '/sc:research',
        output: 'Mock result',
        timestamp: new Date().toISOString(),
        executionTime: 1500
      });
    });

    it('should execute command with full optimization flow', async () => {
      const result = await bridge.executeCommand('research', ['test query']);

      expect(result).toEqual({
        success: true,
        command: '/sc:research',
        output: 'Mock result',
        timestamp: expect.any(String),
        executionTime: 1500,
        _metrics: {
          executionTime: 1500,
          commandId: 'test-uuid-1234',
          cached: false,
          warnings: []
        }
      });

      expect(mockPerformanceMonitor.startMeasurement).toHaveBeenCalledWith('research');
      expect(mockProgressManager.startProgress).toHaveBeenCalledWith(
        'test-uuid-1234',
        'research',
        { totalSteps: 100 }
      );
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        success: true,
        output: 'Cached result',
        _metrics: { cached: true }
      };

      mockResultCache.get.mockReturnValue(cachedResult);

      const result = await bridge.executeCommand('research', ['test query']);

      expect(result._metrics.cached).toBe(true);
      expect(result._metrics.executionTime).toBe(0);
      expect(bridge._executeOptimizedCommand).not.toHaveBeenCalled();
    });

    it('should skip cache when skipCache option is true', async () => {
      mockResultCache.get.mockReturnValue({ success: true, output: 'Cached' });

      await bridge.executeCommand('research', ['test query'], { skipCache: true });

      expect(bridge._executeOptimizedCommand).toHaveBeenCalled();
    });

    it('should handle command cancellation', async () => {
      const progressContext = {
        cancelled: true,
        abortController: new AbortController()
      };
      mockProgressManager.startProgress.mockReturnValue(progressContext);

      await expect(bridge.executeCommand('research', ['test query']))
        .rejects.toThrow('Command was cancelled before execution');
    });

    it('should integrate external AbortSignal', async () => {
      const externalController = new AbortController();
      externalController.abort();

      await expect(bridge.executeCommand('research', ['test query'], {
        signal: externalController.signal
      })).rejects.toThrow();
    });

    it('should cache successful results', async () => {
      await bridge.executeCommand('research', ['test query']);

      expect(mockResultCache.set).toHaveBeenCalledWith(
        'research',
        ['test query'],
        expect.objectContaining({
          success: true,
          _metrics: expect.any(Object)
        })
      );
    });

    it('should not cache failed results', async () => {
      bridge._executeOptimizedCommand.mockRejectedValue(new Error('Execution failed'));

      await expect(bridge.executeCommand('research', ['test query']))
        .rejects.toThrow('Execution failed');

      expect(mockResultCache.set).not.toHaveBeenCalled();
    });

    it('should update progress through execution lifecycle', async () => {
      await bridge.executeCommand('research', ['test query']);

      expect(mockProgressManager.updateProgress).toHaveBeenCalledWith('test-uuid-1234', {
        step: 10,
        status: 'validating',
        message: 'Validating command parameters...'
      });

      expect(mockProgressManager.updateProgress).toHaveBeenCalledWith('test-uuid-1234', {
        step: 20,
        status: 'preparing',
        message: 'Preparing SuperClaude command...'
      });

      expect(mockProgressManager.completeProgress).toHaveBeenCalledWith(
        'test-uuid-1234',
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('_executeOptimizedCommand', () => {
    it('should simulate optimized execution with progress updates', async () => {
      jest.useFakeTimers();

      const resultPromise = bridge._executeOptimizedCommand(
        '/sc:research',
        ['test query'],
        { signal: new AbortController().signal },
        'test-id'
      );

      // Fast-forward through initial delay
      jest.advanceTimersByTime(100);

      // Fast-forward through progress updates
      jest.advanceTimersByTime(3000);

      const result = await resultPromise;

      expect(result).toEqual({
        success: true,
        command: '/sc:research',
        args: ['test query'],
        output: 'Optimized mock execution result for /sc:research',
        timestamp: expect.any(String),
        executionTime: expect.any(Number)
      });

      jest.useRealTimers();
    });

    it('should handle abort signal during execution', async () => {
      jest.useFakeTimers();
      const abortController = new AbortController();

      const resultPromise = bridge._executeOptimizedCommand(
        '/sc:research',
        ['test query'],
        { signal: abortController.signal },
        'test-id'
      );

      // タイマーを進めてabortを発生させる
      jest.advanceTimersByTime(50);
      abortController.abort();

      await expect(resultPromise).rejects.toThrow('Command execution was aborted');
      jest.useRealTimers();
    });
  });

  describe('Step Estimation', () => {
    it('should estimate steps for known commands', () => {
      expect(bridge._estimateSteps('research')).toBe(100);
      expect(bridge._estimateSteps('analyze')).toBe(80);
      expect(bridge._estimateSteps('review')).toBe(120);
      expect(bridge._estimateSteps('explain')).toBe(60);
    });

    it('should provide default estimate for unknown commands', () => {
      expect(bridge._estimateSteps('unknown')).toBe(100);
    });
  });

  describe('Execution Time Estimation', () => {
    it('should estimate execution time for known commands', () => {
      expect(bridge._getEstimatedExecutionTime('/sc:research')).toBe(2500);
      expect(bridge._getEstimatedExecutionTime('/sc:analyze')).toBe(2000);
      expect(bridge._getEstimatedExecutionTime('/sc:review')).toBe(3000);
      expect(bridge._getEstimatedExecutionTime('/sc:explain')).toBe(1500);
    });

    it('should provide default time for unknown commands', () => {
      expect(bridge._getEstimatedExecutionTime('/sc:unknown')).toBe(2000);
    });
  });

  describe('Command Management', () => {
    it('should cancel command through progress manager', () => {
      const result = bridge.cancelCommand('test-id', 'User request');

      expect(result).toBe(true);
      expect(mockProgressManager.cancelCommand).toHaveBeenCalledWith('test-id', 'User request');
    });

    it('should get active commands', () => {
      const commands = bridge.getActiveCommands();

      expect(commands).toEqual([]);
      expect(mockProgressManager.getActiveCommands).toHaveBeenCalled();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should get performance statistics', () => {
      const stats = bridge.getPerformanceStats();

      expect(stats).toEqual({ totalCommands: 5 });
      expect(mockPerformanceMonitor.getStatistics).toHaveBeenCalled();
    });

    it('should get cache statistics', () => {
      const stats = bridge.getCacheStats();

      expect(stats).toEqual({ hits: 10, misses: 20 });
      expect(mockResultCache.getStats).toHaveBeenCalled();
    });

    it('should get optimization recommendations', () => {
      const recommendations = bridge.getOptimizationRecommendations();

      expect(recommendations).toEqual([]);
      expect(mockPerformanceMonitor.getOptimizationRecommendations).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    it('should clear specific command cache', () => {
      bridge.clearCache('research');

      expect(mockResultCache.invalidate).toHaveBeenCalledWith('research');
    });

    it('should clear all cache when no command specified', () => {
      bridge.clearCache();

      expect(mockResultCache.clear).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all components', () => {
      bridge.cleanup();

      expect(mockCommandBridge.cleanup).toHaveBeenCalled();
      expect(mockProgressManager.cleanup).toHaveBeenCalled();
      expect(mockResultCache.cleanup).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      mockCommandBridge.validateParameters.mockImplementation(() => {
        throw new Error('Invalid parameters');
      });

      await expect(bridge.executeCommand('research', ['invalid']))
        .rejects.toThrow('Invalid parameters');

      expect(mockProgressManager.completeProgress).toHaveBeenCalledWith(
        'test-uuid-1234',
        expect.objectContaining({
          success: false,
          message: 'Invalid parameters'
        })
      );
    });

    it('should handle execution errors with metrics', async () => {
      bridge._executeOptimizedCommand.mockRejectedValue(new Error('Execution failed'));

      await expect(bridge.executeCommand('research', ['test query']))
        .rejects.toThrow('Execution failed');

      expect(mockPerformanceMonitor.endMeasurement).toHaveBeenCalledWith(
        { id: 'perf-context-1' },
        { success: false }
      );
    });

    it('should handle cancellation errors with specific message', async () => {
      const progressContext = {
        cancelled: true,
        abortController: new AbortController()
      };
      mockProgressManager.startProgress.mockReturnValue(progressContext);

      await expect(bridge.executeCommand('research', ['test query']))
        .rejects.toThrow("Command 'research' was cancelled");
    });
  });
});