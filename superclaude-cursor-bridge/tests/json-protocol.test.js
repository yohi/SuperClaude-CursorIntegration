import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { JSONProtocolHandler } from '../src/json-protocol.js';

describe('JSON Protocol Handler', () => {
  let handler;

  beforeEach(() => {
    handler = new JSONProtocolHandler();
  });

  afterEach(() => {
    if (handler) {
      handler.close();
    }
  });

  describe('NDJSON Message Parsing', () => {
    test('should parse single complete JSON message', async () => {
      const testMessage = { type: 'response', data: 'test' };
      const ndjsonData = JSON.stringify(testMessage) + '\n';

      const messages = handler.parseBuffer(Buffer.from(ndjsonData, 'utf8'));

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(testMessage);
    });

    test('should parse multiple complete JSON messages', async () => {
      const message1 = { type: 'response', data: 'test1' };
      const message2 = { type: 'response', data: 'test2' };
      const ndjsonData = JSON.stringify(message1) + '\n' + JSON.stringify(message2) + '\n';

      const messages = handler.parseBuffer(Buffer.from(ndjsonData, 'utf8'));

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(message1);
      expect(messages[1]).toEqual(message2);
    });

    test('should handle partial messages across multiple reads', async () => {
      const testMessage = { type: 'response', data: 'test' };
      const completeMessage = JSON.stringify(testMessage) + '\n';
      const firstPart = completeMessage.slice(0, 10);
      const secondPart = completeMessage.slice(10);

      // First partial read
      let messages = handler.parseBuffer(Buffer.from(firstPart, 'utf8'));
      expect(messages).toHaveLength(0); // No complete messages yet

      // Second read completes the message
      messages = handler.parseBuffer(Buffer.from(secondPart, 'utf8'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(testMessage);
    });

    test('should handle UTF-8 character boundaries correctly', async () => {
      // テスト用の日本語メッセージ
      const testMessage = { type: 'response', data: '日本語テスト' };
      const completeMessage = JSON.stringify(testMessage) + '\n';
      const buffer = Buffer.from(completeMessage, 'utf8');

      // UTF-8文字の途中で分割
      const firstPart = buffer.slice(0, buffer.length - 5);
      const secondPart = buffer.slice(buffer.length - 5);

      // First partial read
      let messages = handler.parseBuffer(firstPart);
      expect(messages).toHaveLength(0);

      // Second read completes the message
      messages = handler.parseBuffer(secondPart);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(testMessage);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      const malformedData = '{ "type": "response", "data":' + '\n'; // Invalid JSON

      expect(() => {
        handler.parseBuffer(Buffer.from(malformedData, 'utf8'));
      }).not.toThrow();

      // Should still be able to process valid messages after error
      const validMessage = { type: 'response', data: 'valid' };
      const validData = JSON.stringify(validMessage) + '\n';
      const messages = handler.parseBuffer(Buffer.from(validData, 'utf8'));

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(validMessage);
    });

    test('should enforce maximum message size limits', async () => {
      // Create a handler with smaller limits for testing
      const testHandler = new JSONProtocolHandler({
        maxMessageSize: 1000, // 1KB limit
        maxBufferSize: 2000 // 2KB buffer limit
      });

      const largeMessage = {
        type: 'response',
        data: 'x'.repeat(1001) // Exceed 1KB message limit but under buffer limit
      };
      const largeData = JSON.stringify(largeMessage) + '\n';

      expect(() => {
        testHandler.parseBuffer(Buffer.from(largeData, 'utf8'));
      }).toThrow(/Message size limit exceeded/);

      testHandler.close();
    });

    test('should enforce buffer size limits to prevent DoS', async () => {
      // Create a message without newline that exceeds buffer limit
      const oversizedData = 'x'.repeat(2 * 1024 * 1024); // 2MB without newline

      expect(() => {
        handler.parseBuffer(Buffer.from(oversizedData, 'utf8'));
      }).toThrow(/Buffer size limit exceeded/);
    });
  });

  describe('SuperClaude CLI Integration', () => {
    test('should return help info (mock path)', async () => {
      const result = await handler.executeCommand('/sc:help');

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
    });

    test('should handle command execution timeout', async () => {
      // Set short timeout for testing
      handler.setCommandTimeout(100);

      await expect(
        handler.executeCommand('/sc:long-running-command')
      ).rejects.toThrow(/Command execution timed out/);
    }, 10000);

    test('should handle process execution errors', async () => {
      await expect(
        handler.executeCommand('/sc:invalid-command')
      ).rejects.toThrow();
    });
  });

  describe('Async Response Handling', () => {
    test('should handle asynchronous responses', async () => {
      const commandPromise = handler.executeCommand('/sc:async-command');

      // Simulate async response
      setTimeout(() => {
        const response = { type: 'command_response', id: 'test', data: 'async result' };
        handler.handleIncomingData(JSON.stringify(response) + '\n');
      }, 100);

      const result = await commandPromise;
      expect(result.data).toBe('async result');
    });

    test('should handle multiple concurrent commands', async () => {
      const promises = [
        handler.executeCommand('/sc:command1'),
        handler.executeCommand('/sc:command2'),
        handler.executeCommand('/sc:command3')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('success');
      });
    });
  });
});
