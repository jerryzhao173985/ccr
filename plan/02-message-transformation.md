# 📨 Message Transformation Specification

## Overview
This document specifies the exact transformation rules for converting between Chat Completions and Responses API message formats.

## 🔄 Transformation Rules

### Role-Based Content Types

| Role | Chat Completions | Responses API Content Type |
|------|-----------------|---------------------------|
| user | `content: string \| Content[]` | `input_text` |
| system | `content: string` | `input_text` |
| assistant | `content: string \| Content[]` | `output_text` |
| tool | `content: string` | `tool_result` |

## 📝 Message Format Examples

### 1. Simple Text Message

**Chat Completions Format**:
```json
{
  "role": "user",
  "content": "What is 2+2?"
}
```

**Responses API Format**:
```json
{
  "role": "user",
  "content": [
    {
      "type": "input_text",
      "text": "What is 2+2?"
    }
  ]
}
```

### 2. Assistant Response

**Chat Completions Format**:
```json
{
  "role": "assistant",
  "content": "2+2 equals 4."
}
```

**Responses API Format**:
```json
{
  "role": "assistant",
  "content": [
    {
      "type": "output_text",
      "text": "2+2 equals 4."
    }
  ]
}
```

### 3. Tool Call Message

**Chat Completions Format**:
```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"location\":\"NYC\"}"
      }
    }
  ]
}
```

**Responses API Output** (separate from message):
```json
{
  "id": "fc_456",
  "type": "function_call",
  "name": "get_weather",
  "arguments": "{\"location\":\"NYC\"}",
  "call_id": "call_123",
  "status": "completed"
}
```

### 4. Tool Result Message

**Chat Completions Format**:
```json
{
  "role": "tool",
  "content": "{\"temperature\": 72, \"condition\": \"sunny\"}",
  "tool_call_id": "call_123"
}
```

**Responses API Format**:
```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "call_123",
      "content": "{\"temperature\": 72, \"condition\": \"sunny\"}"
    }
  ]
}
```

### 5. Multimodal Message

**Chat Completions Format**:
```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "What's in this image?"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "data:image/jpeg;base64,..."
      }
    }
  ]
}
```

**Responses API Format**:
```json
{
  "role": "user",
  "content": [
    {
      "type": "input_text",
      "text": "What's in this image?"
    },
    {
      "type": "input_image",
      "image_url": "data:image/jpeg;base64,..."
    }
  ]
}
```

## 🔧 Transformation Implementation

### Message Transformer Class

```typescript
class MessageTransformer {
  /**
   * Transform Chat Completions messages to Responses API format
   */
  transformToResponsesApi(messages: UnifiedMessage[]): ResponsesApiMessage[] {
    return messages.map(msg => {
      // Skip tool messages - they need special handling
      if (msg.role === 'tool') {
        return this.transformToolMessage(msg);
      }
      
      const transformed: ResponsesApiMessage = {
        role: msg.role
      };
      
      // Determine content type based on role
      const contentType = this.getContentType(msg.role);
      
      // Transform content
      if (typeof msg.content === 'string') {
        transformed.content = [{
          type: contentType,
          text: msg.content
        }];
      } else if (Array.isArray(msg.content)) {
        transformed.content = this.transformContentArray(msg.content, msg.role);
      }
      
      // Handle tool calls (they become separate output items)
      if (msg.tool_calls) {
        // Store for later processing as function_call outputs
        this.pendingToolCalls.push(...msg.tool_calls);
      }
      
      return transformed;
    });
  }
  
  /**
   * Get appropriate content type for role
   */
  private getContentType(role: string): string {
    switch(role) {
      case 'assistant':
        return 'output_text';
      case 'user':
      case 'system':
        return 'input_text';
      default:
        return 'input_text';
    }
  }
  
  /**
   * Transform tool message to Responses API format
   */
  private transformToolMessage(msg: ToolMessage): ResponsesApiMessage {
    return {
      role: 'user', // Tool results go as user messages
      content: [{
        type: 'tool_result',
        tool_use_id: msg.tool_call_id,
        content: msg.content
      }]
    };
  }
  
  /**
   * Transform content array handling multimodal
   */
  private transformContentArray(content: Content[], role: string): ContentItem[] {
    return content.map(item => {
      if (item.type === 'text') {
        return {
          type: this.getContentType(role),
          text: item.text
        };
      } else if (item.type === 'image_url') {
        const imageType = role === 'assistant' ? 'output_image' : 'input_image';
        return {
          type: imageType,
          image_url: item.image_url.url
        };
      } else if (item.type === 'tool_use') {
        // Handle inline tool use (Anthropic style)
        return {
          type: 'tool_use',
          id: item.id,
          name: item.name,
          input: item.input
        };
      } else if (item.type === 'tool_result') {
        // Handle tool results
        return {
          type: 'tool_result',
          tool_use_id: item.tool_use_id,
          content: item.content
        };
      }
      
      // Fallback
      return item;
    });
  }
}
```

## 🔄 Reverse Transformation (Response to Chat Completions)

### Output Processing

```typescript
class ResponseTransformer {
  /**
   * Transform Responses API output to Chat Completions format
   */
  transformOutput(output: ResponsesApiOutput[]): ChatCompletionMessage {
    const message: ChatCompletionMessage = {
      role: 'assistant',
      content: null,
      tool_calls: []
    };
    
    // Process each output item
    for (const item of output) {
      switch(item.type) {
        case 'message':
          this.processMessageOutput(item, message);
          break;
          
        case 'function_call':
          this.processFunctionCall(item, message);
          break;
          
        case 'reasoning':
          // Store reasoning for metadata
          this.processReasoning(item);
          break;
      }
    }
    
    // Clean up message
    if (message.tool_calls.length === 0) {
      delete message.tool_calls;
    }
    if (message.content === null && !message.tool_calls) {
      message.content = '[No response generated]';
    }
    
    return message;
  }
  
  /**
   * Process message output item
   */
  private processMessageOutput(item: MessageOutput, message: ChatCompletionMessage) {
    if (item.content) {
      for (const content of item.content) {
        if (content.type === 'output_text') {
          message.content = content.text;
        } else if (content.type === 'tool_use') {
          // Inline tool use
          message.tool_calls.push({
            id: content.id,
            type: 'function',
            function: {
              name: content.name,
              arguments: JSON.stringify(content.input)
            }
          });
        }
      }
    }
  }
  
  /**
   * Process function call output
   */
  private processFunctionCall(item: FunctionCallOutput, message: ChatCompletionMessage) {
    message.tool_calls.push({
      id: item.call_id,
      type: 'function',
      function: {
        name: item.name,
        arguments: item.arguments
      }
    });
  }
}
```

## 🎯 Special Cases

### 1. Empty Content
- Assistant messages with only tool calls: `content: null`
- User messages must always have content

### 2. Cache Control
- Responses API doesn't support cache_control
- Strip these before transformation

### 3. System Messages
- Can be in `input` array or separate `system` field
- Prefer separate `system` field for clarity

### 4. Multiple Tool Results
- Group all tool results in single user message
- Preserve order and tool_use_id mapping

## ✅ Validation Rules

1. **Content Type Matching**: Always use correct content type for role
2. **Tool ID Preservation**: Maintain tool_call_id ↔ tool_use_id mapping
3. **Content Completeness**: Never lose content during transformation
4. **Order Preservation**: Maintain message order exactly
5. **Type Safety**: All fields properly typed

## 🧪 Test Cases

### Test 1: Simple Conversation
```typescript
test('transforms simple conversation', () => {
  const input = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' }
  ];
  
  const expected = [
    { role: 'user', content: [{ type: 'input_text', text: 'Hello' }] },
    { role: 'assistant', content: [{ type: 'output_text', text: 'Hi there!' }] }
  ];
  
  expect(transformer.transform(input)).toEqual(expected);
});
```

### Test 2: Tool Use Flow
```typescript
test('transforms tool use flow', () => {
  // Test complete tool call → result → response flow
});
```

---

Next: [03-tool-handling.md](03-tool-handling.md) - Complete tool use implementation guide