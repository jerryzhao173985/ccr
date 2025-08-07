# 🏗️ Responses API V2 - System Architecture

## Overview
This document defines the architecture for the ResponsesApiV2 transformer, designed to provide complete OpenAI Responses API support with zero fallbacks to Chat Completions.

## 🎯 Design Principles

1. **Completeness**: Handle ALL Responses API features
2. **Reliability**: Automatic error recovery and retry logic
3. **Performance**: Minimal transformation overhead (<100ms)
4. **Maintainability**: Clean separation of concerns
5. **Extensibility**: Easy to add new features

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Code Router                     │
├─────────────────────────────────────────────────────────┤
│                  ResponsesApiV2 Transformer              │
├──────────────┬───────────────┬───────────────┬──────────┤
│   Message    │     Tool      │   Streaming   │  State   │
│ Transformer  │    Manager    │   Processor   │ Manager  │
├──────────────┴───────────────┴───────────────┴──────────┤
│                    Core Services                         │
├──────────────┬───────────────┬───────────────┬──────────┤
│    Token     │     Error     │    Cache      │  Logger  │
│   Counter    │    Recovery   │    Manager    │  System  │
└──────────────┴───────────────┴───────────────┴──────────┘
```

## 🔧 Core Components

### 1. Message Transformer
**Purpose**: Convert between Chat Completions and Responses API message formats

```typescript
class MessageTransformer {
  // Transforms Chat Completions messages to Responses API format
  transformToResponsesApi(messages: UnifiedMessage[]): ResponsesApiMessage[]
  
  // Transforms Responses API output to Chat Completions format
  transformFromResponsesApi(output: ResponsesApiOutput[]): ChatCompletionMessage
  
  // Handles special cases (tool results, multimodal content)
  handleSpecialContent(content: any): TransformedContent
}
```

**Key Responsibilities**:
- Role-based content type selection (input_text vs output_text)
- Tool result transformation
- Multimodal content handling
- Conversation history preservation

### 2. Tool Manager
**Purpose**: Handle all tool-related operations

```typescript
class ToolManager {
  // Transform tools to Responses API format
  transformTools(tools: UnifiedTool[]): ResponsesApiTool[]
  
  // Process function_call outputs
  processFunctionCalls(outputs: FunctionCallOutput[]): ToolCall[]
  
  // Handle tool results in conversation
  processToolResults(results: ToolResult[]): ResponsesApiMessage[]
  
  // Manage parallel tool execution
  handleParallelTools(calls: FunctionCall[]): Promise<ToolResult[]>
}
```

**Features**:
- Single and parallel tool call support
- Tool result mapping and tracking
- Failed tool call recovery
- Tool choice configuration

### 3. Streaming Processor
**Purpose**: Handle SSE streaming with all event types

```typescript
class StreamingProcessor {
  // Main stream handler
  processStream(response: Response): ReadableStream
  
  // Event type handlers
  handlers: Map<string, EventHandler> = new Map([
    ['response.output_text.delta', handleTextDelta],
    ['response.function_call.added', handleFunctionCallStart],
    ['response.function_call.delta', handleFunctionCallDelta],
    ['response.function_call.done', handleFunctionCallComplete],
    // ... more handlers
  ])
  
  // State management during streaming
  streamState: StreamState
}
```

**Streaming Events**:
- Text deltas
- Function call events
- Reasoning events
- Completion events

### 4. State Manager
**Purpose**: Manage conversation state and context

```typescript
class StateManager {
  // Stateful conversation support
  conversations: Map<string, ConversationState>
  
  // Store and retrieve response IDs
  saveResponseId(id: string, state: ConversationState): void
  
  // Preserve reasoning context
  preserveReasoning(reasoning: EncryptedReasoning): void
  
  // Cache management
  cacheManager: CacheManager
}
```

**State Features**:
- Response ID tracking
- Reasoning preservation (encrypted)
- Tool history tracking
- Cache key management

## 🔄 Request/Response Flow

### Request Flow
```
1. Incoming Request (Chat Completions format)
   ↓
2. ResponsesApiV2.transformRequestIn()
   ├── Message Transformation
   ├── Tool Transformation  
   ├── Token Calculation
   └── State Retrieval
   ↓
3. Responses API Request
   ├── model
   ├── input (transformed messages)
   ├── tools (if present)
   ├── max_output_tokens
   └── reasoning (for o-series)
```

### Response Flow
```
1. Responses API Response
   ↓
2. ResponsesApiV2.transformResponseOut()
   ├── Parse output array
   ├── Extract message/function_call items
   ├── Transform to Chat Completions format
   └── Update state
   ↓
3. Chat Completions Response
   ├── choices[].message
   ├── choices[].tool_calls
   └── usage
```

## 💾 Data Structures

### ResponsesApiMessage
```typescript
interface ResponsesApiMessage {
  role: 'user' | 'assistant' | 'system'
  content: ContentItem[]
}

interface ContentItem {
  type: 'input_text' | 'output_text' | 'input_image' | 'output_image' | 'tool_result'
  text?: string
  image_url?: string
  tool_use_id?: string
}
```

### FunctionCallOutput
```typescript
interface FunctionCallOutput {
  id: string
  type: 'function_call'
  name: string
  arguments: string
  call_id: string
  status: 'completed' | 'failed'
}
```

### StreamEvent
```typescript
interface StreamEvent {
  type: string
  data: any
  sequence_number?: number
  response_id?: string
}
```

## 🔒 Error Handling

### Error Recovery Strategy
1. **Network Errors**: Exponential backoff retry (3 attempts)
2. **API Errors**: Parse error message, adjust request
3. **Token Limit**: Automatic token adjustment
4. **Tool Failures**: Graceful degradation
5. **Stream Interruption**: Resume from sequence_number

### Fallback Mechanism
```typescript
class FallbackHandler {
  // Only as absolute last resort
  canFallback(): boolean
  
  // Log why fallback was needed
  logFallbackReason(reason: string): void
  
  // Switch to Chat Completions (should never happen)
  fallbackToChatCompletions(request: any): Promise<any>
}
```

## 🎛️ Configuration

### Transformer Options
```typescript
interface ResponsesApiV2Options {
  // Stateful mode
  enableStateful: boolean = true
  
  // Reasoning preservation
  preserveReasoning: boolean = true
  
  // Token management
  tokenMultiplier: number = 2.0
  minTokensForTools: number = 10000
  
  // Streaming
  streamBufferSize: number = 4096
  
  // Retry policy
  maxRetries: number = 3
  retryDelay: number = 1000
  
  // Debug
  verboseLogging: boolean = false
}
```

## 📊 Performance Targets

| Operation | Target | Measure |
|-----------|--------|---------|
| Message Transformation | <10ms | Per 100 messages |
| Tool Transformation | <5ms | Per 10 tools |
| Stream Processing | <1ms | Per event |
| Token Counting | <20ms | Per request |
| Total Overhead | <100ms | End-to-end |

## 🔗 Integration Points

### With Claude Code Router
- Seamless drop-in replacement for current transformer
- Backward compatible API
- Enhanced logging for debugging

### With LLMs Package
- Implements standard Transformer interface
- Registered in transformer index
- Compatible with middleware chain

## 📝 Implementation Notes

1. **Type Safety**: All functions fully typed with TypeScript
2. **Logging**: Comprehensive debug logging at every step
3. **Testing**: Unit tests for each component
4. **Documentation**: Inline JSDoc comments
5. **Error Messages**: Clear, actionable error messages

---

Next: [02-message-transformation.md](02-message-transformation.md) - Detailed message format specifications