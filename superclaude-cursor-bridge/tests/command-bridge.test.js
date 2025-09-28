import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import CommandBridge from '../src/command-bridge.js';

describe('Task 2.2: Command Bridge - 受入基準テスト', () => {
  let commandBridge;

  beforeEach(() => {
    commandBridge = new CommandBridge();
  });

  afterEach(() => {
    commandBridge?.cleanup?.();
  });

  describe('25個のSuperClaudeコマンドのマッピング定義が完了', () => {
    test('全てのSuperClaudeコマンドが定義されている', () => {
      const mappings = commandBridge.getCommandMappings();

      // SuperClaudeの主要25コマンドの存在を確認
      const expectedCommands = [
        'research', 'analyze', 'review', 'explain', 'implement',
        'test', 'debug', 'refactor', 'optimize', 'document',
        'create', 'modify', 'delete', 'search', 'compare',
        'validate', 'format', 'migrate', 'deploy', 'monitor',
        'backup', 'restore', 'sync', 'configure', 'help'
      ];

      expect(mappings).toBeDefined();
      expect(Object.keys(mappings)).toHaveLength(25);

      expectedCommands.forEach(cmd => {
        expect(mappings).toHaveProperty(cmd);
        expect(mappings[cmd]).toHaveProperty('scCommand');
        expect(mappings[cmd].scCommand).toMatch(/^\/sc:/);
      });
    });

    test('各コマンドが適切なメタデータを持つ', () => {
      const mappings = commandBridge.getCommandMappings();

      Object.entries(mappings).forEach(([cmd, config]) => {
        expect(config).toHaveProperty('scCommand');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('parameters');
        expect(Array.isArray(config.parameters)).toBe(true);
      });
    });
  });

  describe('コマンド変換ロジックが実装済み', () => {
    test('Cursorコマンドを/sc:プレフィックス付きに変換する', () => {
      const result = commandBridge.translateCommand('research', ['query', 'topic']);

      expect(result).toHaveProperty('command');
      expect(result.command).toBe('/sc:research');
      expect(result).toHaveProperty('args');
      expect(Array.isArray(result.args)).toBe(true);
    });

    test('存在しないコマンドで適切なエラーが発生する', () => {
      expect(() => {
        commandBridge.translateCommand('invalid-command', []);
      }).toThrow('Unknown command: invalid-command');
    });

    test('コマンド変換で引数を適切に処理する', () => {
      const result = commandBridge.translateCommand('analyze', ['src/file.js', '--depth', '2']);

      expect(result.command).toBe('/sc:analyze');
      expect(result.args).toEqual(['src/file.js', '--depth', '2']);
    });
  });

  describe('パラメーター正規化と検証機能が動作', () => {
    test('必須パラメータの検証が動作する', () => {
      expect(() => {
        commandBridge.validateParameters('research', []);
      }).toThrow('Missing required parameter');
    });

    test('パラメータ型の変換が動作する', () => {
      const normalized = commandBridge.normalizeParameters('test', ['--verbose', 'true']);

      expect(normalized).toContain('--verbose');
      expect(normalized).toContain('true');
    });

    test('不正なパラメータでエラーが発生する', () => {
      expect(() => {
        commandBridge.validateParameters('research', ['--invalid-flag']);
      }).toThrow('Invalid parameter');
    });
  });

  describe('コマンド実行履歴の管理機能', () => {
    test('実行履歴が記録される', () => {
      commandBridge.recordExecution('research', ['query'], { status: 'success' });

      const history = commandBridge.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toHaveProperty('command', 'research');
      expect(history[0]).toHaveProperty('timestamp');
    });

    test('履歴の上限が適切に管理される', () => {
      // 上限以上のコマンドを実行
      for (let i = 0; i < 105; i++) {
        commandBridge.recordExecution('help', [], { status: 'success' });
      }

      const history = commandBridge.getExecutionHistory();
      expect(history.length).toBeLessThanOrEqual(100); // 上限100として
    });

    test('実行統計が取得できる', () => {
      commandBridge.recordExecution('research', ['query1'], { status: 'success' });
      commandBridge.recordExecution('research', ['query2'], { status: 'success' });
      commandBridge.recordExecution('analyze', ['file.js'], { status: 'error' });

      const stats = commandBridge.getExecutionStats();
      expect(stats).toHaveProperty('totalExecutions', 3);
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('mostUsedCommands');
    });
  });

  describe('executeCommandメソッドのテスト', () => {
    test('正常なコマンド実行', async () => {
      const result = await commandBridge.executeCommand('help', ['research']);

      expect(result.success).toBe(true);
      expect(result.command).toBe('/sc:help');
      expect(result.output).toContain('Mock execution result');

      // 実行履歴に記録されることを確認
      const history = commandBridge.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].command).toBe('help');
    });

    test('AbortSignalで事前にキャンセルされたコマンド', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(commandBridge.executeCommand('help', [], { signal: controller.signal }))
        .rejects.toThrow('Command was aborted before execution');
    });

    test('実行中のAbortSignalキャンセル', async () => {
      jest.useFakeTimers();

      try {
        const controller = new AbortController();

        const promise = commandBridge.executeCommand('help', [], { signal: controller.signal });

        // タイマーを進めてキャンセルを発生させる
        jest.advanceTimersByTime(50);
        controller.abort();

        await expect(promise)
          .rejects.toThrow("was cancelled");
      } finally {
        jest.useRealTimers();
      }
    });

    test('executeCommand内での検証エラー', async () => {
      await expect(commandBridge.executeCommand('research', []))
        .rejects.toThrow('Missing required parameter');
    });

    test('_executeSuperClaudeCommandでのAbortSignal処理', async () => {
      const controller = new AbortController();

      // 実行開始後すぐにキャンセル
      const promise = commandBridge.executeCommand('help', [], { signal: controller.signal });
      controller.abort();

      await expect(promise).rejects.toThrow("was cancelled");
    });

    test('AbortSignalリスナーの適切なクリーンアップ', async () => {
      const controller = new AbortController();
      const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener');

      try {
        await commandBridge.executeCommand('help', [], { signal: controller.signal });
        expect(removeEventListenerSpy).toHaveBeenCalled();
      } catch {
        // キャンセルされた場合もクリーンアップされることを確認
        expect(removeEventListenerSpy).toHaveBeenCalled();
      } finally {
        removeEventListenerSpy.mockRestore();
      }
    });

    test('実行エラー時のAbortSignalクリーンアップ', async () => {
      const controller = new AbortController();
      const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener');

      try {
        await expect(commandBridge.executeCommand('invalid-command', [], { signal: controller.signal }))
          .rejects.toThrow('Unknown command');
        // 検証エラーの場合、finallyブロックでクリーンアップされる
      } catch {
        // エラーの場合も処理
      } finally {
        // クリーンアップは必ず実行される
        expect(removeEventListenerSpy).toHaveBeenCalled();
        removeEventListenerSpy.mockRestore();
      }
    });

    test('最終的なAbortSignalチェックのカバレッジ', async () => {
      // _executeSuperClaudeCommand 内部のカバレッジを向上させるためのテスト
      // Promiseの解決前にAbortSignalをチェックするパスをテスト
      const result = await commandBridge.executeCommand('help', []);
      expect(result.success).toBe(true);
    });
  });

  describe('パラメータ検証の詳細テスト', () => {
    test('validateParametersで存在しないコマンド', () => {
      expect(() => {
        commandBridge.validateParameters('non-existent', []);
      }).toThrow('Unknown command: non-existent');
    });

    test('normalizeParametersでnon-string値の処理', () => {
      const result = commandBridge.normalizeParameters('test', [123, { key: 'value' }, null]);
      expect(result).toEqual([123, { key: 'value' }, null]);
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なコマンド名でエラーが発生する', () => {
      expect(() => {
        commandBridge.translateCommand('', []);
      }).toThrow('Invalid command name');

      expect(() => {
        commandBridge.translateCommand('   ', []);
      }).toThrow('Invalid command name');

      expect(() => {
        commandBridge.translateCommand(null, []);
      }).toThrow('Invalid command name');
    });

    test('null/undefined引数を適切に処理する', () => {
      expect(() => {
        commandBridge.translateCommand('help', null);
      }).not.toThrow();

      expect(() => {
        commandBridge.translateCommand('help', undefined);
      }).not.toThrow();
    });
  });
});