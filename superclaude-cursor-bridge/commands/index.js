/**
 * Command Registry
 * Central registry for all SuperClaude command implementations
 */

import Research from './research.js';
import Analyze from './analyze.js';
import Review from './review.js';
import Explain from './explain.js';

export default class CommandRegistry {
  constructor(dependencies = {}) {
    this.commandBridge = dependencies.commandBridge;
    this.jsonProtocol = dependencies.jsonProtocol;

    this.commands = {
      research: new Research(dependencies),
      analyze: new Analyze(dependencies),
      review: new Review(dependencies),
      explain: new Explain(dependencies)
    };
  }

  getCommand(commandName) {
    const command = this.commands[commandName];
    if (!command) {
      throw new Error(`Command '${commandName}' not found`);
    }
    return command;
  }

  async executeCommand(commandName, ...args) {
    const command = this.getCommand(commandName);
    return await command.execute(...args);
  }

  getAvailableCommands() {
    return Object.keys(this.commands);
  }
}

export { Research, Analyze, Review, Explain };