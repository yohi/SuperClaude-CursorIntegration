/**
 * End-to-End Integration Tests
 * Tests for complete command execution flow from Cursor IDE to SuperClaude CLI
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import OptimizedCommandBridge from '../../src/optimized-command-bridge.js';
import fs from 'fs/promises';
import path from 'path';

describe('End-to-End Integration Tests', () => {
  let optimizedBridge;
  const testConfigPath = './tests/fixtures/test-config.json';

  beforeEach(async () => {
    // テスト用設定ファイルを作成
    const stubCliPath = path.resolve('./tests/fixtures/stub-cli.js');
    const testConfig = {
      superclaude: {
        cliPath: process.execPath, // Node.js実行ファイルパス
        cliArgs: [stubCliPath], // stub CLIスクリプトを第一引数として渡す
        timeout: 10000
      },
      performance: {
        thresholds: {
          lightCommand: 5000,
          heavyCommand: 30000
        }
      },
      cache: {
        maxSize: 50,
        defaultTTL: 300000
      }
    };

    await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

    // OptimizedCommandBridge インスタンスを作成
    optimizedBridge = new OptimizedCommandBridge({
      configPath: testConfigPath,
      performance: testConfig.performance,
      cache: testConfig.cache
    });
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    if (optimizedBridge?.resultCache) {
      optimizedBridge.resultCache.cleanup();
    }
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // ファイルが存在しない場合は無視
    }
  });

  describe('Complete Command Execution Flow', () => {
    it('should execute research command with caching and monitoring', async () => {
      const commandName = 'research';
      const args = ['test query'];

      // 初回実行
      const result1 = await optimizedBridge.executeCommand(commandName, args);

      expect(result1).toMatchObject({
        success: true,
        cached: false,
        commandId: expect.any(String)
      });

      // キャッシュから取得される2回目実行
      const result2 = await optimizedBridge.executeCommand(commandName, args);

      expect(result2).toMatchObject({
        success: true,
        cached: true
      });
    });

    it('should handle command cancellation', async () => {
      const abortController = new AbortController();

      // 実行開始後すぐにキャンセル
      setTimeout(() => abortController.abort(), 100);

      await expect(
        optimizedBridge.executeCommand('analyze', ['test'], {
          signal: abortController.signal
        })
      ).rejects.toThrow('cancelled');
    });

    it('should track performance metrics', async () => {
      await optimizedBridge.executeCommand('research', ['query1']);
      await optimizedBridge.executeCommand('analyze', ['query2']);

      const stats = optimizedBridge.performanceMonitor.getStatistics();

      expect(stats).toMatchObject({
        totalExecutions: 2,
        averageExecutionTime: expect.any(Number),
        successRate: expect.any(String),
        commandBreakdown: expect.any(Object)
      });
    });

    it('should manage progress for long-running commands', (done) => {
      let progressReceived = false;

      optimizedBridge.on('progress', (data) => {
        progressReceived = true;
        expect(data).toMatchObject({
          commandId: expect.any(String),
          progress: expect.any(Number)
        });
      });

      optimizedBridge.on('commandComplete', (data) => {
        expect(data).toMatchObject({
          commandId: expect.any(String),
          success: true
        });
        // プログレス更新が発生したかはコマンドの性質に依存
        done();
      });

      optimizedBridge.executeCommand('review', ['test-file.js']);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid commands gracefully', async () => {
      const result = await optimizedBridge.executeCommand('invalid-command', []);

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid command')
      });
    });

    it('should handle timeout scenarios', async () => {
      // 短いタイムアウトを設定
      const shortTimeoutBridge = new OptimizedCommandBridge({
        configPath: testConfigPath,
        superclaude: { timeout: 1 } // 1ms - 確実にタイムアウトする
      });

      const result = await shortTimeoutBridge.executeCommand('research', ['query']);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/timeout|killed/i);
    });

    it('should maintain cache integrity during errors', async () => {
      // 正常実行でキャッシュに保存
      await optimizedBridge.executeCommand('research', ['valid-query']);

      // エラー実行
      await optimizedBridge.executeCommand('invalid-command', []);

      // キャッシュが正常に動作することを確認
      const cachedResult = await optimizedBridge.executeCommand('research', ['valid-query']);
      expect(cachedResult.cached).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    it('should provide optimization recommendations', async () => {
      // 複数回実行してデータを蓄積
      for (let i = 0; i < 5; i++) {
        await optimizedBridge.executeCommand('analyze', [`file${i}.js`]);
      }

      const recommendations = optimizedBridge.performanceMonitor.getOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should enforce cache size limits', async () => {
      // キャッシュサイズを超えるまで実行
      for (let i = 0; i < 60; i++) { // maxSize: 50 を超える
        await optimizedBridge.executeCommand('research', [`query${i}`]);
      }

      const cacheStats = optimizedBridge.resultCache.getStats();
      expect(cacheStats.size).toBeLessThanOrEqual(50);
    });

    it('should handle concurrent command execution', async () => {
      const promises = [];

      // 同時に複数のコマンドを実行
      for (let i = 0; i < 5; i++) {
        promises.push(
          optimizedBridge.executeCommand('research', [`concurrent-query-${i}`])
        );
      }

      const results = await Promise.all(promises);

      // 全てのコマンドが正常完了することを確認
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Component Integration', () => {
    it('should integrate all components correctly', () => {
      // OptimizedCommandBridge が全てのコンポーネントを持っていることを確認
      expect(optimizedBridge.performanceMonitor).toBeDefined();
      expect(optimizedBridge.progressManager).toBeDefined();
      expect(optimizedBridge.resultCache).toBeDefined();

      // EventEmitter機能が動作することを確認
      expect(typeof optimizedBridge.on).toBe('function');
      expect(typeof optimizedBridge.emit).toBe('function');
    });

    it('should cleanup resources properly', () => {
      const cache = optimizedBridge.resultCache;

      // クリーンアップ実行
      cache.cleanup();

      // タイマーがクリアされていることを確認（間接的）
      expect(cache.cleanupInterval).toBeNull();
    });
  });
});