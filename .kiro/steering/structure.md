# Project Structure

## Root Directory Organization

### Top-Level Structure
```
SuperClaudeForCursor/
├── .kiro/                          # Kiro spec-driven development framework
│   ├── specs/                      # Feature specifications
│   │   └── superclaude-cursor-integration/
│   └── steering/                   # Project guidance documents (this file)
├── superclaude-cursor-bridge/      # Main implementation directory
├── CLAUDE.md                       # Project-specific Claude instructions
├── README.md                       # Project overview and documentation
└── [Additional root files]         # Configuration, documentation
```

### Key Directory Descriptions

#### `.kiro/` - Specification Management
- **Purpose**: Kiro spec-driven development framework
- **Contents**: Specifications, steering documents, task tracking
- **Pattern**: Always at project root, contains project guidance
- **Access**: Referenced via `/kiro:*` commands

#### `superclaude-cursor-bridge/` - Implementation Core
- **Purpose**: Main Node.js Bridge implementation
- **Contents**: Source code, tests, configuration, dependencies
- **Pattern**: Self-contained Node.js package with standard structure
- **Access**: Primary development workspace

## Implementation Directory Structure

### Bridge Package Organization
```
superclaude-cursor-bridge/
├── package.json                    # Node.js package configuration
├── package-lock.json              # Dependency lock file
├── index.js                       # Main entry point
├── README.md                       # Bridge-specific documentation
├── .eslintrc.js                   # ESLint configuration
├── .prettierrc                    # Prettier formatting rules
├── jest.config.js                 # Jest testing configuration
├── src/                           # Source code directory
│   ├── cursor-bridge.js           # Cursor IDE integration layer
│   ├── command-bridge.js          # Command translation logic
│   ├── json-protocol.js           # IPC protocol handler
│   ├── config-manager.js          # Configuration management
│   └── utils/                     # Utility modules
├── commands/                      # Cursor Chat Commands
│   ├── research.js               # /sc:research command
│   ├── analyze.js                # /sc:analyze command
│   ├── review.js                 # /sc:review command
│   └── [25 SuperClaude commands] # Complete command set
├── config/                        # Configuration files
│   ├── superclaude-mapping.json  # Command mapping definition
│   └── default-settings.json     # Default configuration
├── tests/                         # Test suites
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── fixtures/                 # Test data and fixtures
├── docs/                          # Documentation
│   ├── installation.md          # Installation guide
│   ├── commands.md               # Command reference
│   └── api.md                    # API documentation
└── node_modules/                  # Dependencies (auto-generated)
```

## Code Organization Patterns

### Module Organization
- **Feature-based modules**: Each component encapsulates related functionality
- **Separation of concerns**: UI integration, command logic, IPC handled separately
- **Dependency injection**: Configuration and external dependencies injected
- **Error boundaries**: Each module handles its own errors with fallback

### File Naming Conventions

#### Source Files
```
kebab-case.js           # Primary naming convention
cursor-bridge.js        # Cursor IDE integration
command-bridge.js       # Command translation
json-protocol.js        # IPC protocol handler
config-manager.js       # Configuration management
```

#### Test Files
```
component-name.test.js  # Unit tests
component.integration.test.js  # Integration tests
component.e2e.test.js   # End-to-end tests
```

#### Configuration Files
```
kebab-case.json         # JSON configuration files
.dotfile                # Hidden configuration files
UPPERCASE.md            # Documentation files
```

#### Command Files
```
command-name.js         # Individual command implementations
index.js                # Command registry/barrel export
```

### Import Organization

#### Standard Import Order
```javascript
// 1. Node.js built-in modules
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 2. Third-party dependencies
const jest = require('jest');

// 3. Internal modules (relative imports)
const { JsonProtocol } = require('./json-protocol');
const { ConfigManager } = require('./config-manager');
const { commandMappings } = require('../config/superclaude-mapping.json');
```

#### Module Export Patterns
```javascript
// Named exports (preferred)
module.exports = {
  JsonProtocol,
  CommandBridge,
  ConfigManager
};

// Single export for main classes
module.exports = CursorBridge;

// Barrel exports for command modules
module.exports = require('./commands');
```

## Key Architectural Principles

### 1. Layer Separation
- **Presentation Layer**: Cursor IDE integration (`cursor-bridge.js`)
- **Business Logic Layer**: Command processing (`command-bridge.js`)
- **Data Layer**: Configuration and IPC (`config-manager.js`, `json-protocol.js`)
- **Utility Layer**: Shared utilities (`utils/`)

### 2. Single Responsibility Principle
- Each module handles one specific aspect of functionality
- Clear interfaces between modules
- Minimal coupling, high cohesion
- Easy to test and maintain independently

### 3. Configuration Management
```javascript
// Centralized configuration access
const config = ConfigManager.getInstance();
const superClaudePath = config.get('superclaude.cliPath');
const timeout = config.get('ipc.timeout');
```

### 4. Error Handling Strategy
```javascript
// Consistent error handling pattern
try {
  const result = await executeCommand(command, args);
  return { success: true, data: result };
} catch (error) {
  logger.error('Command execution failed', { command, error });
  return { success: false, error: error.message };
}
```

### 5. Async/Promise Pattern
```javascript
// Consistent async patterns
async function executeCommand(command, args) {
  const protocol = new JsonProtocol();
  return await protocol.sendCommand({ command, args });
}
```

## Testing Organization

### Test Structure Principles
```
tests/
├── unit/                          # Isolated component tests
│   ├── cursor-bridge.test.js     # Test cursor integration logic
│   ├── command-bridge.test.js    # Test command translation
│   └── json-protocol.test.js     # Test IPC protocol
├── integration/                   # Component interaction tests
│   ├── bridge-to-cli.test.js    # Bridge <-> CLI communication
│   └── end-to-end.test.js        # Full workflow tests
├── fixtures/                      # Test data and mocks
│   ├── mock-responses.json       # SuperClaude CLI mock responses
│   └── test-configs.json         # Test configuration data
└── helpers/                       # Test utilities
    ├── mock-superclaude.js       # SuperClaude CLI mock
    └── test-utils.js             # Common test utilities
```

### Test Naming Convention
- **Unit tests**: `ComponentName.test.js`
- **Integration tests**: `feature-integration.test.js`
- **E2E tests**: `workflow-e2e.test.js`
- **Mock helpers**: `mock-ComponentName.js`

## Configuration File Organization

### Configuration Hierarchy
```
config/
├── default-settings.json          # Default configuration values
├── superclaude-mapping.json      # Command mapping definitions
└── environment-specific/          # Environment overrides
    ├── development.json
    ├── testing.json
    └── production.json
```

### Configuration Access Pattern
```javascript
// Environment-aware configuration loading
const config = ConfigManager.load({
  environment: process.env.NODE_ENV || 'development',
  projectRoot: path.resolve(__dirname, '..'),
  superclaudeConfig: '.claude.json'
});
```

## Documentation Organization

### Documentation Structure
```
docs/
├── installation.md                # Setup and installation guide
├── commands.md                   # Command reference and examples
├── api.md                        # API documentation
├── development.md                # Development guidelines
├── troubleshooting.md           # Common issues and solutions
└── examples/                     # Code examples and tutorials
    ├── basic-usage.md
    ├── custom-commands.md
    └── integration-patterns.md
```

### README Structure Convention
```markdown
# Component Name
Brief description

## Installation
Setup instructions

## Usage
Basic usage examples

## API Reference
Interface documentation

## Contributing
Development guidelines

## License
License information
```

## Build and Distribution Structure

### Build Artifacts (if applicable)
```
dist/                              # Build output directory
├── index.js                      # Bundled main entry
├── commands/                     # Bundled command modules
└── package.json                  # Distribution package config
```

### Distribution Package
```
superclaude-cursor-bridge-v1.0.0/
├── index.js                      # Main entry point
├── src/                         # Source code
├── commands/                    # Command implementations
├── config/                      # Configuration files
├── docs/                        # Documentation
├── package.json                 # Package configuration
└── README.md                    # Installation and usage guide
```

## Integration Points Structure

### SuperClaude Configuration Integration
```
Project Root/
├── .claude.json                  # SuperClaude main config (shared)
├── settings.json                 # SuperClaude settings (shared)
├── CLAUDE.md                     # Project instructions (shared)
└── superclaude-cursor-bridge/   # Bridge implementation
    └── config/                   # Bridge-specific config
```

### Cursor IDE Integration Points
```
Cursor IDE/
├── chat-commands/               # Cursor IDE commands directory
│   └── superclaude-*            # Generated command files
├── extensions/                  # Cursor IDE extensions
└── user-settings/               # User-specific configuration
```

## Scalability Patterns

### Modular Command Structure
- **Plugin-based commands**: Easy addition of new commands
- **Command registry**: Central command discovery and loading
- **Dynamic loading**: Commands loaded on-demand
- **Extensibility**: Third-party command integration support

### Configuration Extensibility
- **Layer-based config**: Default < Environment < Project < User
- **Override patterns**: Clear precedence rules
- **Validation**: Schema-based configuration validation
- **Hot reload**: Runtime configuration updates

### Future Structure Considerations
- **Multi-platform support**: Structure ready for VS Code, other IDEs
- **Command marketplace**: Structure for community commands
- **Cloud integration**: Structure for remote SuperClaude execution
- **Performance optimization**: Structure for caching, optimization layers