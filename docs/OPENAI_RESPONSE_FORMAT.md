# OpenAI Response Format API Support

This document describes the OpenAI Response Format API integration in Claude Code Router, enabling structured outputs and JSON mode for reliable, schema-compliant responses.

## Overview

Claude Code Router now supports OpenAI's Response Format API, which includes:
- **JSON Mode** (`json_object`): Ensures the model outputs valid JSON
- **Structured Outputs** (`json_schema`): Guarantees output matches a provided JSON Schema with 100% reliability

## Features

### 1. Automatic Model Routing
The router automatically selects appropriate models based on the response format type:
- `json_schema` → Routes to models supporting structured outputs (gpt-4o-mini, gpt-4o-2024-08-06, etc.)
- `json_object` → Routes to models supporting JSON mode (gpt-3.5-turbo and above)

### 2. Response Format Validation
- Validates model compatibility before sending requests
- Automatically injects "JSON" keyword in messages when required
- Handles refusal responses appropriately

### 3. Streaming Support
Full support for streaming responses with structured outputs, including:
- Real-time validation of streamed JSON
- Refusal detection in streaming mode
- Parsed content extraction

## Configuration

### Basic Configuration

Add OpenAI provider and routing rules to your `config.json`:

```json
{
  "Providers": [
    {
      "name": "openai",
      "api_base_url": "https://api.openai.com/v1/chat/completions",
      "api_key": "sk-xxx",
      "models": [
        "gpt-4o-mini",
        "gpt-4o-2024-08-06",
        "gpt-3.5-turbo"
      ],
      "transformer": {
        "use": ["openai", "openai-response-format"]
      }
    }
  ],
  "Router": {
    "default": "deepseek,deepseek-chat",
    "structuredOutput": "openai,gpt-4o-mini",
    "jsonMode": "openai,gpt-3.5-turbo"
  }
}
```

### Advanced Configuration with Custom Router

Create a custom router for complex routing logic:

```javascript
// ~/.claude-router/custom-router.js
module.exports = async function router(req, config) {
  if (req.body.response_format?.type === "json_schema") {
    // Route complex schemas to more powerful models
    const schemaSize = JSON.stringify(req.body.response_format.json_schema).length;
    if (schemaSize > 5000) {
      return "openai,gpt-4o-2024-08-06";
    }
    return "openai,gpt-4o-mini";
  }
  return null;
};
```

## Usage Examples

### 1. JSON Mode (Basic)

```javascript
const response = await fetch('http://localhost:3456/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet',
    messages: [{
      role: 'user',
      content: 'Generate a JSON object with city information'
    }],
    response_format: {
      type: 'json_object'
    }
  })
});
```

### 2. Structured Output with JSON Schema

```javascript
const response = await fetch('http://localhost:3456/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet',
    messages: [{
      role: 'user',
      content: 'Extract key information from this article...'
    }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'article_extraction',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            author: { type: 'string' },
            date: { type: 'string', format: 'date' },
            summary: { type: 'string', maxLength: 500 },
            key_points: {
              type: 'array',
              items: { type: 'string' },
              minItems: 3,
              maxItems: 5
            },
            sentiment: {
              type: 'string',
              enum: ['positive', 'negative', 'neutral']
            }
          },
          required: ['title', 'summary', 'key_points']
        }
      }
    }
  })
});
```

### 3. Using with Claude Code

When using Claude Code with the router, structured outputs will automatically route to appropriate models:

```bash
# The router will detect response_format and route to OpenAI
cr code "Extract structured data from this text..."
```

## Supported Models

### Structured Output Models (json_schema)
- gpt-4o-mini
- gpt-4o-mini-2024-07-18
- gpt-4o-2024-08-06
- gpt-4o-2024-11-20
- o1, o1-mini, o1-preview

### JSON Mode Models (json_object)
All structured output models plus:
- gpt-3.5-turbo (all versions)
- gpt-4-turbo (all versions)
- gpt-4 (all versions)

## Transformers

### openai-response-format

This transformer handles:
1. **Model Compatibility Validation**: Ensures the requested model supports the response format type
2. **JSON Keyword Injection**: Automatically adds "JSON" to messages when required
3. **Strict Mode Enforcement**: Sets `strict: true` for json_schema if not specified
4. **Refusal Handling**: Detects and processes safety refusals
5. **Streaming Support**: Handles both streaming and non-streaming responses

### openai

Basic OpenAI transformer that passes through all request fields including response_format.

## Testing

Use the provided test script to verify your configuration:

```bash
# Make the test script executable
chmod +x test-response-format.js

# Run the tests
./test-response-format.js
```

The test script includes:
- JSON Object mode testing
- JSON Schema structured output testing
- Routing logic verification
- Schema validation

## Error Handling

### Common Errors and Solutions

1. **Model Compatibility Error**
   ```
   Error: Model gpt-3.5-turbo does not support response_format type 'json_schema'
   ```
   **Solution**: Use a compatible model or change to `json_object` type

2. **Missing JSON Keyword**
   ```
   Error: 'messages' must contain the word 'json' in some form
   ```
   **Solution**: The transformer automatically adds this, but ensure it's not being stripped

3. **Schema Processing Latency**
   - First request with a new schema may take 10-60 seconds
   - Subsequent requests use cached schema for faster processing

4. **Refusal Responses**
   - Safety refusals are marked with `[REFUSAL]` prefix
   - Check logs for refusal reasons

## Best Practices

1. **Schema Design**
   - Keep schemas simple and focused
   - Use `required` fields judiciously
   - Test schemas with various inputs

2. **Model Selection**
   - Use `gpt-4o-mini` for simple schemas (cost-effective)
   - Use `gpt-4o-2024-08-06` for complex schemas or critical accuracy

3. **Error Handling**
   - Always validate response format in your application
   - Handle refusals gracefully
   - Implement retry logic for transient failures

4. **Performance**
   - Cache frequently used schemas
   - Use streaming for real-time applications
   - Monitor token usage for cost optimization

## Limitations

1. **JSON Schema Support**
   - Not all JSON Schema features are supported
   - `format` keyword for dates/times not supported
   - Root `anyOf` not supported

2. **Model Requirements**
   - Only specific OpenAI models support structured outputs
   - Older models limited to basic JSON mode

3. **Processing Time**
   - Initial schema processing adds latency
   - Complex schemas may timeout on first use

## Troubleshooting

### Enable Logging

Set `LOG: true` in your config to see routing decisions:

```json
{
  "LOG": true,
  ...
}
```

### Check Model Routing

Verify which model is being used:
```bash
tail -f ~/.claude-router/claude-code-router.log | grep "response format"
```

### Validate Configuration

Ensure your configuration includes:
1. OpenAI provider with correct API key
2. Router rules for structuredOutput and jsonMode
3. Appropriate transformer configuration

## Advanced Usage

### Dynamic Schema Generation

Create schemas dynamically based on user input:

```javascript
function createSchema(fields) {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'dynamic_extraction',
      strict: true,
      schema: {
        type: 'object',
        properties: fields.reduce((acc, field) => {
          acc[field.name] = { type: field.type };
          return acc;
        }, {}),
        required: fields.filter(f => f.required).map(f => f.name)
      }
    }
  };
}
```

### Multi-Provider Setup

Use different providers for different response format types:

```json
{
  "Router": {
    "structuredOutput": "openai,gpt-4o-mini",
    "jsonMode": "openrouter,openai/gpt-3.5-turbo"
  }
}
```

## Contributing

To contribute improvements to the OpenAI Response Format support:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## References

- [OpenAI Structured Outputs Documentation](https://platform.openai.com/docs/guides/structured-outputs)
- [JSON Schema Specification](https://json-schema.org/)
- [Claude Code Router Documentation](../README.md)