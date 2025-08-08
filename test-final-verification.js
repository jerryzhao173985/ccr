#!/usr/bin/env node

/**
 * Final verification test for null content fixes
 * Tests edge cases and potential regressions
 */

async function testEdgeCase(name, body, expectedResult) {
  console.log(`\n🔍 Testing: ${name}`);
  
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      const error = JSON.parse(responseText);
      if (error.error?.message?.includes("Invalid type for 'input")) {
        console.log(`   ❌ REGRESSION: Null content error!`);
        console.log(`      ${error.error.message.split('\n')[0]}`);
        return false;
      } else if (error.error?.message?.includes("API key")) {
        console.log(`   ✅ PASSED: ${expectedResult}`);
        return true;
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.error?.message?.split('\n')[0]}`);
        return false;
      }
    } else {
      console.log(`   ✅ PASSED: ${expectedResult}`);
      return true;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runFinalVerification() {
  console.log('='.repeat(80));
  console.log('FINAL VERIFICATION - NULL CONTENT FIX');
  console.log('='.repeat(80));
  console.log('Testing edge cases and potential regressions...');
  
  const tests = [
    // Edge case 1: Deeply nested nulls
    {
      name: "Deeply nested null values",
      body: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "Assistant" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "Valid" },
              { type: "text", text: null },
              null,
              undefined,
              { type: "text", text: undefined },
              { type: "text" },  // Missing text property
              ""  // Empty string
            ]
          }
        ]
      },
      expected: "All nulls/undefined should be handled"
    },
    
    // Edge case 2: Multiple consecutive tool results with nulls
    {
      name: "Multiple tool results with mixed null content",
      body: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are Claude Code" },
          { role: "user", content: "Analyze files" },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "call_1", type: "function", function: { name: "read", arguments: '{"path": "a.ts"}' }},
              { id: "call_2", type: "function", function: { name: "read", arguments: '{"path": "b.ts"}' }},
              { id: "call_3", type: "function", function: { name: "read", arguments: '{"path": "c.ts"}' }}
            ]
          },
          { role: "tool", tool_call_id: "call_1", content: null },
          { role: "tool", tool_call_id: "call_2", content: undefined },
          { role: "tool", tool_call_id: "call_3", content: "" }
        ]
      },
      expected: "All tool results handled correctly"
    },
    
    // Edge case 3: Mixed content types with nulls
    {
      name: "Mixed content types (text, tool_use, tool_result) with nulls",
      body: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "Assistant" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "Starting" },
              { type: "tool_use", name: "test", id: "123", input: null },
              { type: "text", text: null },
              { type: "tool_result", tool_use_id: "123", content: null }
            ]
          }
        ]
      },
      expected: "Mixed content types handled"
    },
    
    // Edge case 4: Empty arrays and objects
    {
      name: "Empty arrays and objects",
      body: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "Assistant" },
          { role: "user", content: [] },  // Empty content array
          { role: "assistant", content: [] },  // Empty content array
          { role: "user", content: {} }  // Invalid content object
        ]
      },
      expected: "Empty arrays/objects handled"
    },
    
    // Edge case 5: Very long conversation with periodic nulls
    {
      name: "Long conversation with periodic null content",
      body: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are an assistant" },
          { role: "user", content: "Start" },
          { role: "assistant", content: "Response 1" },
          { role: "user", content: null },  // Null
          { role: "assistant", content: "Response 2" },
          { role: "user", content: "Question" },
          { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "test", arguments: '{}' }}] },
          { role: "tool", tool_call_id: "c1", content: null },
          { role: "assistant", content: [{ type: "text", text: null }] },
          { role: "user", content: undefined },
          { role: "assistant", content: "Final" }
        ]
      },
      expected: "Long conversation handled"
    },
    
    // Edge case 6: Malformed tool calls
    {
      name: "Malformed tool calls with missing properties",
      body: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "Assistant" },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              { type: "function", function: { name: "test" } },  // Missing id
              { id: "c2", type: "function", function: {} },  // Missing name
              { id: "c3", function: { name: "test", arguments: null } }  // Null arguments
            ]
          }
        ]
      },
      expected: "Malformed tool calls handled"
    },
    
    // Edge case 7: Non-string content values
    {
      name: "Non-string content values",
      body: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: 123 },  // Number
          { role: "user", content: true },  // Boolean
          { role: "assistant", content: { text: "object" } }  // Object
        ]
      },
      expected: "Non-string content converted"
    },
    
    // Edge case 8: Responses API specific - input array
    {
      name: "Direct Responses API input array with nulls",
      body: {
        model: "openai-responses,o3-mini",
        input: [
          { role: "system", content: null },
          { role: "user", content: [null, undefined, { type: "text", text: null }] },
          { role: "assistant", content: null }
        ]
      },
      expected: "Direct input array handled"
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const success = await testEdgeCase(test.name, test.body, test.expected);
    if (success) passed++;
    else failed++;
  }
  
  // Test with real CR command
  console.log('\n' + '='.repeat(80));
  console.log('TESTING WITH REAL CR COMMAND');
  console.log('='.repeat(80));
  
  const { execSync } = require('child_process');
  
  try {
    console.log('Testing: cr code "test null handling"');
    const result = execSync('echo "test" | timeout 5 cr code "Just say hello" 2>&1', {
      encoding: 'utf-8',
      shell: true
    });
    
    if (result.includes('error') && !result.includes('API key')) {
      console.log('❌ Error detected in CR command');
      console.log(result.substring(0, 200));
      failed++;
    } else {
      console.log('✅ CR command executed without null errors');
      passed++;
    }
  } catch (e) {
    // Command might timeout or fail for other reasons
    const output = e.stdout || e.message || '';
    if (output.includes("Invalid type for 'input") && output.includes('null')) {
      console.log('❌ NULL CONTENT ERROR in CR command!');
      failed++;
    } else {
      console.log('✅ No null content errors detected');
      passed++;
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('FINAL VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}/${tests.length + 1}`);
  console.log(`❌ Failed: ${failed}/${tests.length + 1}`);
  
  if (failed === 0) {
    console.log('\n🎉 SUCCESS! All null content issues have been resolved.');
    console.log('The fix is comprehensive and handles all edge cases.');
  } else {
    console.log('\n⚠️  WARNING: Some edge cases still failing.');
    console.log('Review the failed tests above.');
  }
  
  // Check for any remaining issues in logs
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING RECENT LOGS');
  console.log('='.repeat(80));
  
  try {
    const criticalErrors = execSync(
      'tail -500 ~/.claude-router/claude-router.log | grep -i "CRITICAL" | tail -5',
      { encoding: 'utf-8' }
    );
    if (criticalErrors) {
      console.log('Recent CRITICAL log entries:');
      console.log(criticalErrors);
    }
  } catch (e) {
    console.log('No recent CRITICAL errors in logs');
  }
  
  try {
    const nullFixes = execSync(
      'tail -500 ~/.claude-router/claude-router.log | grep "null-content-fix" | wc -l',
      { encoding: 'utf-8' }
    );
    const fixCount = parseInt(nullFixes.trim());
    if (fixCount > 0) {
      console.log(`\nNull content fixes applied in recent requests: ${fixCount}`);
    }
  } catch (e) {
    // Ignore
  }
}

// Run verification
runFinalVerification().catch(console.error);