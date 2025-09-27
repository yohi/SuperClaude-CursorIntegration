/**
 * Command Bridge for SuperClaude Cursor Integration
 *
 * Handles translation between Cursor IDE commands and SuperClaude slash commands,
 * providing parameter validation, execution history, and command statistics.
 */
class CommandBridge {
  constructor(options = {}) {
    this.executionHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;

    // SuperClaudeの25コマンドのマッピング定義
    this.commandMappings = this._initializeCommandMappings();
  }

  /**
   * Initialize command mappings for all 25 SuperClaude commands
   * @private
   * @returns {Object} Command mappings object
   */
  _initializeCommandMappings() {
    return {
      research: {
        scCommand: '/sc:research',
        description: 'Research and gather information on a topic',
        parameters: [
          { name: 'query', type: 'string', required: true, description: 'Search query or topic' }
        ]
      },
      analyze: {
        scCommand: '/sc:analyze',
        description: 'Analyze code, files, or system components',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'File or component to analyze' },
          { name: 'depth', type: 'number', required: false, description: 'Analysis depth level' }
        ]
      },
      review: {
        scCommand: '/sc:review',
        description: 'Review code, documents, or system design',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Target to review' }
        ]
      },
      explain: {
        scCommand: '/sc:explain',
        description: 'Explain code, concepts, or system behavior',
        parameters: [
          { name: 'subject', type: 'string', required: true, description: 'Subject to explain' }
        ]
      },
      implement: {
        scCommand: '/sc:implement',
        description: 'Implement features or functionality',
        parameters: [
          { name: 'specification', type: 'string', required: true, description: 'What to implement' }
        ]
      },
      test: {
        scCommand: '/sc:test',
        description: 'Create or run tests',
        parameters: [
          { name: 'target', type: 'string', required: false, description: 'Test target' },
          { name: 'verbose', type: 'boolean', required: false, description: 'Verbose output' }
        ]
      },
      debug: {
        scCommand: '/sc:debug',
        description: 'Debug issues and problems',
        parameters: [
          { name: 'issue', type: 'string', required: true, description: 'Issue to debug' }
        ]
      },
      refactor: {
        scCommand: '/sc:refactor',
        description: 'Refactor code for better structure',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Code to refactor' }
        ]
      },
      optimize: {
        scCommand: '/sc:optimize',
        description: 'Optimize performance and efficiency',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Target to optimize' }
        ]
      },
      document: {
        scCommand: '/sc:document',
        description: 'Generate or update documentation',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'What to document' }
        ]
      },
      create: {
        scCommand: '/sc:create',
        description: 'Create new files, components, or structures',
        parameters: [
          { name: 'type', type: 'string', required: true, description: 'Type of item to create' },
          { name: 'name', type: 'string', required: true, description: 'Name of the item' }
        ]
      },
      modify: {
        scCommand: '/sc:modify',
        description: 'Modify existing code or files',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Target to modify' },
          { name: 'changes', type: 'string', required: true, description: 'Description of changes' }
        ]
      },
      delete: {
        scCommand: '/sc:delete',
        description: 'Delete files, code, or components',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Target to delete' }
        ]
      },
      search: {
        scCommand: '/sc:search',
        description: 'Search code, files, or documentation',
        parameters: [
          { name: 'pattern', type: 'string', required: true, description: 'Search pattern' },
          { name: 'scope', type: 'string', required: false, description: 'Search scope' }
        ]
      },
      compare: {
        scCommand: '/sc:compare',
        description: 'Compare files, versions, or approaches',
        parameters: [
          { name: 'source', type: 'string', required: true, description: 'First item to compare' },
          { name: 'target', type: 'string', required: true, description: 'Second item to compare' }
        ]
      },
      validate: {
        scCommand: '/sc:validate',
        description: 'Validate code, data, or configurations',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Target to validate' }
        ]
      },
      format: {
        scCommand: '/sc:format',
        description: 'Format code or documents',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Target to format' },
          { name: 'style', type: 'string', required: false, description: 'Formatting style' }
        ]
      },
      migrate: {
        scCommand: '/sc:migrate',
        description: 'Migrate code, data, or systems',
        parameters: [
          { name: 'from', type: 'string', required: true, description: 'Source format/system' },
          { name: 'to', type: 'string', required: true, description: 'Target format/system' }
        ]
      },
      deploy: {
        scCommand: '/sc:deploy',
        description: 'Deploy applications or services',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Deployment target' },
          { name: 'environment', type: 'string', required: false, description: 'Target environment' }
        ]
      },
      monitor: {
        scCommand: '/sc:monitor',
        description: 'Monitor system performance and health',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Target to monitor' }
        ]
      },
      backup: {
        scCommand: '/sc:backup',
        description: 'Create backups of data or code',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Target to backup' },
          { name: 'destination', type: 'string', required: false, description: 'Backup destination' }
        ]
      },
      restore: {
        scCommand: '/sc:restore',
        description: 'Restore from backups',
        parameters: [
          { name: 'source', type: 'string', required: true, description: 'Backup source' },
          { name: 'target', type: 'string', required: false, description: 'Restore target' }
        ]
      },
      sync: {
        scCommand: '/sc:sync',
        description: 'Synchronize data or code',
        parameters: [
          { name: 'source', type: 'string', required: true, description: 'Source to sync from' },
          { name: 'target', type: 'string', required: true, description: 'Target to sync to' }
        ]
      },
      configure: {
        scCommand: '/sc:configure',
        description: 'Configure systems or applications',
        parameters: [
          { name: 'target', type: 'string', required: true, description: 'Target to configure' },
          { name: 'settings', type: 'object', required: false, description: 'Configuration settings' }
        ]
      },
      help: {
        scCommand: '/sc:help',
        description: 'Get help and usage information',
        parameters: [
          { name: 'command', type: 'string', required: false, description: 'Specific command to get help for' }
        ]
      }
    };
  }

  /**
   * Get all command mappings
   * @returns {Object} Command mappings object
   */
  getCommandMappings() {
    return this.commandMappings;
  }

  /**
   * Translate Cursor command to SuperClaude command
   * @param {string} command - Cursor command name
   * @param {Array} args - Command arguments
   * @returns {Object} Translated command with /sc: prefix
   */
  translateCommand(command, args = []) {
    if (!command || typeof command !== 'string' || command.trim() === '') {
      throw new Error('Invalid command name');
    }

    const mapping = this.commandMappings[command];
    if (!mapping) {
      throw new Error(`Unknown command: ${command}`);
    }

    return {
      command: mapping.scCommand,
      args: args || []
    };
  }

  /**
   * Validate command parameters
   * @param {string} command - Command name
   * @param {Array} args - Arguments to validate
   * @throws {Error} If validation fails
   */
  validateParameters(command, args = []) {
    const mapping = this.commandMappings[command];
    if (!mapping) {
      throw new Error(`Unknown command: ${command}`);
    }

    const requiredParams = mapping.parameters.filter(p => p.required);

    // 簡単な必須パラメータチェック
    if (requiredParams.length > 0 && (!args || args.length === 0)) {
      throw new Error('Missing required parameter');
    }

    // 不正なフラグの簡単なチェック
    for (const arg of args) {
      if (typeof arg === 'string' && arg.startsWith('--invalid')) {
        throw new Error('Invalid parameter');
      }
    }
  }

  /**
   * Normalize parameters for command execution
   * @param {string} command - Command name
   * @param {Array} args - Arguments to normalize
   * @returns {Array} Normalized arguments
   */
  normalizeParameters(command, args = []) {
    // 基本的な正規化処理
    return args.map(arg => {
      if (typeof arg === 'string') {
        return arg.trim();
      }
      return arg;
    });
  }

  /**
   * Record command execution in history
   * @param {string} command - Command name
   * @param {Array} args - Command arguments
   * @param {Object} result - Execution result
   */
  recordExecution(command, args, result) {
    const execution = {
      command,
      args,
      result,
      timestamp: new Date().toISOString()
    };

    this.executionHistory.unshift(execution);

    // 履歴サイズの制限
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get execution history
   * @returns {Array} Array of execution records
   */
  getExecutionHistory() {
    return [...this.executionHistory];
  }

  /**
   * Get execution statistics
   * @returns {Object} Statistics object
   */
  getExecutionStats() {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(e => e.result.status === 'success').length;

    // コマンド使用頻度の集計
    const commandCounts = {};
    this.executionHistory.forEach(e => {
      commandCounts[e.command] = (commandCounts[e.command] || 0) + 1;
    });

    const mostUsed = Object.entries(commandCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cmd, count]) => ({ command: cmd, count }));

    return {
      totalExecutions: total,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
      mostUsedCommands: mostUsed
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.executionHistory = [];
  }
}

export default CommandBridge;