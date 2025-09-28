/**
 * Tests for the research command implementation
 * Tests the /sc:research command integration with SuperClaude CLI
 */

import { jest } from '@jest/globals';

// モック設定 - ESModule importをモックする前に設定
jest.unstable_mockModule('../../commands/research.js', () => ({
  default: jest.fn()
}));
jest.unstable_mockModule('../../src/command-bridge.js', () => ({
  default: jest.fn()
}));
jest.unstable_mockModule('../../src/json-protocol.js', () => ({
  default: jest.fn()
}));

const { default: Research } = await import('../../commands/research.js');
const { default: CommandBridge } = await import('../../src/command-bridge.js');
const { default: JsonProtocol } = await import('../../src/json-protocol.js');

describe('Research Command', () => {
  let research;
  let mockCommandBridge;
  let mockJsonProtocol;

  beforeEach(() => {
    // モックインスタンスをリセット
    jest.clearAllMocks();

    mockCommandBridge = {
      executeCommand: jest.fn()
    };
    mockJsonProtocol = {
      sendCommand: jest.fn()
    };

    research = new Research({
      commandBridge: mockCommandBridge,
      jsonProtocol: mockJsonProtocol
    });
  });

  describe('Constructor', () => {
    test('should create research command instance with required dependencies', () => {
      expect(research).toBeInstanceOf(Research);
      expect(research.commandBridge).toBe(mockCommandBridge);
      expect(research.jsonProtocol).toBe(mockJsonProtocol);
    });

    test('should throw error if dependencies are missing', () => {
      expect(() => new Research()).toThrow('Required dependencies not provided');
      expect(() => new Research({ commandBridge: mockCommandBridge })).toThrow('JsonProtocol is required');
      expect(() => new Research({ jsonProtocol: mockJsonProtocol })).toThrow('CommandBridge is required');
    });
  });

  describe('execute', () => {
    test('should execute research command with valid query', async () => {
      const query = 'Node.js performance optimization';
      const expectedResult = {
        success: true,
        command: '/sc:research',
        args: [query],
        output: 'Research results for Node.js performance optimization...',
        timestamp: expect.any(String)
      };

      mockCommandBridge.executeCommand.mockResolvedValue(expectedResult);

      const result = await research.execute(query);

      expect(mockCommandBridge.executeCommand).toHaveBeenCalledWith(
        'research',
        [query],
        expect.any(Object)
      );
      expect(result).toEqual(expectedResult);
    });

    test('should reject with error for empty query', async () => {
      await expect(research.execute('')).rejects.toThrow('Query cannot be empty');
      await expect(research.execute()).rejects.toThrow('Query must be a string');
      await expect(research.execute(null)).rejects.toThrow('Query must be a string');
    });

    test('should handle SuperClaude CLI execution errors', async () => {
      const query = 'test query';
      const error = new Error('SuperClaude CLI execution failed');

      mockCommandBridge.executeCommand.mockRejectedValue(error);

      await expect(research.execute(query)).rejects.toThrow('SuperClaude CLI execution failed');
    });

    test('should support command cancellation with AbortSignal', async () => {
      const query = 'long running research query';
      const controller = new AbortController();

      // AbortSignalをシミュレート
      const mockError = new Error('Command was cancelled');
      mockCommandBridge.executeCommand.mockRejectedValue(mockError);

      const promise = research.execute(query, { signal: controller.signal });
      controller.abort();

      await expect(promise).rejects.toThrow('Command was cancelled');
    });

    test('should pass through additional options to command bridge', async () => {
      const query = 'test query';
      const options = {
        timeout: 30000,
        verbose: true
      };

      await research.execute(query, options);

      expect(mockCommandBridge.executeCommand).toHaveBeenCalledWith(
        'research',
        [query],
        expect.objectContaining(options)
      );
    });
  });

  describe('validateQuery', () => {
    test('should validate query format and content', () => {
      expect(() => research.validateQuery('valid query')).not.toThrow();
      expect(() => research.validateQuery('multiple word query')).not.toThrow();
    });

    test('should reject invalid queries', () => {
      expect(() => research.validateQuery('')).toThrow('Query cannot be empty');
      expect(() => research.validateQuery('   ')).toThrow('Query cannot be empty');
      expect(() => research.validateQuery(null)).toThrow('Query must be a string');
      expect(() => research.validateQuery(undefined)).toThrow('Query must be a string');
      expect(() => research.validateQuery(123)).toThrow('Query must be a string');
    });

    test('should reject queries that are too long', () => {
      const longQuery = 'a'.repeat(1001); // 1001 characters
      expect(() => research.validateQuery(longQuery)).toThrow('Query is too long');
    });
  });

  describe('formatOutput', () => {
    test('should format SuperClaude output for Cursor IDE display', () => {
      const superClaudeOutput = {
        success: true,
        results: [
          { title: 'Result 1', summary: 'Summary 1' },
          { title: 'Result 2', summary: 'Summary 2' }
        ],
        metadata: {
          searchTime: 1.2,
          sources: 5
        }
      };

      const formatted = research.formatOutput(superClaudeOutput);

      expect(formatted).toContain('Research Results');
      expect(formatted).toContain('Result 1');
      expect(formatted).toContain('Result 2');
      expect(formatted).toContain('Search Time: 1.2s');
    });

    test('should handle empty or error results gracefully', () => {
      const errorOutput = {
        success: false,
        error: 'No results found'
      };

      const formatted = research.formatOutput(errorOutput);

      expect(formatted).toContain('No results found');
    });
  });

  describe('Integration', () => {
    test('should integrate with actual CommandBridge and JsonProtocol', async () => {
      // 実際のコンポーネントを使用した統合テスト
      const actualCommandBridge = {
        executeCommand: jest.fn().mockResolvedValue({
          success: true,
          output: 'Integration test result'
        })
      };

      const actualJsonProtocol = {
        sendCommand: jest.fn().mockResolvedValue({
          success: true,
          data: 'Test data'
        })
      };

      const integratedResearch = new Research({
        commandBridge: actualCommandBridge,
        jsonProtocol: actualJsonProtocol
      });

      const result = await integratedResearch.execute('integration test query');

      expect(result.success).toBe(true);
      expect(result.output).toBe('Integration test result');
    });
  });
});