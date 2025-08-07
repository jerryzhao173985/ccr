# Claude Router (CR) - Migration Complete

## Overview
Successfully migrated from `ccr` to `cr` (Claude Router), creating a completely independent package that can coexist with the original.

## Package Details

### NPM Package
- **Name**: `@jerryzhao173985/claude-router`
- **Version**: `2.0.0`
- **Command**: `cr`
- **Repository**: `https://github.com/jerryzhao173985/ccr`

### Key Changes from Original

1. **Package Naming**
   - Original: `@musistudio/claude-code-router`
   - Ours: `@jerryzhao173985/claude-router`
   - ✅ Completely different package names - can be installed in parallel

2. **Command Line**
   - Original: `ccr`
   - Ours: `cr`
   - ✅ No command conflicts

3. **Configuration**
   - Original: `~/.claude-code-router/`
   - Ours: `~/.cr-router/`
   - ✅ Separate configuration directories

4. **Internal References**
   - All `CCR` references → `CR`
   - All `<CCR-SUBAGENT-MODEL>` → `<CR-SUBAGENT-MODEL>`
   - All documentation updated

## Enhanced Features

### OpenAI Responses API v2
- Full implementation without fallbacks
- Complete tool support (single, parallel, sequential)
- Continuous execution for multi-step tasks
- Smart finish_reason handling
- O-series model optimization

### Key Improvements
1. **Content Type Transformation**
   - `tool_result` → `input_text`
   - `tool_use` → `output_text`

2. **Continuous Execution**
   - `continuousExecution: true` by default
   - `alwaysContinueWithTools: true` by default
   - Models complete entire todo lists without stopping

3. **Model Support**
   - gpt-4o, gpt-4o-mini
   - o3, o3-mini, o4-mini
   - Reasoning model optimizations

## Installation

### Install Our Package
```bash
npm install -g @jerryzhao173985/claude-router
```

### Can Also Install Original (No Conflicts)
```bash
npm install -g @musistudio/claude-code-router
```

Both can coexist:
- Original uses `ccr` command
- Ours uses `cr` command

## Usage

```bash
# Start the service
cr start

# Check status
cr status

# Use with Claude Code
cr code "Your prompt here"

# Open configuration UI
cr ui

# Check version
cr version
```

## Configuration

Create `~/.cr-router/config.json`:

```json
{
  "LOG": true,
  "PORT": 3456,
  "Providers": [
    {
      "name": "openai-responses",
      "api_base_url": "https://api.openai.com/v1/responses",
      "api_key": "${OPENAI_API_KEY}",
      "models": ["gpt-4o", "o3", "o4-mini"],
      "transformer": {
        "use": ["responses-api-v2"]
      }
    }
  ],
  "Router": {
    "default": "openai-responses,gpt-4o",
    "reasoning": "openai-responses,o4-mini"
  }
}
```

## Development

### Repository Structure
```
/Users/jerry/ccr/           # Main CR development
/Users/jerry/llms/          # Enhanced transformers
```

### Building
```bash
npm run build
```

### Testing
```bash
./verify-cr-complete.sh
```

## Migration Checklist

✅ Package renamed to `@jerryzhao173985/claude-router`
✅ Command changed from `ccr` to `cr`
✅ Config directory: `~/.cr-router/`
✅ All internal references updated
✅ Repository URL updated
✅ No conflicts with original package
✅ Can be installed alongside original
✅ Full Responses API v2 support
✅ Continuous execution implemented
✅ All tests passing

## Support

- Repository: https://github.com/jerryzhao173985/ccr
- Fork of: musistudio/claude-code-router
- Author: jerryzhao173985

## License

MIT