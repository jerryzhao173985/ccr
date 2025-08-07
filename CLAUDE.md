# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Build the project (CLI and UI)
npm run build

# Start the router server
ccr start

# Stop the router server
ccr stop

# Restart the router server
ccr restart

# Check server status
ccr status

# Open the UI configuration interface
ccr ui

# Run Claude Code through the router
ccr code "<your prompt>"

# View version
ccr version

# Display help
ccr help
```

### Release
```bash
# Build and publish a new version
npm run release
```

## Architecture

This is a TypeScript-based router for Claude Code requests that intelligently routes to different LLM providers based on custom rules, token counts, and specialized use cases.

### Core Components

**Request Flow**:
1. CLI command enters via `src/cli.ts` 
2. Server initialized by `src/index.ts` which manages process lifecycle
3. Fastify server (`src/server.ts`) handles HTTP requests
4. Router middleware (`src/utils/router.ts`) intercepts `/v1/messages` requests
5. Routing logic determines provider/model based on:
   - Token count thresholds (long context routing)
   - Model capabilities (thinking, web search)
   - Custom router scripts
   - Subagent model tags
6. Request forwarded to provider via `@musistudio/llms` dependency

**Key Files**:
- `src/cli.ts`: CLI entry point and command handler
- `src/index.ts`: Service initialization and lifecycle management
- `src/server.ts`: HTTP server and API endpoints
- `src/utils/router.ts`: Core routing logic and model selection
- `src/middleware/auth.ts`: API key authentication
- `src/utils/codeCommand.ts`: Claude Code command execution

### Configuration System

**Configuration Location**: `~/.claude-code-router/config.json`

The configuration uses JSON5 format (supports comments) with automatic backup rotation. Key sections:
- `Providers`: Array of LLM provider configurations with API endpoints, keys, and available models
- `Router`: Routing rules for different scenarios (default, background, think, longContext, webSearch)
- `transformer`: Request/response adaptations for provider compatibility
- `CUSTOM_ROUTER_PATH`: Optional JavaScript file for advanced routing logic

### UI System

The web UI (`/ui` directory) is a React 19 application built with:
- **Build**: Vite with single-file output plugin
- **Styling**: TailwindCSS v4 + Radix UI components  
- **State**: React Context for configuration management
- **I18n**: Support for English and Chinese

UI Components:
- `ui/src/pages/Dashboard.tsx`: Main configuration interface
- `ui/src/components/Providers.tsx`: Provider management
- `ui/src/components/Router.tsx`: Routing rules configuration
- `ui/src/components/JsonEditor.tsx`: Raw JSON editing

### Routing Strategy

The router uses multiple strategies to select the appropriate model:

1. **Token-based**: Routes to `longContext` model when tokens exceed threshold
2. **Model-specific**: Routes haiku models to `background`, reasoning models to `think`
3. **Tool-based**: Routes web search requests to `webSearch` model
4. **Subagent routing**: Extracts model from `<CCR-SUBAGENT-MODEL>` tags
5. **Custom router**: Executes user-defined JavaScript routing logic

### Transformer System

Transformers modify requests/responses for provider compatibility. They're configured in the provider's `transformer` field and can be:
- Global (applied to all models from a provider)
- Model-specific (applied to specific models)
- Parameterized (accept configuration options)

Built-in transformers include: `openrouter`, `deepseek`, `gemini`, `tooluse`, `maxtoken`, `enhancetool`, `reasoning`, `sampling`, `cleancache`, `vertex-gemini`

### Process Management

The service runs as a background daemon with:
- PID file tracking at `~/.claude-code-router/ccr.pid`
- Automatic cleanup on graceful shutdown
- Signal handling for SIGINT/SIGTERM
- Auto-start when running `ccr code` or `ccr ui`

### Build Process

The build script (`scripts/build.js`) handles:
1. CLI bundling with esbuild
2. WASM file copying for tiktoken
3. UI build with Vite
4. Distribution packaging in `/dist`

## Development Notes

- The project uses `@musistudio/llms` as a core dependency which wraps Fastify and provides LLM routing capabilities
- Token counting uses the `tiktoken` library with cl100k_base encoding
- Configuration supports JSON5 format for comments and trailing commas
- The UI is embedded as a single HTML file served by the main server
- No formal testing framework is currently implemented
- Authentication uses Bearer tokens or x-api-key headers when APIKEY is configured