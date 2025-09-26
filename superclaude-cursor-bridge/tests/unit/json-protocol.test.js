import { JSONProtocolHandler } from '../../src/json-protocol.js';
import { jest } from '@jest/globals';

describe('Task 2.1: JSON Protocol Handler - 受入基準テスト', () => {
  let jsonProtocol;

  beforeEach(() => {
    jsonProtocol = new JSONProtocolHandler();
  });

  afterEach(() => {
    if (jsonProtocol) {
      jsonProtocol.close();
    }
  });

  describe('JSON形式でのリクエスト/レスポンス処理が実装済み', () => {
    test('JSON形式のコマンドを実行できる', async () => {
      const result = await jsonProtocol.executeCommand('/sc:help');

      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('commandId');
    });

    test('NDJSON形式のレスポンスを正しく解析する', () => {
      const testData = '{"type": "response", "data": "test"}\n{"type": "response", "data": "test2"}\n';
      const messages = jsonProtocol.parseBuffer(Buffer.from(testData));

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ type: 'response', data: 'test' });
      expect(messages[1]).toEqual({ type: 'response', data: 'test2' });
    });

    test('不完全なJSONメッセージを適切に処理する', () => {
      // 最初のチャンクは不完全
      const chunk1 = '{"type": "resp';
      const messages1 = jsonProtocol.parseBuffer(Buffer.from(chunk1));
      expect(messages1).toHaveLength(0);

      // 2番目のチャンクで完了
      const chunk2 = 'onse", "data": "test"}\n';
      const messages2 = jsonProtocol.parseBuffer(Buffer.from(chunk2));
      expect(messages2).toHaveLength(1);
      expect(messages2[0]).toEqual({ type: 'response', data: 'test' });
    });
  });

  describe('非同期処理による応答性の確保', () => {
    test('複数の並行コマンドを処理できる', async () => {
      const promise1 = jsonProtocol.executeCommand('/sc:command1');
      const promise2 = jsonProtocol.executeCommand('/sc:command2');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.status).toBe('success');
      expect(result2.status).toBe('success');
      expect(result1.commandId).not.toBe(result2.commandId);
    });

    test('非同期レスポンスを正しく処理する', async () => {
      // 非同期コマンドを開始
      const commandPromise = jsonProtocol.executeCommand('/sc:async-command');

      // 模擬的な非同期レスポンスを送信
      setTimeout(() => {
        jsonProtocol.handleIncomingData('{"type": "command_response", "id": 1, "data": "async result"}\n');
      }, 10);

      const result = await commandPromise;
      expect(result.status).toBe('success');
      expect(result.data).toBe('async result');
    });
  });

  describe('エラーハンドリングと適切なエラーメッセージ', () => {
    test('不正なコマンドで適切なエラーが発生する', async () => {
      await expect(jsonProtocol.executeCommand('/sc:invalid-command'))
        .rejects.toThrow('Invalid command');
    });

    test('タイムアウトエラーが適切に処理される', async () => {
      // 短いタイムアウトを設定
      jsonProtocol.setCommandTimeout(100);

      await expect(jsonProtocol.executeCommand('/sc:long-running-command'))
        .rejects.toThrow('Command execution timed out');
    }, 200);

    test('バッファサイズ制限超過でエラーが発生する', () => {
      const largeData = 'x'.repeat(jsonProtocol.maxBufferSize + 1);

      expect(() => {
        jsonProtocol.parseBuffer(Buffer.from(largeData));
      }).toThrow('Buffer size limit exceeded');
    });

    test('不正なJSON形式のデータを適切に処理する', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const messages = jsonProtocol.parseBuffer(Buffer.from('invalid json\n'));

      expect(messages).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Malformed JSON received:',
        'invalid json',
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('ログ機能の実装', () => {
    test('デバッグモードでログが出力される', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // 不正なJSONでログ出力をテスト
      jsonProtocol.parseBuffer(Buffer.from('invalid\n'));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('エラー処理でログが出力される', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // handleIncomingDataで例外を発生させる
      jsonProtocol.handleIncomingData('x'.repeat(jsonProtocol.maxBufferSize + 1));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error handling incoming data:',
        expect.any(String)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('リソース管理', () => {
    test('closeメソッドでリソースが適切に解放される', () => {
      // アクティブなコマンドをセットアップ
      const commandPromise = jsonProtocol.executeCommand('/sc:long-running-command');

      // closeを呼び出し
      jsonProtocol.close();

      // アクティブなコマンドがクリアされることを確認
      expect(jsonProtocol.activeCommands.size).toBe(0);

      // 未完了のコマンドがエラーになることを確認
      return expect(commandPromise).rejects.toThrow('Protocol handler closed');
    });
  });
});
