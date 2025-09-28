/**
 * Research Command Implementation
 * Handles /sc:research command execution through SuperClaude CLI
 */

export default class Research {
  constructor(dependencies = {}) {
    if (!dependencies.commandBridge && !dependencies.jsonProtocol) {
      throw new Error('Required dependencies not provided');
    }

    if (!dependencies.commandBridge) {
      throw new Error('CommandBridge is required');
    }

    if (!dependencies.jsonProtocol) {
      throw new Error('JsonProtocol is required');
    }

    this.commandBridge = dependencies.commandBridge;
    this.jsonProtocol = dependencies.jsonProtocol;
  }

  async execute(query, options = {}) {
    this.validateQuery(query);

    const result = await this.commandBridge.executeCommand(
      'research',
      [query],
      options
    );

    return result;
  }

  validateQuery(query) {
    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }

    if (!query || query.trim() === '') {
      throw new Error('Query cannot be empty');
    }

    if (query.length > 1000) {
      throw new Error('Query is too long');
    }
  }

  formatOutput(superClaudeOutput) {
    if (!superClaudeOutput.success) {
      return superClaudeOutput.error || 'No results found';
    }

    let formatted = '# Research Results\n\n';

    if (superClaudeOutput.results) {
      superClaudeOutput.results.forEach(result => {
        formatted += `## ${result.title}\n${result.summary}\n\n`;
      });
    }

    if (superClaudeOutput.metadata) {
      formatted += `Search Time: ${superClaudeOutput.metadata.searchTime}s\n`;
    }

    return formatted;
  }
}