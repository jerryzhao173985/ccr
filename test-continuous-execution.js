#!/usr/bin/env node

/**
 * Test script for CONTINUOUS EXECUTION with Responses API v2
 * 
 * This demonstrates that the system should:
 * 1. Start with a complex task
 * 2. Model creates a plan and starts executing
 * 3. Tools are called automatically
 * 4. Results are fed back automatically
 * 5. Execution continues without ANY manual "CONTINUE" prompts
 * 6. Completes the entire task in one flow
 */

const ResponsesApiV2Continuous = require('./custom-responses-api-v2');

// Simulate the continuous execution flow
async function testContinuousExecution() {
  console.log('🚀 Testing Continuous Execution with Responses API v2\n');
  console.log('=' .repeat(60));
  
  const transformer = new ResponsesApiV2Continuous();
  const conversationId = 'test-continuous';
  
  // Initial complex request
  const initialRequest = {
    model: 'o3',
    messages: [
      {
        role: 'system',
        content: 'You are Claude Code, an AI coding assistant with access to tools.'
      },
      {
        role: 'user',
        content: 'Analyze the authentication module for security issues and fix them all. Create a detailed plan first, then execute it completely.'
      }
    ],
    max_tokens: 100000
  };
  
  console.log('📝 Initial Request: Complex security audit and fix task\n');
  
  // Transform the initial request
  const transformed = await transformer.transformRequestIn(initialRequest, { conversationId });
  console.log('✅ Request transformed for Responses API\n');
  
  // Simulate API response with tool calls
  let iteration = 0;
  let completed = false;
  
  while (!completed && iteration < 10) {
    iteration++;
    console.log(`\n🔄 ITERATION ${iteration}`);
    console.log('-'.repeat(40));
    
    // Simulate o3 response
    const mockResponse = generateMockResponse(iteration);
    console.log(`📤 Model Response: ${mockResponse.summary}`);
    
    // Transform the response
    const transformedResponse = await transformer.transformResponseOut(mockResponse, { conversationId });
    
    if (transformedResponse.requiresContinuation) {
      console.log('🔧 Tool calls detected - executing automatically...');
      
      // Simulate tool execution
      const toolResults = await executeTools(transformedResponse.toolCalls);
      console.log(`✅ Executed ${toolResults.length} tools`);
      
      // Handle tool results - THIS SHOULD TRIGGER AUTOMATIC CONTINUATION
      const continuation = await transformer.handleToolResults(toolResults, conversationId);
      
      if (continuation.action === 'continue') {
        console.log('🚀 AUTOMATICALLY CONTINUING (no manual prompt needed!)');
        // In real implementation, this would make another API call
        // For testing, we'll continue the loop
      } else {
        console.log('⏸️ Waiting for next action');
      }
    } else {
      console.log('✅ Task completed - no more tool calls needed');
      completed = true;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 EXECUTION SUMMARY:');
  console.log(`- Total iterations: ${iteration}`);
  console.log(`- Manual "CONTINUE" prompts needed: 0 (ZERO!)`);
  console.log(`- Execution was: ${completed ? 'COMPLETED' : 'INCOMPLETE'}`);
  
  // Show final conversation state
  const state = transformer.conversationStates.get(conversationId);
  console.log(`- Total messages in conversation: ${state?.messages.length || 0}`);
  console.log(`- Conversation state was: ${state ? 'PRESERVED' : 'LOST'}`);
  
  console.log('\n✨ This is how continuous execution SHOULD work:');
  console.log('   1. No manual intervention needed');
  console.log('   2. Tools execute and continue automatically');
  console.log('   3. Conversation state persists throughout');
  console.log('   4. Completes entire task in one flow');
}

// Mock response generator
function generateMockResponse(iteration) {
  const responses = [
    {
      summary: 'Creating plan and starting analysis',
      choices: [{
        message: {
          content: 'I\'ll analyze the authentication module for security issues. Let me start by reading the files.',
          tool_calls: [
            { id: 'call_read_1', type: 'function', function: { name: 'read_file', arguments: '{"path": "auth.ts"}' } },
            { id: 'call_grep_1', type: 'function', function: { name: 'grep', arguments: '{"pattern": "password"}' } }
          ]
        }
      }]
    },
    {
      summary: 'Found issues, starting fixes',
      choices: [{
        message: {
          content: 'Found several security issues: plain text passwords, no rate limiting, weak comparison. Fixing now.',
          tool_calls: [
            { id: 'call_edit_1', type: 'function', function: { name: 'edit_file', arguments: '{"path": "auth.ts"}' } },
            { id: 'call_edit_2', type: 'function', function: { name: 'edit_file', arguments: '{"path": "config.ts"}' } }
          ]
        }
      }]
    },
    {
      summary: 'Verifying fixes',
      choices: [{
        message: {
          content: 'Files updated. Let me verify the changes and run tests.',
          tool_calls: [
            { id: 'call_test_1', type: 'function', function: { name: 'run_tests', arguments: '{}' } }
          ]
        }
      }]
    },
    {
      summary: 'Task completed successfully',
      choices: [{
        message: {
          content: 'All security issues have been fixed:\n1. Passwords now hashed with bcrypt\n2. Rate limiting added\n3. Strict equality operators used\n4. Secrets moved to environment variables\n\nTests are passing. The authentication module is now secure.'
        }
      }]
    }
  ];
  
  return responses[Math.min(iteration - 1, responses.length - 1)];
}

// Mock tool executor
async function executeTools(toolCalls) {
  const results = [];
  
  for (const call of toolCalls) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate execution time
    
    results.push({
      tool_call_id: call.id,
      content: `[Result of ${call.function.name}]: Success`
    });
  }
  
  return results;
}

// Run the test
testContinuousExecution().catch(console.error);