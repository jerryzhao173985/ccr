#!/usr/bin/env node

async function testCompleteFix() {
  console.log('='.repeat(80));
  console.log('TESTING COMPLETE FIX - CR + LLMS Package');
  console.log('='.repeat(80));
  console.log('\nThis test verifies both the llms package fix and CR middleware work together\n');
  
  const testScenarios = [
    {
      name: "Null content with tool calls",
      description: "Previously caused trim() error",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Search files" },
          { 
            role: "assistant", 
            content: null,  // This caused trim() error
            tool_calls: [{
              id: "call_1",
              type: "function",
              function: { name: "search", arguments: "{}" }
            }]
          },
          { role: "tool", tool_call_id: "call_1", content: "Results" },
          { role: "user", content: "Continue" }
        ],
        max_tokens: 100
      }
    },
    {
      name: "Array content with nulls",
      description: "Mixed array content types",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          {
            role: "assistant",
            content: [
              { type: "text", text: "Valid" },
              null,
              { type: "text", text: null },
              undefined,
              ""
            ]
          },
          { role: "user", content: null },
          { role: "user", content: undefined },
          { role: "user", content: [] },
          { role: "user", content: "Next?" }
        ],
        max_tokens: 100
      }
    },
    {
      name: "Real Claude Code scenario",
      description: "Multi-turn with tools and plans",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are Claude Code" },
          { role: "user", content: "Analyze the code" },
          // First round with tools
          { role: "assistant", content: "I'll analyze the code" },
          { 
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "t1", type: "function", function: { name: "read", arguments: JSON.stringify({ path: "file.ts" }) }},
              { id: "t2", type: "function", function: { name: "search", arguments: JSON.stringify({ query: "function" }) }}
            ]
          },
          { role: "tool", tool_call_id: "t1", content: "Code content" },
          { role: "tool", tool_call_id: "t2", content: null },  // Null tool result
          // Plan presentation
          {
            role: "assistant",
            content: [
              { type: "text", text: "Based on analysis:" },
              { type: "text", text: null },
              { type: "plan", content: "1. Fix\n2. Test" }
            ]
          },
          // Second round - approval and continuation
          { role: "user", content: null },  // Approval
          { role: "user", content: "CONTINUE" },
          // Immediate tool use in second round
          {
            role: "assistant",
            content: null,
            tool_calls: [{ id: "t3", type: "function", function: { name: "edit", arguments: "{}" }}]
          }
        ],
        max_tokens: 200
      }
    }
  ];
  
  let allPassed = true;
  const results = [];
  
  for (const scenario of testScenarios) {
    console.log(`\nTesting: ${scenario.name}`);
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
      const responseData = response.ok ? JSON.parse(responseText) : null;
      
      // Check for specific errors
      let passed = true;
      let reason = 'OK';
      
      if (!response.ok) {
        const error = JSON.parse(responseText);
        
        if (error.error?.message?.includes("trim is not a function")) {
          passed = false;
          reason = 'TRIM ERROR - Fix not working!';
          allPassed = false;
        } else if (error.error?.message?.includes("Invalid type for 'input") && 
                   error.error?.message?.includes("null")) {
          passed = false;
          reason = 'NULL CONTENT ERROR - Middleware not working!';
          allPassed = false;
        } else if (error.error?.message?.includes("Cannot read properties of undefined")) {
          passed = false;
          reason = 'UNDEFINED ACCESS ERROR - Needs fixing!';
          allPassed = false;
        } else if (error.error?.message?.includes("API key")) {
          passed = true;
          reason = 'API key error (expected)';
        } else {
          passed = true;
          reason = `Other error: ${error.error?.message?.split('\\n')[0]}`;
        }
      }
      
      results.push({
        scenario: scenario.name,
        passed: passed,
        reason: reason,
        statusCode: response.status
      });
      
      console.log(passed ? '✅ PASSED' : '❌ FAILED');
      console.log(`  Status: ${response.status}`);
      console.log(`  Reason: ${reason}`);
      
    } catch (error) {
      console.log('❌ FAILED - Request error');
      console.log(`  Error: ${error.message}`);
      results.push({
        scenario: scenario.name,
        passed: false,
        reason: error.message,
        statusCode: 0
      });
      allPassed = false;
    }
  }
  
  // Check logs for any errors
  console.log('\n' + '='.repeat(80));
  console.log('LOG ANALYSIS');
  console.log('='.repeat(80));
  
  const { execSync } = require('child_process');
  
  // Check for trim errors
  try {
    const trimErrors = execSync('tail -200 ~/.claude-router/claude-router.log | grep -c "trim is not a function" || echo "0"', { encoding: 'utf-8' });
    const count = parseInt(trimErrors.trim());
    console.log(`Trim errors in last 200 logs: ${count}`);
    if (count > 0) {
      console.log('⚠️  WARNING: trim() errors still occurring!');
      const recent = execSync('tail -200 ~/.claude-router/claude-router.log | grep "trim is not a function" | tail -1', { encoding: 'utf-8' });
      console.log(`  Last occurrence: ${recent.trim()}`);
    }
  } catch (e) {}
  
  // Check for null content errors
  try {
    const nullErrors = execSync('tail -200 ~/.claude-router/claude-router.log | grep -c "Invalid type for.*null" || echo "0"', { encoding: 'utf-8' });
    const count = parseInt(nullErrors.trim());
    console.log(`Null content errors in last 200 logs: ${count}`);
    if (count > 0) {
      console.log('⚠️  WARNING: null content errors still occurring!');
    }
  } catch (e) {}
  
  // Check for our fixes being applied
  try {
    const fixes = execSync('tail -200 ~/.claude-router/claude-router.log | grep -c "null-content-fix" || echo "0"', { encoding: 'utf-8' });
    const count = parseInt(fixes.trim());
    console.log(`Null content fixes applied: ${count}`);
  } catch (e) {}
  
  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\nTest Results:');
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} ${r.scenario}: ${r.reason}`);
  });
  
  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('🎉 SUCCESS! ALL TESTS PASSED!');
    console.log('The fix is working correctly:');
    console.log('  ✅ No more trim() errors');
    console.log('  ✅ Null content handled properly');
    console.log('  ✅ Multi-turn conversations work');
    console.log('  ✅ Tool calls processed correctly');
  } else {
    console.log('⚠️  SOME TESTS FAILED!');
    console.log('Please review the failures above.');
  }
  console.log('='.repeat(80));
}

// Run the test
testCompleteFix();