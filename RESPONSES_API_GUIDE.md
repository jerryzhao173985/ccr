# OpenAI Responses API - Quick Reference Guide

## Overview

The OpenAI Responses API (`/v1/responses`) is OpenAI's latest API endpoint that provides enhanced reasoning capabilities and full tool support. This guide provides quick reference for using it with Claude Router (CR).

**Version**: 2.0.0 (responses-api-v2 transformer)
**Status**: Production Ready

## Key Differences from Chat Completions API

| Chat Completions (`/v1/chat/completions`) | Responses API (`/v1/responses`) |
|---|---|
| `messages` | `input` |
| `response_format` | `text.format` |
| `max_tokens` | `max_output_tokens` |
| `max_completion_tokens` | `max_output_tokens` |
| `reasoning_effort` | `reasoning.effort` |
| Stateless | Stateful (with `response_id`) |

## Setup

### 1. Install/Update Dependencies

The `responses-api` transformer is now available in the `@musistudio/llms` package.

### 2. Configure CR

Create or update your CR configuration (`~/.claude-router/config.json`):

```json
{
  "Providers": [
    {
      "name": "openai-responses",
      "api_base_url": "https://api.openai.com/v1/responses",
      "api_key": "${OPENAI_API_KEY}",
      "models": ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3", "o3-mini", "o4-mini"],
      "transformer": {
        "use": ["responses-api-v2"]  // Use v2 for full features
      }
    }
  ],
  "Router": {
    "default": "openai-responses,gpt-4o",
    "structuredOutput": "openai-responses,o4-mini",
    "jsonMode": "openai-responses,gpt-4o",
    "reasoning": "openai-responses,o4-mini",
    "longContext": "openai-responses,o3"
  }
}
```

### Key Features (v2)
- **Continuous Execution**: Models complete entire tasks without stopping
- **Full Tool Support**: Single, parallel, and sequential tool calls
- **Auto-Continuation**: No manual intervention for multi-step tasks

## Usage Examples

### Basic Request

```javascript
// Your request (standard format)
{
  "model": "o3-mini",
  "messages": [
    {"role": "user", "content": "What is 2+2?"}
  ],
  "max_tokens": 100
}

// Transformed by responses-api transformer to:
{
  "model": "o3-mini",
  "input": [
    {"role": "user", "content": "What is 2+2?"}
  ],
  "max_output_tokens": 100,
  "reasoning": {
    "effort": "medium"
  }
}
```

### JSON Output

```javascript
// Your request
{
  "model": "gpt-4o",
  "messages": [
    {"role": "user", "content": "Generate a product description"}
  ],
  "response_format": {
    "type": "json_object"
  }
}

// Transformed to:
{
  "model": "gpt-4o",
  "input": [...],
  "text": {
    "format": {
      "type": "json_object"
    }
  }
}
```

### Structured Output (JSON Schema)

```javascript
// Your request
{
  "model": "o3-mini",
  "messages": [...],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "person",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "age": {"type": "integer"}
        },
        "required": ["name", "age"]
      }
    }
  }
}

// Transformed to:
{
  "model": "o3-mini",
  "input": [...],
  "text": {
    "format": {
      "type": "json_schema",
      "name": "person",
      "strict": true,
      "schema": {...}
    }
  }
}
```

## Testing

### 1. Test Direct API Access

```bash
node test-responses-working.js
```

### 2. Test with CR

```bash
# Start CR with Responses API config
cr stop
cr start

# Test with Claude Code
cr code "What is 2+2?"

# Check logs to verify Responses API is being used
tail -f ~/.claude-router/logs/server.log | grep "Responses API"
```

### 3. Test JSON Output

```bash
# Create a test script
cat > test-cr-json.js << 'EOF'
const request = {
  model: "gpt-4o",
  messages: [
    {role: "user", content: "Generate a JSON product"}
  ],
  response_format: {
    type: "json_object"
  }
};

// Make request to CR
fetch("http://localhost:3000/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_KEY"
  },
  body: JSON.stringify(request)
}).then(r => r.json()).then(console.log);
EOF

node test-cr-json.js
```

## Features

### 1. Stateful Conversations
The Responses API maintains state with `response_id`, allowing for continued conversations:

```javascript
// First request returns response_id
{
  "response_id": "resp_abc123",
  "output": { "text": "..." }
}

// Continue conversation using response_id
{
  "response_id": "resp_abc123",
  "input": [{"role": "user", "content": "continue"}]
}
```

### 2. Reasoning Summaries
O3 models provide reasoning summaries:

```javascript
{
  "reasoning_summary": "The model considered...",
  "output": { "text": "..." },
  "usage": {
    "reasoning_tokens": 150,
    "completion_tokens": 50
  }
}
```

### 3. Background Mode
For long-running tasks:

```javascript
{
  "background_mode": true,
  "max_output_tokens": 10000
}
```

## Important Notes

1. **Minimum Tokens**: `max_output_tokens` has a minimum of 16 (automatically adjusted)
2. **Model Support**: Not all models support all features
3. **Quota**: Responses API may have separate quotas from Chat Completions
4. **Streaming**: Responses API supports streaming with enhanced events

## Troubleshooting

### Error: "Unsupported parameter"
- Check parameter mappings above
- Ensure transformer is properly configured

### Error: "Model not available"
- Verify model name in supported list
- Check API key permissions

### No Response Content
- May be quota issue
- Check API key has Responses API access
- Try with Chat Completions endpoint as fallback

## Fallback Strategy

Configure both endpoints for reliability:

```json
{
  "Providers": [
    {
      "name": "openai-responses",
      "api_base_url": "https://api.openai.com/v1/responses",
      "transformer": {"use": ["responses-api"]}
    },
    {
      "name": "openai-chat",
      "api_base_url": "https://api.openai.com/v1/chat/completions",
      "transformer": {"use": ["openai-response-format", "o3"]}
    }
  ]
}
```

## Summary

The Responses API provides enhanced capabilities for o3 and gpt-4o models:
- ✅ Stateful conversations
- ✅ Enhanced reasoning with summaries
- ✅ Better structured output support
- ✅ Integrated tool calling within reasoning

Use the `responses-api` transformer in CR to automatically handle all parameter conversions and take advantage of these features.