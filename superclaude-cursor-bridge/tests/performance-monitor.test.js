/**
 * PerformanceMonitor Unit Tests
 * TDD implementation following Kent Beck's methodology
 */

import PerformanceMonitor from '../src/performance-monitor.js';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('PerformanceMonitor', () => {
  let monitor;
  let originalProcess;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      maxHistorySize: 10,
      lightCommandThreshold: 3000,
      heavyCommandThreshold: 30000,
      memoryWarning: 512 * 1024 * 1024
    });

    // Mock process.memoryUsage
    originalProcess = global.process;
    global.process = {
      ...originalProcess,
      memoryUsage: jest.fn(() => ({
        rss: 100 * 1024 * 1024, // 100MB
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 80 * 1024 * 1024 // 80MB
      }))
    };
  });

  afterEach(() => {
    global.process = originalProcess;
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultMonitor = new PerformanceMonitor();

      expect(defaultMonitor.maxHistorySize).toBe(100);
      expect(defaultMonitor.thresholds.lightCommand).toBe(3000);
      expect(defaultMonitor.thresholds.heavyCommand).toBe(30000);
      expect(defaultMonitor.performanceHistory).toEqual([]);
    });

    it('should initialize with custom options', () => {
      expect(monitor.maxHistorySize).toBe(10);
      expect(monitor.thresholds.lightCommand).toBe(3000);
      expect(monitor.thresholds.heavyCommand).toBe(30000);
      expect(monitor.thresholds.memoryWarning).toBe(512 * 1024 * 1024);
    });
  });

  describe('startMeasurement', () => {
    it('should create performance context', () => {
      const context = monitor.startMeasurement('research');

      expect(context).toEqual({
        commandName: 'research',
        startTime: expect.any(Number),
        startMemory: expect.objectContaining({
          rss: expect.any(Number),
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number)
        }),
        id: expect.stringMatching(/^research_\d+_[a-z0-9]+$/)
      });

      expect(global.process.memoryUsage).toHaveBeenCalled();
    });

    it('should generate unique IDs for different commands', () => {
      const context1 = monitor.startMeasurement('research');
      const context2 = monitor.startMeasurement('analyze');

      expect(context1.id).not.toBe(context2.id);
      expect(context1.commandName).toBe('research');
      expect(context2.commandName).toBe('analyze');
    });
  });

  describe('endMeasurement', () => {
    let context;

    beforeEach(() => {
      context = monitor.startMeasurement('research');
      // Simulate time passing
      jest.spyOn(Date, 'now').mockReturnValue(context.startTime + 1500);
    });

    afterEach(() => {
      Date.now.mockRestore();
    });

    it('should calculate performance metrics', () => {
      const metrics = monitor.endMeasurement(context, { success: true });

      expect(metrics).toEqual({
        id: context.id,
        commandName: 'research',
        executionTime: 1500,
        memoryUsed: {
          rss: 0, // No change as we're using the same mock
          heapUsed: 0,
          heapTotal: 0
        },
        success: true,
        timestamp: expect.any(String),
        warning: expect.any(Array)
      });
    });

    it('should handle successful command result', () => {
      const metrics = monitor.endMeasurement(context, { success: true });
      expect(metrics.success).toBe(true);
    });

    it('should handle failed command result', () => {
      const metrics = monitor.endMeasurement(context, { success: false });
      expect(metrics.success).toBe(false);
    });

    it('should default to success when result is undefined', () => {
      const metrics = monitor.endMeasurement(context);
      expect(metrics.success).toBe(true);
    });

    it('should record metrics in history', () => {
      monitor.endMeasurement(context, { success: true });

      expect(monitor.performanceHistory).toHaveLength(1);
      expect(monitor.performanceHistory[0]).toEqual(
        expect.objectContaining({
          commandName: 'research',
          executionTime: 1500,
          success: true
        })
      );
    });

    it('should limit history size', () => {
      // Fill history beyond maxHistorySize
      for (let i = 0; i < 15; i++) {
        const ctx = monitor.startMeasurement(`command${i}`);
        monitor.endMeasurement(ctx);
      }

      expect(monitor.performanceHistory).toHaveLength(10);
    });
  });

  describe('_generateWarnings', () => {
    it('should warn about slow execution for light commands', () => {
      const warnings = monitor._generateWarnings(
        4000, // Exceeds light command threshold
        { rss: 100 * 1024 * 1024 },
        { rss: 100 * 1024 * 1024 }
      );

      expect(warnings).toContainEqual({
        type: 'slow_execution',
        message: 'Command took 4000ms (threshold: 3000ms)',
        severity: 'medium'
      });
    });

    it('should warn about very slow execution as high severity', () => {
      const warnings = monitor._generateWarnings(
        35000, // Exceeds heavy command threshold
        { rss: 100 * 1024 * 1024 },
        { rss: 100 * 1024 * 1024 }
      );

      expect(warnings).toContainEqual({
        type: 'slow_execution',
        message: 'Command took 35000ms (threshold: 3000ms)',
        severity: 'high'
      });
    });

    it('should warn about memory increase during execution', () => {
      const warnings = monitor._generateWarnings(
        1000,
        { rss: 400 * 1024 * 1024 }, // End memory
        { rss: 100 * 1024 * 1024 }  // Start memory (300MB increase)
      );

      expect(warnings).toContainEqual({
        type: 'memory',
        message: 'Memory increased by 300MB during execution',
        severity: 'high'
      });
    });

    it('should warn about high absolute memory when start memory unavailable', () => {
      const warnings = monitor._generateWarnings(
        1000,
        { rss: 1200 * 1024 * 1024 }, // 1.2GB absolute
        null // No start memory
      );

      expect(warnings).toContainEqual({
        type: 'memory',
        message: 'High absolute memory usage: 1200MB',
        severity: 'medium'
      });
    });

    it('should return empty array for good performance', () => {
      const warnings = monitor._generateWarnings(
        1000, // Fast execution
        { rss: 100 * 1024 * 1024 },
        { rss: 90 * 1024 * 1024 } // Memory decreased
      );

      expect(warnings).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      // Add some test data
      const commands = ['research', 'analyze', 'research', 'explain'];
      const times = [1000, 2500, 1500, 800];
      const successes = [true, false, true, true];

      commands.forEach((cmd, i) => {
        const context = monitor.startMeasurement(cmd);
        jest.spyOn(Date, 'now').mockReturnValue(context.startTime + times[i]);
        monitor.endMeasurement(context, { success: successes[i] });
        Date.now.mockRestore();
      });
    });

    it('should calculate basic statistics', () => {
      const stats = monitor.getStatistics();

      expect(stats.totalExecutions).toBe(4);
      expect(stats.averageExecutionTime).toBe(1450); // (1000 + 2500 + 1500 + 800) / 4
      expect(stats.fastestExecution).toBe(800);
      expect(stats.slowestExecution).toBe(2500);
      expect(stats.successRate).toBe('75.00'); // 3 out of 4 successful
    });

    it('should provide command breakdown', () => {
      const stats = monitor.getStatistics();

      expect(stats.commandBreakdown).toEqual({
        research: {
          count: 2,
          totalTime: 2500,
          avgTime: 1250,
          successCount: 2
        },
        analyze: {
          count: 1,
          totalTime: 2500,
          avgTime: 2500,
          successCount: 0
        },
        explain: {
          count: 1,
          totalTime: 800,
          avgTime: 800,
          successCount: 1
        }
      });
    });

    it('should return default stats for empty history', () => {
      monitor.clearHistory();
      const stats = monitor.getStatistics();

      expect(stats).toEqual({
        totalExecutions: 0,
        averageExecutionTime: 0,
        fastestExecution: 0,
        slowestExecution: 0,
        successRate: 0,
        commandBreakdown: {}
      });
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should recommend caching for slow average execution', () => {
      // Add slow executions
      for (let i = 0; i < 3; i++) {
        const context = monitor.startMeasurement('research');
        jest.spyOn(Date, 'now').mockReturnValue(context.startTime + 5000);
        monitor.endMeasurement(context, { success: true });
        Date.now.mockRestore();
      }

      const recommendations = monitor.getOptimizationRecommendations();

      expect(recommendations).toContainEqual({
        type: 'performance',
        priority: 'high',
        recommendation: 'Consider implementing command result caching to reduce average execution time',
        currentValue: '5000ms',
        targetValue: '<3000ms'
      });
    });

    it('should recommend reliability improvements for low success rate', () => {
      // Add failed executions
      for (let i = 0; i < 10; i++) {
        const context = monitor.startMeasurement('research');
        monitor.endMeasurement(context, { success: i < 9 }); // 90% success rate
      }

      const recommendations = monitor.getOptimizationRecommendations();

      expect(recommendations).toContainEqual({
        type: 'reliability',
        priority: 'high',
        recommendation: 'Improve error handling and retry mechanisms',
        currentValue: '90.00% success rate',
        targetValue: '>95% success rate'
      });
    });

    it('should recommend memory optimization for frequent warnings', () => {
      // Create executions with memory warnings
      for (let i = 0; i < 5; i++) {
        const context = monitor.startMeasurement('research');
        monitor.endMeasurement(context, { success: true });
        // Manually add memory warnings to recent history
        monitor.performanceHistory[0].warning = [{
          type: 'memory',
          severity: 'high'
        }];
      }

      const recommendations = monitor.getOptimizationRecommendations();

      expect(recommendations).toContainEqual({
        type: 'memory',
        priority: 'medium',
        recommendation: 'Implement memory usage optimization and garbage collection',
        currentValue: '5 recent memory warnings',
        targetValue: '<2 memory warnings per 10 executions'
      });
    });
  });

  describe('isWithinThresholds', () => {
    it('should check light command thresholds', () => {
      expect(monitor.isWithinThresholds('research', 2000)).toBe(true);
      expect(monitor.isWithinThresholds('research', 4000)).toBe(false);
      expect(monitor.isWithinThresholds('explain', 2500)).toBe(true);
      expect(monitor.isWithinThresholds('help', 3000)).toBe(true);
    });

    it('should check heavy command thresholds', () => {
      expect(monitor.isWithinThresholds('analyze', 25000)).toBe(true);
      expect(monitor.isWithinThresholds('review', 35000)).toBe(false);
      expect(monitor.isWithinThresholds('compile', 20000)).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('should clear performance history', () => {
      // Add some data
      const context = monitor.startMeasurement('research');
      monitor.endMeasurement(context);

      expect(monitor.performanceHistory).toHaveLength(1);

      monitor.clearHistory();

      expect(monitor.performanceHistory).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    it('should track full command lifecycle', () => {
      const context = monitor.startMeasurement('research');

      // Simulate 2 second execution
      jest.spyOn(Date, 'now').mockReturnValue(context.startTime + 2000);

      const metrics = monitor.endMeasurement(context, { success: true });

      expect(metrics.executionTime).toBe(2000);
      expect(metrics.success).toBe(true);
      expect(monitor.performanceHistory).toHaveLength(1);

      const stats = monitor.getStatistics();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.averageExecutionTime).toBe(2000);

      Date.now.mockRestore();
    });
  });
});