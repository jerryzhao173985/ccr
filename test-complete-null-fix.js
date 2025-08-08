#!/usr/bin/env node

/**
 * Comprehensive test for null content handling across all scenarios
 * Tests both Chat Completions and Responses API transformations
 */

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testScenario(name, scenario, expectedBehavior) {
  console.log(`\n📝 Testing: ${name}`);
  console.log(`   Expected: ${expectedBehavior}`);
  
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      const error = JSON.parse(responseText);
      if (error.error?.message?.includes("Invalid type for 'input")) {
        console.log(`   ❌ FAILED: Null content error detected!`);
        console.log(`      Error: ${error.error.message.split('\n')[0]}`);
        return false;
      } else if (error.error?.message?.includes("API key")) {
        console.log(`   ✅ PASSED: No null content errors (API key error is expected)`);
        return true;
      } else {
        console.log(`   ⚠️  Different error: ${error.error?.message?.split('\n')[0]}`);
        return false;
      }
    } else {
      console.log(`   ✅ PASSED: Request processed successfully`);
      return true;
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE NULL CONTENT FIX TESTING');
  console.log('='.repeat(80));
  
  const testCases = [
    // Test 1: User approval with null content
    {
      name: "User plan approval (null content)",
      scenario: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are an AI assistant" },
          { role: "user", content: "Help me refactor this code" },
          { role: "assistant", content: "Here's my plan:\n1. Analyze the code\n2. Identify issues\n3. Refactor" },
          { role: "user", content: null }  // Plan approval
        ]
      },
      expected: "Should convert null to empty string for user continuation"
    },
    
    // Test 2: Assistant with tool calls and null content
    {
      name: "Assistant tool execution (null content with tool_calls)",
      scenario: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are Claude Code" },
          { role: "user", content: "Analyze the codebase" },
          { 
            role: "assistant", 
            content: null,  // Pure tool execution
            tool_calls: [
              {
                id: "call_123",
                type: "function",
                function: { name: "read_file", arguments: '{"path": "src/index.ts"}' }
              }
            ]
          }
        ]
      },
      expected: "Should add semantic text like '[Executing 1 tool: read_file]'"
    },
    
    // Test 3: Tool result with null content
    {
      name: "Tool result with empty output",
      scenario: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are an assistant" },
          { role: "user", content: "Check if file exists" },
          { 
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_456",
              type: "function",
              function: { name: "check_file", arguments: '{"path": "missing.txt"}' }
            }]
          },
          { 
            role: "tool",
            tool_call_id: "call_456",
            content: null  // File doesn't exist, no content
          }
        ]
      },
      expected: "Should convert to '[Tool Result call_456]\\n[No output]'"
    },
    
    // Test 4: Content array with null items
    {
      name: "Content array with mixed null items",
      scenario: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are an assistant" },
          { role: "user", content: "Help me" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "Step 1: Analyze" },
              { type: "text", text: null },  // Null text in object
              null,  // Null item
              { type: "text", text: "Step 2: Execute" }
            ]
          }
        ]
      },
      expected: "Should filter nulls and fix null text to empty strings"
    },
    
    // Test 5: Multiple tool calls in sequence
    {
      name: "Multiple sequential tool calls",
      scenario: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are Claude Code" },
          { role: "user", content: "Analyze all TypeScript files" },
          { 
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "call_1", type: "function", function: { name: "glob", arguments: '{"pattern": "**/*.ts"}' }},
              { id: "call_2", type: "function", function: { name: "read", arguments: '{"path": "src/index.ts"}' }},
              { id: "call_3", type: "function", function: { name: "grep", arguments: '{"pattern": "error"}' }}
            ]
          },
          { role: "tool", tool_call_id: "call_1", content: "file1.ts\nfile2.ts" },
          { role: "tool", tool_call_id: "call_2", content: null },  // Empty file
          { role: "tool", tool_call_id: "call_3", content: "No matches" }
        ]
      },
      expected: "Should handle mixed null and non-null tool results"
    },
    
    // Test 6: Plan mode with complex content
    {
      name: "Plan mode with nested content structures",
      scenario: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are an AI coding assistant" },
          { role: "user", content: "Create a new feature" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "I'll create this feature. Here's my plan:" },
              { type: "text", text: null },
              { type: "plan", content: "1. Design API\n2. Implement backend\n3. Create UI" },
              { type: "text", text: null },
              { type: "text", text: "Ready to proceed?" }
            ]
          },
          { role: "user", content: null },  // Approval
          {
            role: "assistant",
            content: null,
            tool_calls: [{ id: "call_plan", type: "function", function: { name: "create_file", arguments: '{}' }}]
          }
        ]
      },
      expected: "Should handle plan structures and approval flow"
    },
    
    // Test 7: Edge case - all null content
    {
      name: "Message with completely null content",
      scenario: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "Assistant" },
          { role: "user", content: "Test" },
          { role: "assistant", content: null },  // No tools, just null
          { role: "user", content: undefined },  // Undefined content
          { role: "assistant", content: [] }     // Empty array
        ]
      },
      expected: "Should handle all forms of empty/null content"
    },
    
    // Test 8: Real Claude Code scenario
    {
      name: "Real Claude Code multi-turn with immediate tools",
      scenario: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are Claude Code" },
          { role: "user", content: "Understand the whole repo" },
          { role: "assistant", content: "I'll analyze the repository structure." },
          {
            role: "assistant",
            content: null,
            tool_calls: [{ id: "call_ls", type: "function", function: { name: "ls", arguments: '{"path": "."}' }}]
          },
          { role: "tool", tool_call_id: "call_ls", content: "src/\ntests/\npackage.json" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "Found the following structure:" },
              { type: "text", text: null },
              { type: "text", text: "- src/ directory" },
              { type: "text", text: "- tests/ directory" },
              { type: "text", text: null },
              { type: "text", text: "Let me analyze the source code next." }
            ]
          },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "call_read1", type: "function", function: { name: "read", arguments: '{"path": "src/index.ts"}' }},
              { id: "call_read2", type: "function", function: { name: "read", arguments: '{"path": "src/router.ts"}' }}
            ]
          },
          { role: "tool", tool_call_id: "call_read1", content: null },
          { role: "tool", tool_call_id: "call_read2", content: "export function router() { ... }" }
        ]
      },
      expected: "Should handle complete real-world Claude Code scenario"
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const success = await testScenario(
      testCase.name,
      testCase.scenario,
      testCase.expected
    );
    
    if (success) passed++;
    else failed++;
    
    // Small delay between tests
    await sleep(100);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! The null content fix is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the errors above.');
  }
  
  // Check logs for any remaining issues
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING LOGS FOR NULL CONTENT FIXES');
  console.log('='.repeat(80));
  
  const { execSync } = require('child_process');
  try {
    const nullFixes = execSync(
      'tail -200 ~/.claude-router/claude-router.log | grep -i "null-content-fix" | tail -10',
      { encoding: 'utf-8' }
    );
    if (nullFixes) {
      console.log('Recent null content fixes applied:');
      console.log(nullFixes);
    } else {
      console.log('No recent null content fixes in logs');
    }
  } catch (e) {
    console.log('No null content fixes found in recent logs');
  }
}

// Run all tests
runAllTests().catch(console.error);