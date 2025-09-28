/**
 * Review Command Implementation
 * Handles /sc:review command execution through SuperClaude CLI
 */

export default class Review {
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

    const result = await this.commandBridge.executeCommand(
      'review',
      [target],
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
      return superClaudeOutput.error || 'Review failed';
    }

    let formatted = '# Review Results\n\n';

    if (superClaudeOutput.review) {
      formatted += `## Overall Rating: ${superClaudeOutput.review.rating}/10\n\n`;
      formatted += `## Comments\n${superClaudeOutput.review.comments}\n\n`;

      if (superClaudeOutput.review.suggestions) {
        formatted += '## Suggestions\n';
        superClaudeOutput.review.suggestions.forEach(suggestion => {
          formatted += `- ${suggestion}\n`;
        });
      }
    }

    return formatted;
  }
}