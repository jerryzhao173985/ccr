#!/usr/bin/env node

async function testProperToolFlow() {
  console.log('='.repeat(80));
  console.log('TESTING PROPER TOOL FLOW WITH RESPONSES API');
  console.log('='.repeat(80));
  console.log('\nThis test verifies that tool calls are properly handled in multi-turn conversations\n');
  
  // Real-world scenario that mimics Claude Code behavior
  const realWorldScenario = {
    model: "openai-responses,o3-mini",
    messages: [
      // System prompt
      {
        role: "system",
        content: "You are Claude Code, an AI coding assistant that helps with software development."
      },
      
      // Round 1: User asks to analyze and fix code
      {
        role: "user",
        content: "Analyze the router.ts file and fix any issues you find"
      },
      
      // Assistant explains and then uses tools
      {
        role: "assistant",
        content: "I'll analyze the router.ts file and fix any issues I find. Let me start by reading the file."
      },
      
      // Tool call 1: Read file (null content is EXPECTED here)
      {
        role: "assistant",
        content: null,  // NULL because action is in tool_calls
        tool_calls: [{
          id: "call_read_001",
          type: "function",
          function: {
            name: "read_file",
            arguments: JSON.stringify({ path: "src/router.ts" })
          }
        }]
      },
      
      // Tool result 1
      {
        role: "tool",
        tool_call_id: "call_read_001",
        content: "export function router(req, res) {\n  // TODO: implement routing\n  if (req.url = '/api') {  // Bug: should be ==\n    res.send('API');\n  }\n}"
      },
      
      // Assistant analyzes and finds issues
      {
        role: "assistant",
        content: "I found an issue in the router.ts file. There's a bug where the equality check uses assignment (=) instead of comparison (==). Let me also search for similar issues in other files."
      },
      
      // Tool call 2: Search for similar patterns
      {
        role: "assistant",
        content: null,  // NULL again for tool execution
        tool_calls: [{
          id: "call_search_002",
          type: "function",
          function: {
            name: "grep",
            arguments: JSON.stringify({ 
              pattern: "if.*=.*['\"]", 
              glob: "**/*.ts" 
            })
          }
        }]
      },
      
      // Tool result 2
      {
        role: "tool",
        tool_call_id: "call_search_002",
        content: "Found 3 matches:\nsrc/router.ts:3: if (req.url = '/api')\nsrc/handler.ts:15: if (status = 'error')\nsrc/utils.ts:8: if (mode = 'debug')"
      },
      
      // Assistant presents plan
      {
        role: "assistant",
        content: "I found 3 instances of this bug pattern. Here's my plan to fix them:\n\n1. Fix router.ts line 3: Change = to ==\n2. Fix handler.ts line 15: Change = to ==\n3. Fix utils.ts line 8: Change = to ==\n\nI'll now proceed to fix these issues."
      },
      
      // Multiple parallel tool calls to fix issues
      {
        role: "assistant",
        content: null,  // NULL for multiple tool executions
        tool_calls: [
          {
            id: "call_fix_003",
            type: "function",
            function: {
              name: "edit_file",
              arguments: JSON.stringify({
                path: "src/router.ts",
                old: "if (req.url = '/api')",
                new: "if (req.url == '/api')"
              })
            }
          },
          {
            id: "call_fix_004",
            type: "function",
            function: {
              name: "edit_file",
              arguments: JSON.stringify({
                path: "src/handler.ts",
                old: "if (status = 'error')",
                new: "if (status == 'error')"
              })
            }
          },
          {
            id: "call_fix_005",
            type: "function",
            function: {
              name: "edit_file",
              arguments: JSON.stringify({
                path: "src/utils.ts",
                old: "if (mode = 'debug')",
                new: "if (mode == 'debug')"
              })
            }
          }
        ]
      },
      
      // Tool results from parallel execution
      {
        role: "tool",
        tool_call_id: "call_fix_003",
        content: "File updated successfully"
      },
      {
        role: "tool",
        tool_call_id: "call_fix_004",
        content: "File updated successfully"
      },
      {
        role: "tool",
        tool_call_id: "call_fix_005",
        content: "File updated successfully"
      },
      
      // Assistant confirms completion
      {
        role: "assistant",
        content: "I've successfully fixed all 3 instances of the assignment-in-condition bug. Let me run a quick test to ensure everything still works."
      },
      
      // Final tool call to test
      {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_test_006",
          type: "function",
          function: {
            name: "run_command",
            arguments: JSON.stringify({ command: "npm test" })
          }
        }]
      },
      
      // Test result (might be null if tests don't produce output)
      {
        role: "tool",
        tool_call_id: "call_test_006",
        content: null  // NULL tool result - tests passed silently
      },
      
      // Round 2: User asks to continue
      {
        role: "user",
        content: "Good work! Now also add proper TypeScript types to the router function"
      },
      
      // Assistant immediately uses tools (common pattern in Round 2)
      {
        role: "assistant",
        content: null,  // NULL - going straight to action
        tool_calls: [{
          id: "call_type_007",
          type: "function",
          function: {
            name: "edit_file",
            arguments: JSON.stringify({
              path: "src/router.ts",
              old: "export function router(req, res)",
              new: "export function router(req: Request, res: Response): void"
            })
          }
        }]
      }
    ],
    max_tokens: 500,
    temperature: 0.7
  };
  
  console.log('Sending comprehensive real-world scenario with:');
  console.log('- Multiple rounds of conversation');
  console.log('- Single and parallel tool calls');
  console.log('- Null content in various contexts');
  console.log('- Tool results that might be null');
  console.log('- Immediate tool use in second round\n');
  
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(realWorldScenario)
    });

    const responseText = await response.text();
    
    console.log('-'.repeat(80));
    console.log('RESPONSE ANALYSIS');
    console.log('-'.repeat(80));
    
    if (!response.ok) {
      const error = JSON.parse(responseText);
      
      // Analyze the error
      if (error.error?.message?.includes("trim is not a function")) {
        console.log('❌ FAILED: trim() error still present');
        console.log('The content type handling is not working correctly');
      } else if (error.error?.message?.includes("Invalid type for 'input") && 
                 error.error?.message?.includes("null")) {
        console.log('❌ FAILED: Null content not properly handled');
        const match = error.error.message.match(/input\[(\d+)\]/);
        if (match) {
          console.log(`Problem at message index ${match[1]}`);
          console.log('This suggests the message transformation is incomplete');
        }
      } else if (error.error?.message?.includes("API key")) {
        console.log('✅ SUCCESS: Request processed without structural errors');
        console.log('The tool flow is working correctly');
        console.log('(API key error is expected in testing)');
      } else {
        console.log('⚠️  Other error:', error.error?.message?.split('\\n')[0]);
      }
    } else {
      console.log('✅ COMPLETE SUCCESS: Request fully processed');
      const data = JSON.parse(responseText);
      
      if (data.choices && data.choices[0]) {
        const message = data.choices[0].message;
        console.log('\nResponse details:');
        console.log(`- Role: ${message.role}`);
        console.log(`- Has content: ${message.content ? 'Yes' : 'No'}`);
        console.log(`- Has tool calls: ${message.tool_calls ? `Yes (${message.tool_calls.length})` : 'No'}`);
        console.log(`- Finish reason: ${data.choices[0].finish_reason}`);
        
        if (data.choices[0].finish_reason === 'tool_calls') {
          console.log('\n⚠️  WARNING: finish_reason is "tool_calls"');
          console.log('This means the conversation will STOP and wait for tool results');
          console.log('For continuous execution, it should be "stop"');
        } else if (data.choices[0].finish_reason === 'stop') {
          console.log('\n✅ Correct finish_reason for continuous execution');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  // Analyze logs
  console.log('\n' + '-'.repeat(80));
  console.log('LOG ANALYSIS');
  console.log('-'.repeat(80));
  
  const { execSync } = require('child_process');
  
  // Check how messages were transformed
  try {
    const transformLogs = execSync(
      'tail -100 ~/.claude-router/claude-router.log | grep -E "Transformed request|Tool:|tool_calls|finish_reason" | tail -10',
      { encoding: 'utf-8' }
    );
    if (transformLogs) {
      console.log('\nRecent transformation logs:');
      console.log(transformLogs);
    }
  } catch (e) {}
  
  // Check for continuous execution
  try {
    const execLogs = execSync(
      'tail -100 ~/.claude-router/claude-router.log | grep -E "Continuous execution|forcing continuation" | tail -5',
      { encoding: 'utf-8' }
    );
    if (execLogs) {
      console.log('\nContinuous execution logs:');
      console.log(execLogs);
    }
  } catch (e) {}
  
  console.log('\n' + '='.repeat(80));
  console.log('KEY INSIGHTS');
  console.log('='.repeat(80));
  
  console.log('\nFor proper tool flow:');
  console.log('1. Null content with tool_calls is EXPECTED and VALID');
  console.log('2. Tool results should be integrated into user messages');
  console.log('3. finish_reason should be "stop" for continuous execution');
  console.log('4. The transformer should preserve tool call information');
  console.log('5. Multi-turn conversations should maintain context');
  
  console.log('\n' + '='.repeat(80));
}

// Run the test
testProperToolFlow();