/**
 * Cursor Bridge の統合テスト
 * TDD Phase: REFACTOR - 改善されたコードのテスト
 */

import { jest, describe, test, beforeEach, expect, afterEach } from '@jest/globals';

describe('CursorBridge Integration Tests', () => {
  let CursorBridge;
  let mockCommandBridge;
  let mockConfigManager;

  beforeEach(async () => {
    // モジュールのインポート
    const module = await import('../src/cursor-bridge.js');
    CursorBridge = module.default;

    // モックオブジェクトの準備
    mockCommandBridge = {
      getAvailableCommands: jest.fn(),
      validateCommand: jest.fn(),
      executeCommand: jest.fn()
    };

    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      reload: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    test('should accept mock dependencies', () => {
      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      expect(bridge).toBeDefined();
      expect(bridge.commandBridge).toBe(mockCommandBridge);
      expect(bridge.configManager).toBe(mockConfigManager);
    });

    test('should handle configuration correctly', () => {
      const customConfig = {
        timeout: 60000,
        maxSessions: 50
      };

      const bridge = new CursorBridge(customConfig, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      expect(bridge.config.timeout).toBe(60000);
      expect(bridge.config.maxSessions).toBe(50);
      expect(bridge.config.sessionTimeout).toBe(3600000); // デフォルト値
    });
  });

  describe('Chat Commands Registration', () => {
    test('should register commands successfully', async () => {
      mockCommandBridge.getAvailableCommands.mockReturnValue([
        'research', 'analyze', 'review'
      ]);

      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      const commands = await bridge.registerChatCommands();

      expect(commands).toHaveLength(3);
      expect(commands[0].name).toBe('/sc:research');
      expect(commands[0].description).toContain('SuperClaude research command');
      expect(typeof commands[0].handler).toBe('function');
    });

    test('should handle CommandBridge initialization error', async () => {
      const bridge = new CursorBridge({}, {
        commandBridge: null,
        configManager: mockConfigManager
      });

      await expect(bridge.registerChatCommands()).rejects.toThrow(
        'CommandBridge not properly initialized'
      );
    });

    test('should handle invalid return from getAvailableCommands', async () => {
      mockCommandBridge.getAvailableCommands.mockReturnValue('invalid');

      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      await expect(bridge.registerChatCommands()).rejects.toThrow(
        'getAvailableCommands did not return an array'
      );
    });
  });

  describe('Command Dispatch', () => {
    test('should dispatch valid commands', async () => {
      mockCommandBridge.validateCommand.mockReturnValue(true);
      mockCommandBridge.executeCommand.mockResolvedValue({
        success: true,
        result: 'Command executed successfully'
      });

      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      const result = await bridge.dispatchCommand('research', ['test query']);

      expect(mockCommandBridge.validateCommand).toHaveBeenCalledWith('research');
      expect(mockCommandBridge.executeCommand).toHaveBeenCalledWith('research', ['test query']);
      expect(result.success).toBe(true);
    });

    test('should handle invalid command names', async () => {
      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      const result = await bridge.dispatchCommand('', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command name must be a non-empty string');
    });

    test('should handle CommandBridge not initialized', async () => {
      const bridge = new CursorBridge({}, {
        commandBridge: null,
        configManager: mockConfigManager
      });

      const result = await bridge.dispatchCommand('research', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('CommandBridge not properly initialized');
    });

    test('should handle invalid commands', async () => {
      mockCommandBridge.validateCommand.mockReturnValue(false);

      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      const result = await bridge.dispatchCommand('invalid-command', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid command: invalid-command');
    });
  });

  describe('Session Management with Force Cleanup', () => {
    test('should force cleanup all sessions', () => {
      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      // セッション作成
      const sessionId1 = bridge.createSession();
      const sessionId2 = bridge.createSession();

      expect(bridge.sessions.size).toBe(2);

      // 強制クリーンアップ
      bridge.cleanupSessions(true);

      expect(bridge.sessions.size).toBe(0);
      expect(bridge.getSessionData(sessionId1)).toBeUndefined();
      expect(bridge.getSessionData(sessionId2)).toBeUndefined();
    });

    test('should cleanup only expired sessions', () => {
      const bridge = new CursorBridge({
        sessionTimeout: 1000 // 1秒
      }, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      // セッション作成
      const sessionId = bridge.createSession();
      bridge.setSessionData(sessionId, { test: 'data' });

      // セッションが存在することを確認
      expect(bridge.getSessionData(sessionId)).toEqual({ test: 'data' });

      // 時間を進める（モック）
      const session = bridge.sessions.get(sessionId);
      session.lastActivity = Date.now() - 2000; // 2秒前

      // 期限切れクリーンアップ
      bridge.cleanupSessions(false);

      expect(bridge.getSessionData(sessionId)).toBeUndefined();
    });
  });

  describe('UI Formatting', () => {
    test('should format successful results', () => {
      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      const result = {
        success: true,
        result: 'Operation completed'
      };

      const formatted = bridge.formatForUI(result);

      expect(formatted.displayText).toBe('Operation completed');
      expect(formatted.metadata.type).toBe('success');
      expect(formatted.metadata.timestamp).toBeDefined();
    });

    test('should format error results', () => {
      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      const result = {
        success: false,
        error: 'Command failed'
      };

      const formatted = bridge.formatForUI(result);

      expect(formatted.displayText).toBe('Error: Command failed');
      expect(formatted.metadata.type).toBe('error');
    });

    test('should handle complex result objects', () => {
      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      const result = {
        success: true,
        result: {
          findings: ['Issue 1', 'Issue 2'],
          summary: 'Code review completed'
        }
      };

      const formatted = bridge.formatForUI(result);

      expect(formatted.displayText).toContain('Code review completed');
      expect(formatted.displayText).toContain('Issue 1');
      expect(formatted.displayText).toContain('Issue 2');
    });
  });

  describe('Resource Management', () => {
    test('should cleanup resources properly', () => {
      const bridge = new CursorBridge({}, {
        commandBridge: mockCommandBridge,
        configManager: mockConfigManager
      });

      // セッション作成
      bridge.createSession();
      bridge.createSession();

      expect(bridge.sessions.size).toBe(2);

      // リソース破棄
      bridge.destroy();

      expect(bridge.sessions.size).toBe(0);
    });
  });
});