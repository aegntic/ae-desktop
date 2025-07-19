# Claude Code Enhancer for ae-desktop

This package provides seamless integration between ae-desktop and Claude Code, enabling enhanced coding experiences without requiring Claude Code to be bundled within ae-desktop.

## Features

- **Smart Detection**: Automatically detects if Claude Code is installed locally
- **Coding Task Recognition**: Identifies when users request coding help
- **Context Sharing**: Provides ae-desktop context to Claude Code for better assistance
- **Knowledge Graph Integration**: Tracks coding actions in Graphiti
- **Non-Intrusive**: Remains dormant until coding tasks are detected

## How It Works

1. **Detection**: When a user asks for coding help, the enhancer checks if Claude Code is installed
2. **Context Creation**: Builds rich context including recent actions, current project, and file information
3. **Suggestion**: Offers to launch Claude Code with ae-desktop enhancements
4. **Tracking**: Records coding actions in the knowledge graph for future reference

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐
│   ae-desktop GUI    │────▶│ Coding Task      │
│                     │     │ Trigger          │
└─────────────────────┘     └──────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ Claude Code      │
                            │ Detector         │
                            └──────────────────┘
                                     │
                            ┌────────┴─────────┐
                            ▼                  ▼
                    ┌──────────────┐   ┌──────────────┐
                    │ Not Installed │   │  Installed   │
                    │ Show Install  │   │ Create       │
                    │ Instructions  │   │ Context      │
                    └──────────────┘   └──────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ Launch Claude    │
                                    │ Code with        │
                                    │ Enhancements     │
                                    └──────────────────┘
```

## Usage

The enhancer is automatically initialized when ae-desktop starts. It monitors user input for coding-related requests and provides suggestions when appropriate.

### Coding Task Keywords

The enhancer recognizes various coding-related keywords:
- **Writing code**: "write code", "create function", "implement", "build class"
- **Debugging**: "debug", "fix bug", "error", "not working"
- **Refactoring**: "refactor", "improve code", "optimize", "clean up"
- **Code review**: "review code", "check code", "best practices"
- **Understanding**: "explain code", "how does", "what does this"

### Context Provided to Claude Code

When launching Claude Code, the enhancer provides:
- Current project path
- Active file being worked on
- Recent ae-desktop actions
- Session information
- SuperClaude integration status
- Available enhancements

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm dev
```

## Integration

This package is designed to work seamlessly with:
- **ae-desktop**: The main application
- **Graphiti**: For knowledge graph tracking
- **SuperClaude**: For enhanced AI capabilities
- **Claude Code**: The external coding assistant

## License

Apache-2.0