# Installation Guide for CR (Claude Router)

## Quick Install from GitHub

Clone and install CR on any machine with these simple steps:

```bash
# 1. Clone the repository
git clone https://github.com/jerryzhao173985/ccr.git

# 2. Enter the directory
cd ccr

# 3. Install dependencies
npm install

# 4. Build the project
npm run build

# 5. Install globally
npm install -g .
```

That's it! You can now use the `cr` command.

## Verify Installation

After installation, verify everything works:

```bash
# Check version
cr version
# Output: CR (Claude Router) version: 2.0.0

# Check help
cr help

# Check status
cr status
```

## First Time Setup

1. **Start the service:**
   ```bash
   cr start
   ```

2. **Configure providers:**
   
   The default config file is created at `~/.claude-router/config.json`.
   
   Edit it to add your API keys:
   ```bash
   # Open config for editing
   nano ~/.claude-router/config.json
   ```
   
   Or use the UI:
   ```bash
   cr ui
   ```

3. **Test the router:**
   ```bash
   # Check if service is running
   cr status
   
   # Use with Claude Code
   export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
   claude "Hello, test message"
   
   # Or use directly
   cr code "Hello, test message"
   ```

## Configuration

### Basic Configuration

Create or edit `~/.claude-router/config.json`:

```json
{
  "LOG": true,
  "PORT": 3456,
  "HOST": "127.0.0.1",
  "Providers": [
    {
      "name": "openai",
      "api_base_url": "https://api.openai.com/v1/chat/completions",
      "api_key": "your-api-key-here",
      "models": ["gpt-4o", "gpt-4o-mini"],
      "transformer": {
        "use": ["openai"]
      }
    }
  ],
  "Router": {
    "default": "openai,gpt-4o"
  }
}
```

### Environment Variables

You can use environment variables in the config:

```json
{
  "api_key": "${OPENAI_API_KEY}"
}
```

Then set the environment variable:
```bash
export OPENAI_API_KEY=sk-...
```

## Available Commands

| Command | Description |
|---------|-------------|
| `cr start` | Start the router service |
| `cr stop` | Stop the router service |
| `cr restart` | Restart the router service |
| `cr status` | Check service status |
| `cr code "<prompt>"` | Execute Claude Code with a prompt |
| `cr ui` | Open the web UI configuration |
| `cr version` | Show version information |
| `cr help` | Show help information |

## Troubleshooting

### Issue: Build fails with "@musistudio/llms" error

The llms dependency is loaded from GitHub and marked as external. This is normal and the build should complete successfully.

### Issue: "cr: command not found"

Make sure npm's global bin directory is in your PATH:
```bash
export PATH="$PATH:$(npm config get prefix)/bin"
```

### Issue: Port 3456 already in use

Either stop the existing service:
```bash
cr stop
```

Or change the port in config:
```json
{
  "PORT": 3457
}
```

### Issue: Service won't start

Check the logs:
```bash
tail -f ~/.claude-router/claude-router.log
```

## System Requirements

- Node.js 16.0 or higher
- npm 7.0 or higher
- 500MB free disk space
- macOS, Linux, or Windows with WSL

## Features

- ✅ Multiple LLM provider support
- ✅ Intelligent routing based on context
- ✅ OpenAI Responses API v2 support
- ✅ O-series model support (o3, o4-mini)
- ✅ Structured output and JSON mode
- ✅ Web UI for configuration
- ✅ Custom transformers
- ✅ Token-based routing
- ✅ Background task routing

## Updating

To update to the latest version:

```bash
cd ccr
git pull
npm install
npm run build
npm install -g .
cr restart
```

## Uninstalling

To completely remove CR:

```bash
# Stop the service
cr stop

# Uninstall global package
npm uninstall -g @jerryzhao173985/claude-router

# Remove config directory (optional)
rm -rf ~/.claude-router
```

## Support

- Repository: https://github.com/jerryzhao173985/ccr
- Issues: https://github.com/jerryzhao173985/ccr/issues

## License

MIT