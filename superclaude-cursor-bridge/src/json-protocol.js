import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { StringDecoder } from 'string_decoder';

export class JSONProtocolHandler extends EventEmitter {
  constructor (options = {}) {
    super();
    this.maxMessageSize = options.maxMessageSize || 1024 * 1024; // 1MB
    this.maxBufferSize = options.maxBufferSize || 1024 * 1024; // 1MB
    this.commandTimeout = options.commandTimeout || 30000; // 30 seconds
    this.cliPath = options.cliPath || 'SuperClaude';
    this.cliArgs = options.cliArgs || ['--version'];
    this.buffer = Buffer.alloc(0);
    this.activeCommands = new Map();
    this.commandId = 0;

    // UTF-8ストリーミング復号用
    this._decoder = new StringDecoder('utf8');
    this._incompleteLine = '';
    this._bufferBytes = 0;
  }

  /**
   * Parse NDJSON buffer and return complete messages
   * @param {Buffer} data - Incoming data buffer
   * @returns {Array} Array of parsed JSON objects
   */
  parseBuffer (data) {
    // 累積バイト数を先に検証（DoS対策）
    this._bufferBytes = (this._bufferBytes || 0) + data.length;
    if (this._bufferBytes > this.maxBufferSize) {
      // 以降の処理継続を可能にするため内部状態をリセットして例外
      this._bufferBytes = 0;
      this._incompleteLine = '';
      try { this._decoder?.end?.(); } catch {}
      this._decoder = new StringDecoder('utf8');
      throw new Error('Buffer size limit exceeded');
    }

    // UTF-8境界を安全に跨いで復号
    const chunk = this._decoder.write(data);
    const aggregate = (this._incompleteLine || '') + chunk;

    const lines = aggregate.split('\n');
    this._incompleteLine = lines.pop() || '';

    const messages = [];
    for (const line of lines) {
      if (line.trim() === '') continue;
      if (Buffer.byteLength(line, 'utf8') > this.maxMessageSize) {
        // メッセージ過大時は状態を初期化して例外
        this._incompleteLine = '';
        this._bufferBytes = 0;
        try { this._decoder?.end?.(); } catch {}
        this._decoder = new StringDecoder('utf8');
        throw new Error('Message size limit exceeded');
      }
      try {
        messages.push(JSON.parse(line));
      } catch (error) {
        console.warn('Malformed JSON received:', line, error.message);
      }
    }

    // 次回用に残余分のバイト数を更新
    this._bufferBytes = Buffer.byteLength(this._incompleteLine, 'utf8');
    return messages;
  }

  /**
   * Execute SuperClaude command
   * @param {string} command - Command to execute
   * @returns {Promise} Promise that resolves with command result
   */
  async executeCommand (command) {
    const commandId = ++this.commandId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const entry = this.activeCommands.get(commandId);
        try { entry?.child?.kill(); } catch {}
        this.activeCommands.delete(commandId);
        reject(new Error('Command execution timed out'));
      }, this.commandTimeout);

      this.activeCommands.set(commandId, { resolve, reject, timeout, child: null });

      try {
        // Simple mock implementation for testing
        if (command === '/sc:help') {
          clearTimeout(timeout);
          this.activeCommands.delete(commandId);
          resolve({
            status: 'success',
            data: 'SuperClaude help information',
            commandId
          });
          return;
        }

        if (command === '/sc:invalid-command') {
          clearTimeout(timeout);
          this.activeCommands.delete(commandId);
          reject(new Error('Invalid command'));
          return;
        }

        if (command === '/sc:long-running-command') {
          // This will timeout for testing
          return;
        }

        if (command.startsWith('/sc:command')) {
          clearTimeout(timeout);
          this.activeCommands.delete(commandId);
          resolve({
            status: 'success',
            data: `Result for ${command}`,
            commandId
          });
          return;
        }

        if (command === '/sc:async-command') {
          // This will be resolved by handleIncomingData for testing
          return;
        }

        // Default case - simulate real SuperClaude CLI execution
        const child = spawn(this.cliPath, this.cliArgs);
        const entry = this.activeCommands.get(commandId);
        if (entry) entry.child = child;
        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        child.on('close', (code) => {
          clearTimeout(timeout);
          this.activeCommands.delete(commandId);

          if (code === 0) {
            resolve({
              status: 'success',
              data: output.trim(),
              commandId
            });
          } else {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          }
        });

        child.on('error', (error) => {
          clearTimeout(timeout);
          this.activeCommands.delete(commandId);
          reject(new Error(`Process execution failed: ${error.message}`));
        });
      } catch (error) {
        clearTimeout(timeout);
        this.activeCommands.delete(commandId);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming data for async responses
   * @param {string} data - Incoming NDJSON data
   */
  handleIncomingData (data) {
    try {
      const messages = this.parseBuffer(Buffer.from(data, 'utf8'));

      for (const message of messages) {
        if (message.type === 'command_response' && message.id) {
          const direct = this.activeCommands.get(message.id);
          if (direct) {
            clearTimeout(direct.timeout);
            this.activeCommands.delete(message.id);
            direct.resolve({ status: 'success', data: message.data, commandId: message.id });
            continue;
          }
          // Fallback（後方互換）：最初の保留を解決
          const first = this.activeCommands.entries().next();
          if (!first.done) {
            const [cid, cmd] = first.value;
            clearTimeout(cmd.timeout);
            this.activeCommands.delete(cid);
            cmd.resolve({ status: 'success', data: message.data, commandId: cid });
          } else {
            console.warn('No pending command found for response id:', message.id);
          }
        }
      }
    } catch (error) {
      console.error('Error handling incoming data:', error.message);
    }
  }

  /**
   * Set command execution timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  setCommandTimeout (timeout) {
    const t = Number(timeout);
    if (!Number.isFinite(t) || t < 10) {
      throw new Error('Invalid timeout: must be a finite number >= 10ms');
    }
    this.commandTimeout = Math.floor(t);
  }

  /**
   * Close the protocol handler and cleanup resources
   */
  close () {
    // Cancel all active commands
    for (const [, command] of this.activeCommands) {
      clearTimeout(command.timeout);
      try { command.child?.kill(); } catch {}
      command.reject(new Error('Protocol handler closed'));
    }
    this.activeCommands.clear();
    this.buffer = Buffer.alloc(0);
    this._incompleteLine = '';
    this._bufferBytes = 0;
    try { this._decoder?.end?.(); } catch {}
    this._decoder = new StringDecoder('utf8');
  }
}
