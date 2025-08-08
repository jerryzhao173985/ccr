#!/usr/bin/env node

async function testToolCallScenarios() {
  console.log('='.repeat(80));
  console.log('TOOL CALL NULL CONTENT SCENARIOS TEST');
  console.log('='.repeat(80));
  console.log('\nTesting various tool call scenarios that might cause null content errors:\n');
  
  const scenarios = [
    {
      name: "Assistant message with tool call (OpenAI format)",
      description: "Tool calls often have null content field",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Search for files containing 'router'" },
          { 
            role: "assistant",
            content: null,  // This is typical for tool calls!
            tool_calls: [{
              id: "call_abc123",
              type: "function",
              function: {
                name: "search",
                arguments: JSON.stringify({ query: "router" })
              }
            }]
          },
          {
            role: "tool",
            tool_call_id: "call_abc123",
            content: "Found 5 files: router.ts, index.ts, config.ts, utils.ts, server.ts"
          },
          {
            role: "assistant",
            content: "I found 5 files containing 'router'. The main file is router.ts."
          },
          {
            role: "user",
            content: "Now check the router.ts file"
          }
        ],
        max_tokens: 100
      }
    },
    {
      name: "Anthropic format tool use with mixed content",
      description: "Complex content array with tool_use blocks",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Analyze the codebase" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "I'll analyze the codebase for you." },
              { 
                type: "tool_use", 
                id: "toolu_01",
                name: "read_file",
                input: { path: "/src/index.ts" }
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: "toolu_01",
                content: "File contents here..."
              }
            ]
          },
          {
            role: "assistant",
            content: null  // Assistant thinking before next tool call
          },
          {
            role: "assistant",
            content: [
              { type: "text", text: null },  // Null text in plan
              {
                type: "tool_use",
                id: "toolu_02", 
                name: "search",
                input: { query: "function" }
              }
            ]
          },
          {
            role: "user",
            content: "Continue with your analysis"
          }
        ],
        max_tokens: 100
      }
    },
    {
      name: "Multiple tool calls in sequence (Plan mode scenario)",
      description: "Simulates Claude Code plan mode with multiple tools",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are Claude Code, a coding assistant." },
          { role: "user", content: "Help me refactor this codebase" },
          // First round - assistant uses multiple tools
          {
            role: "assistant",
            content: "I'll help you refactor. Let me first understand the structure."
          },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "list_files", arguments: "{}" }
              }
            ]
          },
          {
            role: "tool",
            tool_call_id: "call_1",
            content: "src/\n  router.ts\n  index.ts\n  utils.ts"
          },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_2",
                type: "function",
                function: { name: "read_file", arguments: JSON.stringify({ path: "src/router.ts" }) }
              }
            ]
          },
          {
            role: "tool",
            tool_call_id: "call_2",
            content: "export function router() { /* code */ }"
          },
          {
            role: "assistant",
            content: [
              { type: "text", text: "Based on my analysis, here's my refactoring plan:" },
              { type: "text", text: null },  // Null in plan content
              { type: "plan", content: "1. Extract interfaces\n2. Separate concerns" }
            ]
          },
          // User approves and continues (second round)
          { role: "user", content: null },  // This can be null in plan approval
          { role: "user", content: "CONTINUE with the approved plan" }
        ],
        max_tokens: 200
      }
    },
    {
      name: "Tool result with null content",
      description: "Tool returns null or empty result",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Check if file exists" },
          {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_check",
              type: "function",
              function: { name: "file_exists", arguments: JSON.stringify({ path: "missing.txt" }) }
            }]
          },
          {
            role: "tool",
            tool_call_id: "call_check",
            content: null  // Tool returns null for missing file
          },
          {
            role: "assistant",
            content: "The file doesn't exist."
          },
          { role: "user", content: "Create the file then" }
        ],
        max_tokens: 100
      }
    },
    {
      name: "Second round needs tools first (continuation)",
      description: "After plan approval, immediately needs tools",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Fix all type errors in the project" },
          { role: "assistant", content: "I'll fix all type errors. Let me check them first." },
          {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_tsc",
              type: "function",
              function: { name: "run_command", arguments: JSON.stringify({ cmd: "tsc --noEmit" }) }
            }]
          },
          {
            role: "tool",
            tool_call_id: "call_tsc",
            content: "Error: Type 'null' is not assignable to type 'string'"
          },
          {
            role: "assistant",
            content: [
              { type: "text", text: "Found 1 type error. Here's my plan to fix it:" },
              { type: "plan", text: "1. Fix null assignment\n2. Run tests\n3. Verify" }
            ]
          },
          // Plan approved, second round starts with immediate tool use
          { role: "user", content: "Approved. Fix it." },
          {
            role: "assistant",
            content: null,  // About to use tool
            tool_calls: [{
              id: "call_fix",
              type: "function",
              function: { name: "edit_file", arguments: JSON.stringify({ 
                path: "src/index.ts",
                old: "value: null",
                new: "value: ''"
              })}
            }]
          }
        ],
        max_tokens: 100
      }
    }
  ];
  
  console.log(`Running ${scenarios.length} tool call scenarios...\n`);
  let passCount = 0;
  let failCount = 0;
  
  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.name}`);
    console.log(`Description: ${scenario.description}`);
    console.log('-'.repeat(60));
    
    try {
      const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scenario.request)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        try {
          const error = JSON.parse(responseText);
          
          // Check for null content errors
          if (error.error?.message?.includes("Invalid type for 'input") && 
              error.error?.message?.includes("content") &&
              (error.error?.message?.includes("null") || error.error?.message?.includes("undefined"))) {
            console.log('❌ FAILED: Null content error in tool-related message');
            const match = error.error.message.match(/input\[(\d+)\]/);
            if (match) {
              console.log(`   Problem at input[${match[1]}] - likely a tool-related message`);
            }
            console.log(`   Error: ${error.error.message.split('\\n')[0]}`);
            failCount++;
          } else if (error.error?.message?.includes("API key")) {
            console.log('✅ PASSED: No null content errors (API key error is expected)');
            passCount++;
          } else {
            console.log('⚠️  Different error (checking for null issues):');
            const errorMsg = error.error?.message || JSON.stringify(error);
            if (errorMsg.includes('null') || errorMsg.includes('undefined')) {
              console.log('❌ FAILED: Possible null-related error');
              failCount++;
            } else {
              console.log('✅ PASSED: No null content issues detected');
              passCount++;
            }
          }
        } catch (e) {
          console.log('⚠️  Could not parse error response');
        }
      } else {
        console.log('✅ PASSED: Request succeeded completely');
        passCount++;
      }
      
    } catch (error) {
      console.log('❌ FAILED: Request error');
      console.log(`   Error: ${error.message}`);
      failCount++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TOOL CALL TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total scenarios: ${scenarios.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 SUCCESS! All tool call scenarios handled correctly.');
  } else {
    console.log('\n⚠️  FAILURE! Tool call scenarios are causing null content errors.');
    console.log('The issue is likely with messages containing tool_calls or tool_use blocks.');
  }
  
  // Check recent logs
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING RECENT LOGS FOR TOOL-RELATED ISSUES');
  console.log('='.repeat(80));
  
  const { execSync } = require('child_process');
  try {
    const logs = execSync('tail -100 ~/.claude-router/claude-router.log | grep -E "tool|null|undefined" | tail -20', 
      { encoding: 'utf-8' });
    if (logs) {
      console.log('Recent relevant logs:');
      console.log(logs);
    }
  } catch (e) {
    console.log('No relevant logs found.');
  }
}

// Run the test
testToolCallScenarios();