/**
 * Cursor Bridge Core
 * Cursor IDEとSuperClaude CLIを繋ぐ統合レイヤー
 */

import CommandBridge from './command-bridge.js';
import ConfigManager from './config-manager.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * CursorBridge クラス
 * Cursor IDEのチャットコマンドシステムとSuperClaude CLIの橋渡しを行う
 */
class CursorBridge {
  /**
   * CursorBridge のコンストラクタ
   * @param {Object} config - 設定オプション
   * @param {Object} dependencies - 依存関係の注入（テスト用）
   */
  constructor(config = {}, dependencies = {}) {
    try {
      this.config = {
        timeout: 30000, // デフォルト30秒タイムアウト
        maxSessions: 100, // 最大セッション数
        sessionTimeout: 3600000, // セッションタイムアウト（1時間）
        ...config
      };

      // 依存コンポーネントの初期化（依存性注入対応）
      this.commandBridge = dependencies.commandBridge || new CommandBridge();
      this.configManager = dependencies.configManager || new ConfigManager();

      // セッション管理
      this.sessions = new Map();
      this.runningCommands = new Map();

      // セッションクリーンアップのタイマー
      this.sessionCleanupInterval = setInterval(() => {
        this.cleanupSessions();
      }, 300000); // 5分ごとにクリーンアップ

      console.log('CursorBridge initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CursorBridge:', error.message);
      throw error;
    }
  }

  /**
   * Cursor IDEチャットコマンドとしてSuperClaudeコマンドを登録
   * @returns {Promise<Array>} 登録されたコマンドのリスト
   */
  async registerChatCommands() {
    try {
      // CommandBridgeが利用可能かチェック
      if (!this.commandBridge || typeof this.commandBridge.getAvailableCommands !== 'function') {
        throw new Error('CommandBridge not properly initialized');
      }

      const availableCommands = this.commandBridge.getAvailableCommands();

      // 結果が配列かチェック
      if (!Array.isArray(availableCommands)) {
        throw new Error('getAvailableCommands did not return an array');
      }

      // SuperClaudeコマンドをCursor IDEチャットコマンド形式に変換
      const chatCommands = availableCommands.map(commandName => ({
        name: `/sc:${commandName}`,
        description: `SuperClaude ${commandName} command`,
        handler: async (args) => this.dispatchCommand(commandName, args)
      }));

      console.log(`Registered ${chatCommands.length} SuperClaude commands`);
      return chatCommands;

    } catch (error) {
      console.error('Failed to register chat commands:', error.message);
      throw error;
    }
  }

  /**
   * コマンドをCommandBridgeにディスパッチ
   * @param {string} commandName - コマンド名
   * @param {Array} args - コマンド引数
   * @param {Object} options - 実行オプション
   * @returns {Promise<Object>} 実行結果
   */
  async dispatchCommand(commandName, args = [], options = {}) {
    try {
      // 入力検証
      if (!commandName || typeof commandName !== 'string') {
        throw new Error('Command name must be a non-empty string');
      }
      if (!Array.isArray(args)) {
        throw new Error('args must be an array');
      }

      // CommandBridgeが利用可能かチェック
      if (!this.commandBridge || typeof this.commandBridge.validateCommand !== 'function') {
        throw new Error('CommandBridge not properly initialized');
      }

      // コマンドの妥当性をチェック
      if (!this.commandBridge.validateCommand(commandName)) {
        throw new Error(`Invalid command: ${commandName}`);
      }

      // コマンド実行の開始をログ
      console.log(
        `Dispatching command: ${commandName} (args count: ${
          Array.isArray(args) ? args.length : 'n/a'
        })`
      );

      // 進行状況のコールバック設定
      const onProgress = options.onProgress || (() => {});

      // AbortControllerを作成して実行中コマンドとして登録
      const controller = new AbortController();
      this.runningCommands.set(commandName, controller);

      try {
        // コマンドを実行
        const result = await this.commandBridge.executeCommand(commandName, args, { signal: controller.signal });

        console.log(`Command ${commandName} completed successfully`);
        return result;
      } finally {
        // 実行完了時にrunningCommandsから削除
        this.runningCommands.delete(commandName);
      }

    } catch (error) {
      console.error(`Command execution failed: ${commandName}`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 結果をCursor UI用にフォーマット
   * @param {Object} result - コマンド実行結果
   * @returns {Object} フォーマット済み結果
   */
  formatForUI(result) {
    if (!result) {
      return {
        displayText: 'No result available',
        metadata: { type: 'error' }
      };
    }

    if (result.success) {
      return {
        displayText: this._formatSuccessResult(result.result),
        metadata: {
          type: 'success',
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        displayText: `Error: ${result.error}`,
        metadata: {
          type: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 新しいセッションを作成
   * @returns {string} セッションID
   */
  createSession() {
    // 上限制御：期限切れ掃除→最古のセッションを退避
    if (this.sessions.size >= this.config.maxSessions) {
      this.cleanupSessions(false);
      if (this.sessions.size >= this.config.maxSessions) {
        let oldestId = null;
        let oldestTs = Number.POSITIVE_INFINITY;
        for (const [id, s] of this.sessions) {
          if (s.lastActivity < oldestTs) {
            oldestTs = s.lastActivity;
            oldestId = id;
          }
        }
        if (oldestId) {
          this.sessions.delete(oldestId);
          console.log(`Evicted oldest session to respect maxSessions: ${oldestId}`);
        }
      }
    }

    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      data: {}
    };

    this.sessions.set(sessionId, session);
    console.log(`Created new session: ${sessionId}`);
    return sessionId;
  }

  /**
   * セッションデータを設定
   * @param {string} sessionId - セッションID
   * @param {Object} data - セッションデータ
   */
  setSessionData(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.data = { ...session.data, ...data };
      session.lastActivity = Date.now();
    }
  }

  /**
   * セッションデータを取得
   * @param {string} sessionId - セッションID
   * @returns {Object} セッションデータ
   */
  getSessionData(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.data : undefined;
  }

  /**
   * 期限切れセッションをクリーンアップ
   * @param {boolean} forceAll - 全セッションを強制削除するか
   */
  cleanupSessions(forceAll = false) {
    const now = Date.now();
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessions) {
      // 強制削除または期限切れかチェック
      if (forceAll || (now - session.lastActivity > this.config.sessionTimeout)) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
      console.log(`Cleaned up ${forceAll ? 'session' : 'expired session'}: ${sessionId}`);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} ${forceAll ? 'sessions' : 'expired sessions'}`);
    }
  }

  /**
   * 実行中のコマンドをキャンセル
   * @param {string} commandName - キャンセルするコマンド名
   */
  cancelCommand(commandName) {
    const controller = this.runningCommands.get(commandName);
    if (controller) {
      controller.abort();
      this.runningCommands.delete(commandName);
      console.log(`Command ${commandName} cancelled`);
      return { success: true, message: `Command ${commandName} cancelled` };
    }
    return { success: false, message: `Command ${commandName} not found` };
  }

  /**
   * 成功結果をフォーマット（プライベートメソッド）
   * @param {*} result - 結果データ
   * @returns {string} フォーマット済みテキスト
   */
  _formatSuccessResult(result) {
    if (typeof result === 'string') {
      return result;
    }

    if (typeof result === 'object') {
      if (result.findings && result.summary) {
        // コードレビュー結果の場合
        return `${result.summary}\n\nFindings:\n${result.findings.join('\n')}`;
      }

      return JSON.stringify(result, null, 2);
    }

    return String(result);
  }

  /**
   * CursorBridge インスタンスを破棄
   */
  destroy() {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    this.sessions.clear();
    this.runningCommands.clear();

    console.log('CursorBridge destroyed');
  }
}

export default CursorBridge;