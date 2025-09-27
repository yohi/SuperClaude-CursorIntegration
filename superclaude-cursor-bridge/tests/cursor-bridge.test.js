/**
 * Cursor Bridge Core のテスト
 * TDD Phase: RED - まず失敗するテストを書く
 */

import { jest, describe, test, beforeEach, expect } from '@jest/globals';

// CommandBridge と ConfigManager のモックを手動で作成
const mockCommandBridge = {
  executeCommand: jest.fn(),
  getAvailableCommands: jest.fn(),
  validateCommand: jest.fn()
};

const mockConfigManager = {
  get: jest.fn(),
  set: jest.fn(),
  reload: jest.fn()
};

// モジュールの動的モック
jest.unstable_mockModule('../src/command-bridge.js', () => ({
  default: jest.fn(() => mockCommandBridge)
}));

jest.unstable_mockModule('../src/config-manager.js', () => ({
  default: jest.fn(() => mockConfigManager)
}));

describe('CursorBridge', () => {
  let cursorBridge;
  let CursorBridge;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    ({ default: CursorBridge } = await import('../src/cursor-bridge.js'));
    cursorBridge = new CursorBridge();
  });

  describe('constructor', () => {
    test('should initialize with default configuration', () => {
      expect(cursorBridge).toBeDefined();
      expect(cursorBridge.config).toBeDefined();
      expect(cursorBridge.config.timeout).toBe(30000);
    });

    test('should accept custom configuration', () => {
      const customConfig = { timeout: 60000 };
      const bridgeWithConfig = new CursorBridge(customConfig);

      expect(bridgeWithConfig).toBeDefined();
      expect(bridgeWithConfig.config.timeout).toBe(60000);
    });
  });

  describe('Chat Commands API Integration', () => {
    test('should register SuperClaude commands as Cursor chat commands', async () => {
      mockCommandBridge.getAvailableCommands.mockReturnValue([
        'research', 'analyze', 'review', 'explain'
      ]);

      const commands = await cursorBridge.registerChatCommands();

      expect(commands).toBeDefined();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });

    test('should handle command registration errors gracefully', async () => {
      mockCommandBridge.getAvailableCommands.mockRejectedValue(
        new Error('Failed to get commands')
      );

      await expect(cursorBridge.registerChatCommands()).rejects.toThrow();
    });
  });

  describe('Command Dispatch', () => {
    test('should dispatch commands to CommandBridge', async () => {
      const commandName = 'research';
      const args = ['test query'];

      mockCommandBridge.executeCommand.mockResolvedValue({
        success: true,
        result: 'Research completed'
      });

      const result = await cursorBridge.dispatchCommand(commandName, args);

      expect(mockCommandBridge.executeCommand).toHaveBeenCalledWith(
        commandName,
        args
      );
      expect(result.success).toBe(true);
    });

    test('should validate commands before execution', async () => {
      const commandName = 'invalid-command';
      const args = [];

      mockCommandBridge.validateCommand.mockReturnValue(false);

      await expect(
        cursorBridge.dispatchCommand(commandName, args)
      ).rejects.toThrow('Invalid command');
    });

    test('should handle command execution errors', async () => {
      const commandName = 'research';
      const args = ['test query'];

      mockCommandBridge.executeCommand.mockRejectedValue(
        new Error('Command execution failed')
      );

      const result = await cursorBridge.dispatchCommand(commandName, args);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('User Interface Integration', () => {
    test('should provide progress feedback for long-running commands', async () => {
      const commandName = 'analyze';
      const args = ['large-project'];

      const progressCallback = jest.fn();

      mockCommandBridge.executeCommand.mockImplementation(() => {
        // シミュレート：進行状況の更新
        progressCallback({ progress: 50, message: 'Analyzing files...' });
        return Promise.resolve({ success: true, result: 'Analysis completed' });
      });

      await cursorBridge.dispatchCommand(commandName, args, {
        onProgress: progressCallback
      });

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.any(Number),
          message: expect.any(String)
        })
      );
    });

    test('should format results for Cursor UI display', async () => {
      const commandName = 'review';
      const args = ['file.js'];

      mockCommandBridge.executeCommand.mockResolvedValue({
        success: true,
        result: {
          findings: ['Issue 1', 'Issue 2'],
          summary: 'Code review completed'
        }
      });

      const result = await cursorBridge.dispatchCommand(commandName, args);
      const formattedResult = cursorBridge.formatForUI(result);

      expect(formattedResult).toHaveProperty('displayText');
      expect(formattedResult).toHaveProperty('metadata');
    });
  });

  describe('Session Management', () => {
    test('should create and manage session context', () => {
      const sessionId = cursorBridge.createSession();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });

    test('should store session-specific data', () => {
      const sessionId = cursorBridge.createSession();
      const sessionData = { projectPath: '/test/path', preferences: {} };

      cursorBridge.setSessionData(sessionId, sessionData);
      const retrievedData = cursorBridge.getSessionData(sessionId);

      expect(retrievedData).toEqual(sessionData);
    });

    test('should clean up expired sessions', () => {
      const sessionId = cursorBridge.createSession();

      cursorBridge.cleanupSessions();

      // 期限切れセッションがクリーンアップされることを確認
      expect(cursorBridge.getSessionData(sessionId)).toBeUndefined();
    });

    test('should handle multiple concurrent sessions', () => {
      const session1 = cursorBridge.createSession();
      const session2 = cursorBridge.createSession();

      expect(session1).not.toBe(session2);

      cursorBridge.setSessionData(session1, { user: 'user1' });
      cursorBridge.setSessionData(session2, { user: 'user2' });

      expect(cursorBridge.getSessionData(session1).user).toBe('user1');
      expect(cursorBridge.getSessionData(session2).user).toBe('user2');
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      const { default: CommandBridge } = await import('../src/command-bridge.js');
      CommandBridge.mockImplementation(() => {
        throw new Error('Failed to initialize CommandBridge');
      });

      expect(() => new CursorBridge()).toThrow();
    });

    test('should provide meaningful error messages', async () => {
      mockCommandBridge.executeCommand.mockRejectedValue(
        new Error('SuperClaude CLI not found')
      );

      const result = await cursorBridge.dispatchCommand('research', ['test']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('SuperClaude CLI');
    });
  });

  describe('Performance', () => {
    test('should handle command execution within timeout', async () => {
      jest.setTimeout(10000); // 10秒のタイムアウト

      mockCommandBridge.executeCommand.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );

      const start = Date.now();
      await cursorBridge.dispatchCommand('quick-command', []);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // 5秒以内
    });

    test('should cancel long-running commands when requested', async () => {
      let cancelled = false;

      mockCommandBridge.executeCommand.mockImplementation(() =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (cancelled) {
              reject(new Error('Command cancelled'));
            } else {
              resolve({ success: true });
            }
          }, 5000);

          // キャンセル機能をシミュレート
          return timeout;
        })
      );

      const commandPromise = cursorBridge.dispatchCommand('long-command', []);

      // 1秒後にキャンセル
      setTimeout(() => {
        cancelled = true;
        cursorBridge.cancelCommand('long-command');
      }, 1000);

      await expect(commandPromise).rejects.toThrow('cancelled');
    });
  });
});