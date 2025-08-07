# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Repository Rules

**NEVER work on upstream repositories!**
- This is a FORK of musistudio/claude-code-router
- ONLY work on our fork: jerryzhao173985/ccr
- NEVER push to upstream (musistudio/claude-code-router)
- NEVER create pull requests to upstream
- All work happens on our fork's main branch
- Upstream is configured as fetch-only (push disabled)

## Commands

### Development
```bash
# Build the project (CLI and UI)
npm run build

# Start the router server
cr start

# Stop the router server
cr stop

# Restart the router server
cr restart

# Check server status
cr status

# Open the UI configuration interface
cr ui

# Run Claude Code through the router
cr code "<your prompt>"

# View version
cr version

# Display help
cr help
```

### Release
```bash
# Build and publish a new version
npm run release
```

## Architecture

This is a TypeScript-based router for Claude Code requests that intelligently routes to different LLM providers based on custom rules, token counts, and specialized use cases.

### Core Request Flow

The system intercepts OpenAI-compatible API requests and routes them through this pipeline:

1. **CLI Entry** (`src/cli.ts`): Commands spawn detached background processes or communicate with running service
2. **Service Initialization** (`src/index.ts`): 
   - Creates PID file at `~/.cr-router/.cr-router.pid`
   - Loads JSON5 config from `~/.cr-router/config.json`
   - Forces HOST=127.0.0.1 when no APIKEY configured
   - Registers signal handlers for graceful shutdown
3. **Fastify Server** (`src/server.ts`): Built on `@musistudio/llms` Server class
   - Exposes `/api/config`, `/api/transformers`, `/api/restart` endpoints
   - Serves React UI from `/ui/` path
   - Implements automatic config backup rotation (keeps 3 recent)
4. **Authentication Middleware** (`src/middleware/auth.ts`): Bearer token or x-api-key validation
5. **Router Middleware** (`src/utils/router.ts`): Model selection with priority hierarchy:
   - Custom router script (if `CUSTOM_ROUTER_PATH` configured)
   - Explicit "provider,model" format
   - Token-based routing (>60k tokens → longContext)
   - Subagent model extraction from `<CR-SUBAGENT-MODEL>` tags
   - Model-specific rules (haiku→background, thinking→think, web_search→webSearch)
   - Default fallback
6. **Transformer Pipeline**: Request/response modifications via `@musistudio/llms`
7. **Provider Forwarding**: HTTP proxy to selected LLM provider

### Token Counting Implementation

Uses `tiktoken` library with `cl100k_base` encoding:
- Counts message content (text, tool_use, tool_result types)
- Processes system messages (string or array format)
- Includes tool definitions (name, description, input_schema)
- WASM file (`tiktoken_bg.wasm`) bundled in distribution

### Configuration System

**Location**: `~/.cr-router/config.json` (JSON5 format with comments)

**Key Configuration Fields**:
- `Providers[]`: Array of provider configs with `name`, `api_base_url`, `api_key`, `models[]`, `transformer`
- `Router`: Routing rules - `default`, `background`, `think`, `longContext`, `webSearch`, `longContextThreshold`
- `CUSTOM_ROUTER_PATH`: Optional JavaScript file for custom routing logic
- `APIKEY`: Authentication for router API endpoints
- `HOST`: Server binding address (forced to 127.0.0.1 without APIKEY)
- `LOG`: Enable logging to `~/.claude-code-router/claude-code-router.log`
- `NON_INTERACTIVE_MODE`: For CI/CD environments (disables stdin)

### Transformer System

Transformers modify requests/responses for provider compatibility:

**Configuration Patterns**:
```json
// Global transformer for all models
"transformer": { "use": ["openrouter"] }

// Model-specific transformer
"transformer": {
  "use": ["deepseek"],
  "model-name": { "use": ["tooluse"] }
}

// Parameterized transformer
"transformer": {
  "use": [["maxtoken", { "max_tokens": 65536 }]]
}
```

**Built-in Transformers**: 
- `openrouter`, `deepseek`, `gemini` - Provider-specific adaptations
- `openai`, `openai-response-format` - OpenAI API with structured outputs support
- `predicted-output`, `explicit-predicted-output` - OpenAI predicted outputs (3x faster)
- `tooluse`, `maxtoken`, `enhancetool` - Tool and token management
- `reasoning`, `sampling`, `cleancache` - Request/response modifications
- `vertex-gemini`, `vertex-claude` - Vertex AI support

### Custom Router Scripts

JavaScript modules exporting async function:
```javascript
module.exports = async function router(req, config) {
  // req includes enhanced properties:
  // - req.body: Original request body
  // - req.tokenCount: Calculated token count
  // Return "provider,model" or null for default routing
}
```

### UI System

React 19 application (`/ui` directory):
- **Build**: Vite with `vite-plugin-singlefile` → single HTML output
- **State Management**: React Context (`ConfigProvider`) syncs with backend API
- **Styling**: TailwindCSS v4 + Radix UI components
- **i18n**: English/Chinese support via i18next
- **API Client**: Custom class with authentication and 401 handling
- **Components**:
  - `Dashboard.tsx`: Main configuration interface
  - `Providers.tsx`: Provider/model management
  - `Router.tsx`: Routing rules configuration
  - `JsonEditor.tsx`: Monaco editor for raw JSON

### Process Management

Daemon lifecycle handling:
- **PID Tracking**: `~/.cr-router/.cr-router.pid`
- **Reference Counting**: Tracks active CLI sessions
- **Auto-start**: `cr code` and `cr ui` start service if needed
- **Graceful Shutdown**: SIGINT/SIGTERM handlers with cleanup
- **Service Detection**: `process.kill(pid, 0)` for liveness check

### Build Process

`scripts/build.js` executes:
1. ESBuild bundles TypeScript CLI → `dist/cli.js`
2. Copies `tiktoken_bg.wasm` to dist
3. Installs UI dependencies if needed
4. Vite builds UI → single `dist/index.html`
5. Creates distribution structure:
   ```
   dist/
   ├── cli.js           # CLI entry point
   ├── index.html       # Complete UI
   └── tiktoken_bg.wasm # Token counting
   ```

### Subagent Model Routing

For subagent tasks, specify model with:
```
<CR-SUBAGENT-MODEL>provider,model</CR-SUBAGENT-MODEL>
Your subagent prompt here...
```
The tag is automatically removed before forwarding to provider.

### API Endpoints

- `GET /api/config`: Retrieve current configuration
- `POST /api/config`: Update configuration (with automatic backup)
- `GET /api/transformers`: List available transformers
- `POST /api/restart`: Restart service with new config
- `GET /ui/*`: Serve embedded React UI

### OpenAI Advanced Features Support

The router supports OpenAI's latest API features including the new Responses API:

**1. Responses API (v2 Transformer)**
- Full support for `/v1/responses` endpoint
- Continuous execution for multi-step tasks
- Complete tool calling capabilities
- Optimized for reasoning models (o3, o4-mini)
- See `docs/OPENAI_RESPONSES_API_IMPLEMENTATION.md` for details

**2. Structured Outputs (Response Format)**
- **json_object mode**: Ensures valid JSON output
- **json_schema mode**: Guarantees 100% schema compliance
- Automatic routing to compatible models

**3. Predicted Outputs**
- 3x faster response generation for code editing tasks
- Uses `prediction` parameter with expected content
- Ideal for code updates and document editing

**Configuration Example**:
```json
"Router": {
  "default": "openai-responses,gpt-4o",
  "structuredOutput": "openai-responses,o4-mini",
  "jsonMode": "openai-responses,gpt-4o",
  "predictedOutput": "openai-responses,gpt-4o",
  "reasoning": "openai-responses,o4-mini"
}
```

### Dependencies

- `@musistudio/llms@v1.0.19`: Core LLM routing, Fastify server, transformer system
- `tiktoken@^1.0.21`: Token counting with cl100k_base encoding
- `json5@^2.2.3`: Configuration parsing with comment support
- `fastify@^5.4.0`: HTTP server (via @musistudio/llms)
- `dotenv@^16.4.7`: Environment variable management

### Security Considerations

- API key stored in browser localStorage (UI)
- Forced localhost binding without APIKEY
- Bearer token or x-api-key header authentication
- No secrets in repository (use environment variables)

### Development Notes

- No formal testing framework implemented
- Logging enabled via `LOG: true` in config
- Hot reload via `/api/restart` endpoint
- UI development with Vite dev server
- Process inspection via PID file and status command