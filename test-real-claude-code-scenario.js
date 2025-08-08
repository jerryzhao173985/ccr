#!/usr/bin/env node

async function testRealClaudeCodeScenario() {
  console.log('='.repeat(80));
  console.log('TESTING REAL CLAUDE CODE MULTI-TURN SCENARIO');
  console.log('='.repeat(80));
  console.log('\nSimulating actual Claude Code interactive mode with tool calls\n');
  
  // This simulates what actually happens in Claude Code interactive mode
  const claudeCodeScenario = {
    model: "openai-responses,o3-mini",
    messages: [
      // System message
      {
        role: "system",
        content: "You are Claude Code, an AI coding assistant."
      },
      
      // First round - user asks to analyze code
      {
        role: "user",
        content: "Understand the whole repo and research continuously to all core files"
      },
      
      // Assistant starts with tools
      {
        role: "assistant",
        content: "I'll help you understand the repository. Let me analyze the structure first."
      },
      
      // Tool call 1: List files
      {
        role: "assistant",
        content: null,  // Typical for tool calls
        tool_calls: [{
          id: "call_list_files",
          type: "function",
          function: {
            name: "glob",
            arguments: JSON.stringify({ pattern: "**/*.ts" })
          }
        }]
      },
      
      // Tool result 1
      {
        role: "tool",
        tool_call_id: "call_list_files",
        content: "src/index.ts\nsrc/server.ts\nsrc/router.ts\nsrc/utils.ts"
      },
      
      // Tool call 2: Read main file
      {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_read_index",
          type: "function",
          function: {
            name: "read",
            arguments: JSON.stringify({ path: "src/index.ts" })
          }
        }]
      },
      
      // Tool result 2
      {
        role: "tool",
        tool_call_id: "call_read_index",
        content: "export function main() { /* ... */ }"
      },
      
      // Tool call 3: Search for patterns
      {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_search",
          type: "function",
          function: {
            name: "grep",
            arguments: JSON.stringify({ pattern: "router", glob: "**/*.ts" })
          }
        }]
      },
      
      // Tool result 3
      {
        role: "tool",
        tool_call_id: "call_search",
        content: "Found 15 matches in 5 files"
      },
      
      // Assistant presents plan
      {
        role: "assistant",
        content: [
          { type: "text", text: "Based on my analysis, here's what I found:" },
          { type: "text", text: "1. The codebase has a modular structure" },
          { type: "text", text: "2. Main entry point is src/index.ts" },
          { type: "text", text: "3. Router logic is in src/router.ts" },
          { type: "text", text: null },  // This can happen in plan mode
          { type: "text", text: "Here's my plan to continue:" },
          { type: "plan", content: "1. Analyze core router logic\n2. Check middleware\n3. Review API endpoints" }
        ]
      },
      
      // User approves plan (second round starts)
      { 
        role: "user", 
        content: null  // This happens in plan approval
      },
      {
        role: "user",
        content: "CONTINUE with the approved plan to investigate further!"
      },
      
      // Second round - immediate tool use
      {
        role: "assistant",
        content: null,  // About to use tools
        tool_calls: [{
          id: "call_read_router",
          type: "function",
          function: {
            name: "read",
            arguments: JSON.stringify({ path: "src/router.ts" })
          }
        }]
      },
      
      // Tool result
      {
        role: "tool",
        tool_call_id: "call_read_router",
        content: null  // Tool might return null if file is empty or missing
      },
      
      // More tool calls
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_multi_1",
            type: "function",
            function: { name: "read", arguments: JSON.stringify({ path: "src/middleware.ts" }) }
          },
          {
            id: "call_multi_2",
            type: "function",
            function: { name: "grep", arguments: JSON.stringify({ pattern: "endpoint" }) }
          }
        ]
      },
      
      // Multiple tool results
      {
        role: "tool",
        tool_call_id: "call_multi_1",
        content: "middleware code here"
      },
      {
        role: "tool",
        tool_call_id: "call_multi_2",
        content: null  // No matches found
      },
      
      // Assistant continues analysis
      {
        role: "assistant",
        content: "I've analyzed the router and middleware. Let me check the API endpoints next."
      }
    ],
    max_tokens: 200,
    temperature: 0.7
  };
  
  console.log('Sending realistic Claude Code multi-turn conversation...');
  console.log('- Multiple tool calls in sequence');
  console.log('- Plan presentation and approval');
  console.log('- Null content in various places');
  console.log('- Second round with immediate tools\n');
  
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(claudeCodeScenario)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      try {
        const error = JSON.parse(responseText);
        
        // Check for specific errors
        if (error.error?.message?.includes("trim is not a function")) {
          console.log('❌ FAILED: trim() error detected!');
          console.log('The content format fix is not working properly.');
        } else if (error.error?.message?.includes("Invalid type for 'input") && 
                   error.error?.message?.includes("null")) {
          console.log('❌ FAILED: Null content error detected!');
          const match = error.error.message.match(/input\[(\d+)\]/);
          if (match) {
            console.log(`Problem at input[${match[1]}]`);
          }
        } else if (error.error?.message?.includes("API key")) {
          console.log('✅ SUCCESS! No errors in message processing.');
          console.log('The conversation was properly formatted for the Responses API.');
          console.log('(API key error is expected in testing)');
        } else {
          console.log('⚠️  Different error occurred:');
          console.log(error.error?.message?.split('\\n')[0]);
        }
      } catch (e) {
        console.log('Could not parse error response');
      }
    } else {
      console.log('✅ COMPLETE SUCCESS! Request processed successfully.');
      const data = JSON.parse(responseText);
      if (data.choices && data.choices[0]) {
        console.log('Assistant response received:', data.choices[0].message.content.substring(0, 100) + '...');
      }
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  // Check logs
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING PROCESSING LOGS');
  console.log('='.repeat(80));
  
  const { execSync } = require('child_process');
  
  // Check for any errors in recent logs
  try {
    const errors = execSync('tail -100 ~/.claude-router/claude-router.log | grep -i "error" | tail -5', 
      { encoding: 'utf-8' });
    if (errors && !errors.includes('invalid_api_key')) {
      console.log('⚠️  Recent errors found (excluding API key errors):');
      console.log(errors);
    } else {
      console.log('✅ No processing errors in recent logs');
    }
  } catch (e) {
    console.log('✅ No errors found in logs');
  }
  
  // Check for successful transformations
  try {
    const transforms = execSync('tail -100 ~/.claude-router/claude-router.log | grep "Transformed request" | tail -3', 
      { encoding: 'utf-8' });
    if (transforms) {
      console.log('\nRecent successful transformations detected');
    }
  } catch (e) {
    // No transforms found
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSION');
  console.log('='.repeat(80));
  console.log('This test simulates the exact scenario that causes issues in Claude Code.');
  console.log('If it passes, the fix is working correctly for real-world usage.');
}

// Run the test
testRealClaudeCodeScenario();