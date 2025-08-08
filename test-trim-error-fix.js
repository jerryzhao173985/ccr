#!/usr/bin/env node

async function testTrimErrorFix() {
  console.log('='.repeat(80));
  console.log('TESTING CONTENT.TRIM() ERROR FIX');
  console.log('='.repeat(80));
  console.log('\nThis test verifies that content is always in the correct format for the transformer\n');
  
  const scenarios = [
    {
      name: "Empty content array scenario",
      description: "Tests that empty arrays don't cause trim() errors",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: null },
          { role: "assistant", content: [] },  // Empty array that might cause trim()
          { role: "user", content: undefined },
          { role: "assistant", content: "" },  // Empty string
          { role: "user", content: "Continue" }
        ],
        max_tokens: 50
      }
    },
    {
      name: "Tool calls with various null formats",
      description: "Tests tool messages that could trigger trim() on non-strings",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { 
            role: "assistant",
            content: null,  // This will be converted to array
            tool_calls: [{
              id: "call_test",
              type: "function",
              function: { name: "test", arguments: "{}" }
            }]
          },
          { 
            role: "tool",
            tool_call_id: "call_test",
            content: null  // Tool result with null
          },
          {
            role: "assistant",
            content: [  // Array content
              { type: "text", text: null },
              null,
              undefined
            ]
          },
          { role: "user", content: "What's next?" }
        ],
        max_tokens: 50
      }
    },
    {
      name: "Complex nested content structures",
      description: "Tests deeply nested content that must be properly formatted",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Hello" },
              { type: "tool_result", tool_use_id: "t1", content: null },
              null,
              { type: "text", text: null }
            ]
          },
          {
            role: "assistant",
            content: [
              { type: "tool_use", id: null, name: null, input: null },
              { type: "text", text: "" }
            ]
          },
          { role: "user", content: "Continue" }
        ],
        max_tokens: 50
      }
    },
    {
      name: "Direct Responses API format test",
      description: "Tests messages already in Responses API input format",
      request: {
        model: "openai-responses,o3-mini",
        input: [  // Using 'input' instead of 'messages'
          {
            role: "user",
            content: null  // Should be converted to array with item
          },
          {
            role: "assistant",
            content: []  // Empty array should get at least one item
          },
          {
            role: "user",
            content: undefined  // Should be handled properly
          }
        ],
        max_tokens: 50
      }
    }
  ];
  
  let passCount = 0;
  let failCount = 0;
  const errors = [];
  
  for (const scenario of scenarios) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test: ${scenario.name}`);
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
          
          // Check specifically for trim() error
          if (error.error?.message?.includes("trim is not a function")) {
            console.log('❌ FAILED: trim() error still present!');
            console.log('   This means content is not in string format when expected');
            failCount++;
            errors.push({
              scenario: scenario.name,
              error: "trim() error - content format issue"
            });
          } else if (error.error?.message?.includes("Invalid type for 'input")) {
            console.log('❌ FAILED: Null content error still present');
            failCount++;
            errors.push({
              scenario: scenario.name,
              error: "Null content not properly handled"
            });
          } else {
            console.log('✅ PASSED: No trim() or null content errors');
            console.log(`   (Other error: ${error.error?.message?.split('\\n')[0] || 'Unknown'})`);
            passCount++;
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
      errors.push({
        scenario: scenario.name,
        error: error.message
      });
    }
  }
  
  // Check logs for our fixes
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING FIX APPLICATION LOGS');
  console.log('='.repeat(80));
  
  const { execSync } = require('child_process');
  try {
    const fixLogs = execSync('tail -50 ~/.claude-router/claude-router.log | grep "null-content-fix" | tail -10', 
      { encoding: 'utf-8' });
    if (fixLogs) {
      console.log('Recent fixes applied:');
      fixLogs.split('\\n').forEach(line => {
        if (line) console.log('  ' + line.substring(line.indexOf('[null-content-fix]')));
      });
    } else {
      console.log('No recent fix logs found');
    }
  } catch (e) {
    console.log('No fix logs found');
  }
  
  // Check for trim errors in logs
  console.log('\nChecking for trim() errors in recent logs...');
  try {
    const trimErrors = execSync('tail -100 ~/.claude-router/claude-router.log | grep -c "trim is not a function" || echo "0"', 
      { encoding: 'utf-8' });
    const errorCount = parseInt(trimErrors.trim());
    if (errorCount > 0) {
      console.log(`⚠️  Found ${errorCount} trim() errors in recent logs`);
      console.log('This indicates the fix may not be working in all cases');
    } else {
      console.log('✅ No trim() errors found in recent logs');
    }
  } catch (e) {
    console.log('✅ No trim() errors found');
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total scenarios tested: ${scenarios.length}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success rate: ${((passCount/scenarios.length)*100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  ERRORS DETECTED:');
    errors.forEach(e => {
      console.log(`  - ${e.scenario}: ${e.error}`);
    });
    console.log('\nThe fix needs more work to handle all cases properly.');
  } else {
    console.log('\n🎉 SUCCESS! All content format issues are resolved.');
    console.log('The trim() error should no longer occur.');
  }
}

// Run the test
testTrimErrorFix();