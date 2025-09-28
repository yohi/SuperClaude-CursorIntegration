/**
 * Explain Command Implementation
 * Handles /sc:explain command execution through SuperClaude CLI
 */

export default class Explain {
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

  async execute(subject, options = {}) {
    this.validateSubject(subject);

    const result = await this.commandBridge.executeCommand(
      'explain',
      [subject],
      options
    );

    return result;
  }

  validateSubject(subject) {
    if (typeof subject !== 'string') {
      throw new Error('Subject must be a string');
    }

    if (!subject || subject.trim() === '') {
      throw new Error('Subject cannot be empty');
    }

    if (subject.length > 1000) {
      throw new Error('Subject is too long');
    }
  }

  formatOutput(superClaudeOutput) {
    if (!superClaudeOutput.success) {
      return superClaudeOutput.error || 'Explanation failed';
    }

    let formatted = '# Explanation\n\n';

    if (superClaudeOutput.explanation) {
      formatted += `## Overview\n${superClaudeOutput.explanation.overview}\n\n`;

      if (superClaudeOutput.explanation.details) {
        formatted += `## Details\n${superClaudeOutput.explanation.details}\n\n`;
      }

      if (superClaudeOutput.explanation.examples) {
        formatted += '## Examples\n';
        superClaudeOutput.explanation.examples.forEach(example => {
          formatted += `\`\`\`\n${example.code}\n\`\`\`\n${example.description}\n\n`;
        });
      }
    }

    return formatted;
  }
}