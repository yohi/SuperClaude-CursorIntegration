/**
 * OptimizedCommandBridge Unit Tests
 * TDD implementation following Kent Beck's methodology
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock dependencies first before importing OptimizedCommandBridge
jest.unstable_mockModule('../src/command-bridge.js', () => ({
  default: jest.fn()
}));

jest.unstable_mockModule('../src/performance-monitor.js', () => ({
  default: jest.fn()
}));

jest.unstable_mockModule('../src/progress-manager.js', () => ({
  default: jest.fn()
}));

jest.unstable_mockModule('../src/result-cache.js', () => ({
  default: jest.fn()
}));

// Mock crypto module
jest.unstable_mockModule('crypto', () => ({
  randomUUID: jest.fn(() => `test-uuid-${++uuidCounter}`)
}));

// Import the class under test after setting up mocks
const { default: OptimizedCommandBridge } = await import('../src/optimized-command-bridge.js');
const { default: CommandBridge } = await import('../src/command-bridge.js');
const { default: PerformanceMonitor } = await import('../src/performance-monitor.js');
const { default: ProgressManager } = await import('../src/progress-manager.js');
const { default: ResultCache } = await import('../src/result-cache.js');

let uuidCounter = 0;

describe('OptimizedCommandBridge', () => {
  let bridge;
  let mockCommandBridge;
  let mockPerformanceMonitor;
  let mockProgressManager;
  let mockResultCache;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mocks with realistic behavior
    mockPerformanceMonitor = {
      startMeasurement: jest.fn(() => ({ id: 'perf-context-1' })),
      endMeasurement: jest.fn(),
      getStatistics: jest.fn(() => ({
        totalCommands: 5,
        averageExecutionTime: 1200,
        fastestCommand: 'explain',
        slowestCommand: 'research'
      })),
      getRecommendations: jest.fn(() => [
        { type: 'cache', message: 'Enable caching for better performance' }
      ]),
      cleanup: jest.fn()
    };

    mockProgressManager = {
      createProgress: jest.fn(() => 'progress-id-1'),
      updateProgress: jest.fn(),
      completeProgress: jest.fn(),
      failProgress: jest.fn(),
      cancelCommand: jest.fn(),
      getActiveCommands: jest.fn(() => []),
      cleanup: jest.fn()
    };

    mockResultCache = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(() => false),
      clear: jest.fn(),
      getStats: jest.fn(() => ({
        totalEntries: 3,
        hitRate: 0.75,
        size: '2.1MB'
      })),
      cleanup: jest.fn()
    };

    mockCommandBridge = {
      executeCommand: jest.fn(),
      cleanup: jest.fn()
    };

    // Mock the imported classes using dynamic import for ESM compatibility
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
    if (bridge) {
      bridge.cleanup();
    }
  });

  describe('Constructor', () => {
    it('should initialize with performance monitoring', () => {
      expect(PerformanceMonitor).toHaveBeenCalledWith({
        enabled: true
      });
      expect(bridge.performanceMonitor).toBeDefined();
    });

    it('should setup progress event listeners', () => {
      expect(ProgressManager).toHaveBeenCalledWith({
        enabled: true
      });
      expect(bridge.progressManager).toBeDefined();
    });
  });

  describe('executeCommand', () => {
    it('should execute command with full optimization flow', async () => {
      const command = 'research';
      const args = ['test query'];
      const options = {};

      mockCommandBridge.executeCommand.mockResolvedValue({
        success: true,
        data: 'Research result'
      });

      const result = await bridge.executeCommand(command, args, options);

      expect(mockPerformanceMonitor.startMeasurement).toHaveBeenCalledWith(command);
      expect(mockProgressManager.createProgress).toHaveBeenCalledWith(
        expect.stringMatching(/^test-uuid-\d+$/),
        command,
        expect.any(Number)
      );
      expect(result.success).toBe(true);
      expect(result.data).toBe('Research result');
    });

    it('should return cached result when available', async () => {
      const command = 'explain';
      const args = ['test code'];
      const cachedResult = { success: true, data: 'Cached explanation' };

      mockResultCache.has.mockReturnValue(true);
      mockResultCache.get.mockReturnValue(cachedResult);

      const result = await bridge.executeCommand(command, args);

      expect(result).toEqual(cachedResult);
      expect(mockCommandBridge.executeCommand).not.toHaveBeenCalled();
    });

    it('should skip cache when skipCache option is true', async () => {
      const command = 'explain';
      const args = ['test code'];
      const options = { skipCache: true };

      mockCommandBridge.executeCommand.mockResolvedValue({
        success: true,
        data: 'Fresh explanation'
      });

      const result = await bridge.executeCommand(command, args, options);

      expect(mockResultCache.has).not.toHaveBeenCalled();
      expect(mockCommandBridge.executeCommand).toHaveBeenCalled();
      expect(result.data).toBe('Fresh explanation');
    });

    it('should handle command cancellation', async () => {
      const command = 'research';
      const args = ['test query'];
      const abortController = new AbortController();

      // Simulate command execution that gets cancelled
      mockCommandBridge.executeCommand.mockImplementation(async () => {
        abortController.abort();
        throw new Error('Command was cancelled');
      });

      await expect(bridge.executeCommand(command, args, { signal: abortController.signal }))
        .rejects.toThrow('Command was cancelled');
    });

    it('should integrate external AbortSignal', async () => {
      const command = 'analyze';
      const args = ['test file'];
      const abortController = new AbortController();

      mockCommandBridge.executeCommand.mockImplementation(async (cmd, args, opts) => {
        expect(opts.signal).toBe(abortController.signal);
        return { success: true, data: 'Analysis result' };
      });

      const result = await bridge.executeCommand(command, args, { signal: abortController.signal });

      expect(result.success).toBe(true);
    });

    it('should cache successful results', async () => {
      const command = 'explain';
      const args = ['test code'];
      const result = { success: true, data: 'Explanation result' };

      mockCommandBridge.executeCommand.mockResolvedValue(result);

      await bridge.executeCommand(command, args);

      expect(mockResultCache.set).toHaveBeenCalledWith(
        expect.any(String), // cache key
        result
      );
    });

    it('should not cache failed results', async () => {
      const command = 'explain';
      const args = ['test code'];
      const result = { success: false, error: 'Command failed' };

      mockCommandBridge.executeCommand.mockResolvedValue(result);

      await bridge.executeCommand(command, args);

      expect(mockResultCache.set).not.toHaveBeenCalled();
    });

    it('should update progress through execution lifecycle', async () => {
      const command = 'research';
      const args = ['test query'];

      mockCommandBridge.executeCommand.mockResolvedValue({
        success: true,
        data: 'Research result'
      });

      await bridge.executeCommand(command, args);

      expect(mockProgressManager.updateProgress).toHaveBeenCalled();
      expect(mockProgressManager.completeProgress).toHaveBeenCalled();
    });
  });

  describe('_executeOptimizedCommand', () => {
    it('should simulate optimized execution with progress updates', async () => {
      const command = 'research';
      const args = ['test query'];
      const progressId = 'progress-1';

      mockCommandBridge.executeCommand.mockResolvedValue({
        success: true,
        data: 'Research result'
      });

      const result = await bridge._executeOptimizedCommand(command, args, progressId);

      expect(mockProgressManager.updateProgress).toHaveBeenCalledWith(progressId, 25, 'Preparing command...');
      expect(result.success).toBe(true);
    });

    it('should handle abort signal during execution', async () => {
      const command = 'research';
      const args = ['test query'];
      const progressId = 'progress-1';
      const abortController = new AbortController();

      // Abort immediately
      abortController.abort();

      await expect(bridge._executeOptimizedCommand(command, args, progressId, abortController.signal))
        .rejects.toThrow('Command was cancelled');
    });
  });

  describe('Step Estimation', () => {
    it('should estimate steps for known commands', () => {
      expect(bridge._estimateSteps('research')).toBe(4);
      expect(bridge._estimateSteps('analyze')).toBe(3);
      expect(bridge._estimateSteps('review')).toBe(3);
      expect(bridge._estimateSteps('explain')).toBe(2);
    });

    it('should provide default estimate for unknown commands', () => {
      expect(bridge._estimateSteps('unknown-command')).toBe(3);
    });
  });

  describe('Execution Time Estimation', () => {
    it('should estimate execution time for known commands', () => {
      expect(bridge._estimateExecutionTime('research')).toBe(15000); // 15 seconds
      expect(bridge._estimateExecutionTime('analyze')).toBe(8000);   // 8 seconds
      expect(bridge._estimateExecutionTime('review')).toBe(10000);   // 10 seconds
      expect(bridge._estimateExecutionTime('explain')).toBe(5000);   // 5 seconds
    });

    it('should provide default time for unknown commands', () => {
      expect(bridge._estimateExecutionTime('unknown-command')).toBe(10000); // 10 seconds
    });
  });

  describe('Command Management', () => {
    it('should cancel command through progress manager', () => {
      const commandId = 'cmd-123';
      bridge.cancelCommand(commandId);
      expect(mockProgressManager.cancelCommand).toHaveBeenCalledWith(commandId);
    });

    it('should get active commands', () => {
      const activeCommands = [{ id: 'cmd-1', command: 'research' }];
      mockProgressManager.getActiveCommands.mockReturnValue(activeCommands);

      expect(bridge.getActiveCommands()).toEqual(activeCommands);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should get performance statistics', () => {
      const stats = bridge.getPerformanceStats();
      expect(stats).toEqual({
        totalCommands: 5,
        averageExecutionTime: 1200,
        fastestCommand: 'explain',
        slowestCommand: 'research'
      });
    });

    it('should get cache statistics', () => {
      const stats = bridge.getCacheStats();
      expect(stats).toEqual({
        totalEntries: 3,
        hitRate: 0.75,
        size: '2.1MB'
      });
    });

    it('should get optimization recommendations', () => {
      const recommendations = bridge.getOptimizationRecommendations();
      expect(recommendations).toEqual([
        { type: 'cache', message: 'Enable caching for better performance' }
      ]);
    });
  });

  describe('Cache Management', () => {
    it('should clear specific command cache', () => {
      bridge.clearCache('research');
      expect(mockResultCache.clear).toHaveBeenCalledWith('research');
    });

    it('should clear all cache when no command specified', () => {
      bridge.clearCache();
      expect(mockResultCache.clear).toHaveBeenCalledWith(null);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all components', () => {
      bridge.cleanup();
      expect(mockCommandBridge.cleanup).toHaveBeenCalled();
      expect(mockPerformanceMonitor.cleanup).toHaveBeenCalled();
      expect(mockProgressManager.cleanup).toHaveBeenCalled();
      expect(mockResultCache.cleanup).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      await expect(bridge.executeCommand('', []))
        .rejects.toThrow('Command name is required');
    });

    it('should handle execution errors with metrics', async () => {
      const command = 'research';
      const args = ['test query'];

      mockCommandBridge.executeCommand.mockRejectedValue(new Error('Execution failed'));

      await expect(bridge.executeCommand(command, args))
        .rejects.toThrow('Execution failed');

      expect(mockPerformanceMonitor.endMeasurement).toHaveBeenCalled();
      expect(mockProgressManager.failProgress).toHaveBeenCalled();
    });

    it('should handle cancellation errors with specific message', async () => {
      const command = 'research';
      const args = ['test query'];
      const abortController = new AbortController();

      mockCommandBridge.executeCommand.mockImplementation(async () => {
        abortController.abort();
        const error = new Error('Command was cancelled');
        error.name = 'AbortError';
        throw error;
      });

      await expect(bridge.executeCommand(command, args, { signal: abortController.signal }))
        .rejects.toThrow('Command was cancelled');
    });
  });
});