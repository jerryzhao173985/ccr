# 🛠️ Tool Handling Implementation Guide

## Overview
This document provides complete specifications for handling tools in the Responses API, covering single tools, parallel tools, tool results, and complex multi-turn scenarios.

## 🎯 Key Challenges

1. **Structural Difference**: Tool calls are separate `function_call` output items, not part of message content
2. **Parallel Execution**: Multiple tools can be called simultaneously
3. **Result Mapping**: Tool results must be properly associated with their calls
4. **Token Management**: Tools require significantly more tokens for reasoning
5. **Streaming Complexity**: Tool calls stream differently than text

## 📊 Tool Flow Comparison

### Chat Completions API Flow
```
User Message
    ↓
Assistant Message with tool_calls[]
    ↓
Tool Results (role: tool)
    ↓
Assistant Final Response
```

### Responses API Flow
```
User Message
    ↓
Output Array:
  - reasoning (thinking process)
  - function_call (separate item)
  - function_call (parallel)
    ↓
Tool Results (in user message as tool_result)
    ↓
Output Array:
  - reasoning
  - message (final response)
```

## 🔧 Tool Transformation

### 1. Tool Definition Transformation

**Chat Completions Format**:
```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get current weather",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "City name"
        }
      },
      "required": ["location"]
    }
  }
}
```

**Responses API Format**:
```json
{
  "type": "function",
  "name": "get_weather",
  "description": "Get current weather",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name"
      }
    },
    "required": ["location"],
    "additionalProperties": false,
    "strict": true
  }
}
```

### 2. Tool Call Output Processing

**Responses API Output**:
```json
{
  "id": "fc_123",
  "type": "function_call",
  "name": "get_weather",
  "arguments": "{\"location\": \"New York\"}",
  "call_id": "call_abc",
  "status": "completed"
}
```

**Transform to Chat Completions**:
```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_abc",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"location\": \"New York\"}"
      }
    }
  ]
}
```

### 3. Tool Result Handling

**Chat Completions Tool Result**:
```json
{
  "role": "tool",
  "content": "{\"temperature\": 72, \"condition\": \"sunny\"}",
  "tool_call_id": "call_abc"
}
```

**Responses API Format**:
```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "call_abc",
      "content": "{\"temperature\": 72, \"condition\": \"sunny\"}"
    }
  ]
}
```

## 💡 Implementation Strategy

### ToolManager Class

```typescript
class ToolManager {
  // Track tool calls across conversation
  private toolCallMap: Map<string, ToolCallInfo> = new Map();
  
  /**
   * Transform tool definitions for Responses API
   */
  transformTools(tools: UnifiedTool[]): ResponsesApiTool[] {
    return tools.map(tool => {
      if (tool.type === 'function' && tool.function) {
        return {
          type: 'function',
          name: tool.function.name,
          description: tool.function.description,
          parameters: {
            ...tool.function.parameters,
            additionalProperties: false,
            strict: true // Enable strict mode for better validation
          }
        };
      }
      
      // Handle other tool types (future)
      return tool;
    });
  }
  
  /**
   * Process function_call outputs from Responses API
   */
  processFunctionCalls(outputs: any[]): ToolCall[] {
    const functionCalls = outputs.filter(o => o.type === 'function_call');
    
    return functionCalls.map(fc => {
      // Track the call for result mapping
      this.toolCallMap.set(fc.call_id, {
        name: fc.name,
        arguments: fc.arguments,
        timestamp: Date.now()
      });
      
      return {
        id: fc.call_id,
        type: 'function',
        function: {
          name: fc.name,
          arguments: fc.arguments
        }
      };
    });
  }
  
  /**
   * Transform tool results for next request
   */
  transformToolResults(toolMessages: any[]): ResponsesApiMessage[] {
    const results = [];
    
    // Group tool results into user message
    const toolResults = toolMessages
      .filter(msg => msg.role === 'tool')
      .map(msg => ({
        type: 'tool_result',
        tool_use_id: msg.tool_call_id,
        content: msg.content
      }));
    
    if (toolResults.length > 0) {
      results.push({
        role: 'user',
        content: toolResults
      });
    }
    
    return results;
  }
  
  /**
   * Handle parallel tool calls
   */
  async handleParallelTools(calls: FunctionCall[]): Promise<ToolResult[]> {
    // Execute all tools in parallel
    const promises = calls.map(call => 
      this.executeToolCall(call).catch(err => ({
        id: call.id,
        error: err.message
      }))
    );
    
    return Promise.all(promises);
  }
  
  /**
   * Calculate tokens needed for tools
   */
  calculateToolTokens(tools: any[], baseTokens: number): number {
    if (!tools || tools.length === 0) {
      return baseTokens;
    }
    
    // Tools require more tokens for reasoning
    const toolComplexity = tools.length * 1000; // Base per tool
    const reasoningOverhead = 5000; // For chain-of-thought
    
    // Minimum 15k for any tool use
    const minTokens = 15000;
    
    return Math.max(
      minTokens,
      baseTokens * 2,
      baseTokens + toolComplexity + reasoningOverhead
    );
  }
}
```

## 🔄 Complex Scenarios

### Scenario 1: Sequential Tool Calls

```typescript
// User asks: "What's the weather in NYC and SF?"
// Model calls get_weather twice sequentially

handleSequentialTools(conversation) {
  // First call
  const nyc_call = { name: 'get_weather', args: { location: 'NYC' } };
  const nyc_result = await execute(nyc_call);
  
  // Second call (after first result)
  const sf_call = { name: 'get_weather', args: { location: 'SF' } };
  const sf_result = await execute(sf_call);
  
  // Final response with both results
  return combineResults([nyc_result, sf_result]);
}
```

### Scenario 2: Parallel Tool Calls

```typescript
// Responses API can return multiple function_call items
output: [
  { type: 'reasoning', ... },
  { type: 'function_call', name: 'get_weather', arguments: '{"location":"NYC"}' },
  { type: 'function_call', name: 'get_weather', arguments: '{"location":"SF"}' },
  { type: 'function_call', name: 'get_time', arguments: '{"timezone":"EST"}' }
]

// Process all in parallel
const results = await Promise.all(
  functionCalls.map(fc => executeFunction(fc))
);
```

### Scenario 3: Tool Calls with Text Response

```typescript
// Model can provide text AND call tools
output: [
  { 
    type: 'message',
    content: [{ type: 'output_text', text: 'Let me check the weather...' }]
  },
  { 
    type: 'function_call',
    name: 'get_weather',
    arguments: '{}'
  }
]

// Transform to:
{
  role: 'assistant',
  content: 'Let me check the weather...',
  tool_calls: [...]
}
```

### Scenario 4: Failed Tool Calls

```typescript
handleFailedToolCall(error: ToolError) {
  // Return error as tool result
  return {
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: error.tool_call_id,
      content: JSON.stringify({
        error: true,
        message: error.message,
        code: error.code
      })
    }]
  };
}
```

## 📈 Token Management Strategy

### Dynamic Token Calculation

```typescript
function calculateOptimalTokens(request: any): number {
  const { messages, tools, model } = request;
  
  // Base calculation
  let tokens = request.max_tokens || 4000;
  
  // Tool multiplier
  if (tools && tools.length > 0) {
    const toolMultiplier = 1.5 + (tools.length * 0.2);
    tokens = Math.floor(tokens * toolMultiplier);
  }
  
  // Model-specific adjustments
  if (model.includes('o4-mini')) {
    tokens = Math.max(tokens, 20000); // o4-mini needs lots for reasoning
  } else if (model.includes('o3')) {
    tokens = Math.max(tokens, 15000);
  }
  
  // Conversation history factor
  const historyLength = messages.length;
  if (historyLength > 5) {
    tokens += historyLength * 200;
  }
  
  // Cap at model maximum
  const modelMax = getModelMaxTokens(model);
  return Math.min(tokens, modelMax);
}
```

## 🧪 Test Cases

### Test 1: Single Tool Call
```typescript
test('handles single tool call', async () => {
  const response = {
    output: [
      { type: 'reasoning', summary: [] },
      { type: 'function_call', name: 'test_tool', arguments: '{}' }
    ]
  };
  
  const transformed = await toolManager.process(response);
  expect(transformed.tool_calls).toHaveLength(1);
  expect(transformed.tool_calls[0].function.name).toBe('test_tool');
});
```

### Test 2: Parallel Tool Calls
```typescript
test('handles parallel tool calls', async () => {
  const response = {
    output: [
      { type: 'function_call', name: 'tool1', arguments: '{}' },
      { type: 'function_call', name: 'tool2', arguments: '{}' }
    ]
  };
  
  const transformed = await toolManager.process(response);
  expect(transformed.tool_calls).toHaveLength(2);
});
```

### Test 3: Tool Results Round-trip
```typescript
test('correctly maps tool results', async () => {
  // Simulate complete tool flow
  const call_id = 'call_123';
  
  // 1. Tool call from API
  const toolCall = { id: call_id, name: 'test', arguments: '{}' };
  
  // 2. Tool result from client
  const toolResult = { role: 'tool', tool_call_id: call_id, content: '{"result":true}' };
  
  // 3. Transform for next request
  const transformed = toolManager.transformToolResults([toolResult]);
  
  expect(transformed[0].content[0].tool_use_id).toBe(call_id);
});
```

## ✅ Implementation Checklist

- [ ] Tool definition transformation
- [ ] Function call output processing
- [ ] Tool result transformation
- [ ] Parallel tool handling
- [ ] Sequential tool handling
- [ ] Failed tool recovery
- [ ] Token calculation for tools
- [ ] Tool call tracking/mapping
- [ ] Streaming tool calls
- [ ] Tool timeout handling

## 📝 Error Handling

### Common Tool Errors

1. **Missing Tool Name**: Validate all tools have names
2. **Invalid Arguments**: Parse and validate JSON arguments
3. **Tool Timeout**: Implement timeout with graceful failure
4. **Result Mismatch**: Handle orphaned tool results
5. **Parallel Failures**: Continue with successful tools

---

Next: [04-streaming.md](04-streaming.md) - Streaming event handling specifications