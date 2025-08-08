/**
 * Fixed Responses API v2 Transformer with PROPER Continuous Execution
 * 
 * This transformer correctly implements:
 * 1. Persistent conversation state across tool executions
 * 2. Automatic continuation after tool results
 * 3. No manual "CONTINUE" needed
 * 4. Proper tool call detection and handling
 */

const VERBOSE_LOGGING = true;

class ResponsesApiV2ContinuousTransformer {
  constructor(options = {}) {
    this.name = 'responses-api-v2-continuous';
    this.options = {
      enableStateful: true,
      preserveReasoning: true,
      continuousExecution: true,
      alwaysContinueWithTools: true,
      maxRetries: 10,
      maxIterations: 50,
      tokenMultiplier: 2,
      minTokensForTools: 15000,
      maxTokensLimit: 100000,
      ...options
    };
    
    // CRITICAL: Persistent state storage that survives across requests
    // This is THE KEY issue - state MUST persist!
    if (!global.__responsesApiV2State) {
      global.__responsesApiV2State = {
        conversationStates: new Map(),
        toolCallMap: new Map(),
        executionContexts: new Map()
      };
    }
    
    this.conversationStates = global.__responsesApiV2State.conversationStates;
    this.toolCallMap = global.__responsesApiV2State.toolCallMap;
    this.executionContexts = global.__responsesApiV2State.executionContexts;
    
    this.log('Transformer initialized with continuous execution enabled');
  }

  log(...args) {
    if (VERBOSE_LOGGING) {
      console.log('[ResponsesApiV2-CONTINUOUS]', ...args);
    }
  }

  async transformRequestIn(request, context) {
    const conversationId = context?.conversationId || 'default';
    this.log(`Processing request for conversation: ${conversationId}`);
    
    // Get or create conversation state
    let state = this.conversationStates.get(conversationId);
    if (!state) {
      state = {
        messages: [],
        model: request.model || 'o3',
        toolCalls: [],
        iterations: 0,
        maxTokens: request.max_tokens || 100000,
        isExecuting: false
      };
      this.conversationStates.set(conversationId, state);
      this.log('Created new conversation state');
    }
    
    // Check if this is a continuation after tool execution
    const isToolContinuation = this.isToolResultMessage(request);
    
    if (isToolContinuation) {
      this.log('Detected tool result continuation - will auto-continue');
      state.isExecuting = true;
    }
    
    // Add messages to state
    if (request.messages) {
      state.messages = request.messages;
    }
    
    // Transform for Responses API
    const transformed = {
      model: state.model,
      input: this.convertMessagesToResponsesFormat(state.messages),
      max_output_tokens: this.calculateMaxTokens(state),
      reasoning: { effort: 'high' }
    };
    
    // Add any additional options
    if (request.response_format) {
      transformed.text = { format: request.response_format };
    }
    
    if (request.stream) {
      transformed.stream = true;
    }
    
    this.log(`Transformed request with ${transformed.input.length} messages`);
    
    return transformed;
  }

  async transformResponseOut(response, context) {
    const conversationId = context?.conversationId || 'default';
    const state = this.conversationStates.get(conversationId);
    
    if (!state) {
      this.log('WARNING: No conversation state found!');
      return response;
    }
    
    this.log('Processing response...');
    
    // Check if response has tool calls
    const toolCalls = this.extractToolCalls(response);
    
    if (toolCalls.length > 0 && this.options.continuousExecution) {
      this.log(`Detected ${toolCalls.length} tool calls - enabling continuous execution`);
      
      // Store tool calls in state
      state.toolCalls = toolCalls;
      state.iterations++;
      
      // Mark response for continuation
      response.requiresContinuation = true;
      response.toolCalls = toolCalls;
      
      // Add assistant message to conversation
      state.messages.push({
        role: 'assistant',
        content: response.choices?.[0]?.message?.content || '',
        tool_calls: toolCalls
      });
      
      // Set up execution context for automatic continuation
      this.executionContexts.set(conversationId, {
        pendingTools: toolCalls,
        waitingForResults: true,
        autoResume: true
      });
      
      this.log('Response marked for continuation - waiting for tool results');
    } else {
      this.log('No tool calls detected or continuation not needed');
      
      // Add final assistant message
      if (response.choices?.[0]?.message) {
        state.messages.push(response.choices[0].message);
      }
      
      // Clear execution context
      this.executionContexts.delete(conversationId);
    }
    
    return response;
  }

  // CRITICAL: Handle tool results and automatically continue
  async handleToolResults(toolResults, conversationId = 'default') {
    this.log(`Handling ${toolResults.length} tool results for auto-continuation`);
    
    const state = this.conversationStates.get(conversationId);
    if (!state) {
      throw new Error('No conversation state - cannot continue!');
    }
    
    // Add tool results to conversation
    toolResults.forEach(result => {
      state.messages.push({
        role: 'tool',
        tool_call_id: result.tool_call_id,
        content: result.content || result.output || ''
      });
    });
    
    // Check if we should continue
    const context = this.executionContexts.get(conversationId);
    if (context?.autoResume) {
      this.log('AUTO-CONTINUING execution after tool results');
      
      // Prepare continuation request
      const continuationRequest = {
        model: state.model,
        messages: state.messages,
        max_tokens: state.maxTokens
      };
      
      // Transform and send continuation
      const transformed = await this.transformRequestIn(continuationRequest, { conversationId });
      
      // This would trigger another API call
      return {
        action: 'continue',
        request: transformed
      };
    }
    
    return { action: 'wait' };
  }

  // Helper: Check if message contains tool results
  isToolResultMessage(request) {
    if (!request.messages) return false;
    
    const lastMessage = request.messages[request.messages.length - 1];
    if (!lastMessage) return false;
    
    // Check for tool role
    if (lastMessage.role === 'tool') return true;
    
    // Check for tool result patterns in content
    const content = lastMessage.content || '';
    return content.includes('[Tool Result') || 
           content.includes('Tool call result:');
  }

  // Helper: Extract tool calls from response
  extractToolCalls(response) {
    const toolCalls = [];
    
    // Check structured tool_calls field
    if (response.choices?.[0]?.message?.tool_calls) {
      return response.choices[0].message.tool_calls;
    }
    
    // Check response output
    if (response.output) {
      response.output.forEach(item => {
        if (item.type === 'tool_call') {
          toolCalls.push(item);
        }
      });
    }
    
    // Parse from text content
    const content = this.getResponseContent(response);
    const patterns = [
      /\[Tool: (\w+) \(([^)]+)\)\]/g,
      /\[Executing \d+ tools?: ([^\]]+)\]/g,
      /Tool call: (\w+) with id (\w+)/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        toolCalls.push({
          id: match[2] || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'function',
          function: {
            name: match[1],
            arguments: '{}'
          }
        });
      }
    });
    
    return toolCalls;
  }

  // Helper: Get response content
  getResponseContent(response) {
    if (typeof response === 'string') return response;
    if (response.content) return response.content;
    if (response.choices?.[0]?.message?.content) {
      return response.choices[0].message.content;
    }
    if (response.output?.length > 0) {
      return response.output.map(o => o.content?.[0]?.text || '').join('\n');
    }
    return '';
  }

  // Helper: Convert messages to Responses API format
  convertMessagesToResponsesFormat(messages) {
    return messages.map(msg => {
      const formatted = {
        role: msg.role === 'tool' ? 'user' : msg.role,
        content: []
      };
      
      // Handle tool results specially
      if (msg.role === 'tool') {
        formatted.content.push({
          type: 'input_text',
          text: `[Tool Result ${msg.tool_call_id}]\n${msg.content}`
        });
      } else if (msg.tool_calls) {
        // Format tool calls in response
        const toolText = msg.tool_calls.map(tc => 
          `[Tool: ${tc.function.name} (${tc.id})]`
        ).join('\n');
        formatted.content.push({
          type: msg.role === 'assistant' ? 'output_text' : 'input_text',
          text: msg.content ? `${msg.content}\n${toolText}` : toolText
        });
      } else if (typeof msg.content === 'string') {
        formatted.content.push({
          type: msg.role === 'assistant' ? 'output_text' : 'input_text',
          text: msg.content
        });
      } else if (Array.isArray(msg.content)) {
        formatted.content = msg.content.map(c => ({
          type: msg.role === 'assistant' ? 'output_text' : 'input_text',
          text: c.text || c.content || ''
        }));
      }
      
      return formatted;
    });
  }

  // Helper: Calculate max tokens
  calculateMaxTokens(state) {
    const base = state.maxTokens || 15000;
    const toolOverhead = state.toolCalls.length * 2000;
    const historyOverhead = state.messages.length * 100;
    const total = Math.min(base + toolOverhead + historyOverhead, this.options.maxTokensLimit);
    return total;
  }
}

// Export for use as a transformer
module.exports = ResponsesApiV2ContinuousTransformer;

// Also export factory function
module.exports.create = (options) => new ResponsesApiV2ContinuousTransformer(options);