/**
 * Analyze Command Implementation
 * Handles /sc:analyze command execution through SuperClaude CLI
 */

export default class Analyze {
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

  async execute(target, options = {}) {
    this.validateTarget(target);

    const args = [target];
    if (options.depth) {
      args.push('--depth', options.depth.toString());
    }

    const result = await this.commandBridge.executeCommand(
      'analyze',
      args,
      options
    );

    return result;
  }

  validateTarget(target) {
    if (typeof target !== 'string') {
      throw new Error('Target must be a string');
    }

    if (!target || target.trim() === '') {
      throw new Error('Target cannot be empty');
    }

    if (target.length > 500) {
      throw new Error('Target path is too long');
    }
  }

  formatOutput(superClaudeOutput) {
    if (!superClaudeOutput.success) {
      return superClaudeOutput.error || 'Analysis failed';
    }

    let formatted = '# Analysis Results\n\n';

    if (superClaudeOutput.analysis) {
      formatted += `## Summary\n${superClaudeOutput.analysis.summary}\n\n`;

      if (superClaudeOutput.analysis.issues) {
        formatted += '## Issues Found\n';
        superClaudeOutput.analysis.issues.forEach(issue => {
          formatted += `- ${issue.severity}: ${issue.description}\n`;
        });
        formatted += '\n';
      }
    }

    return formatted;
  }
}