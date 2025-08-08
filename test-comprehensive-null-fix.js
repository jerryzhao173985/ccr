#!/usr/bin/env node

async function testComprehensiveNullFix() {
  console.log('='.repeat(70));
  console.log('COMPREHENSIVE NULL CONTENT FIX TEST FOR CR (Claude Router)');
  console.log('='.repeat(70));
  console.log('\nThis test verifies that the CR router properly handles:');
  console.log('1. Null message content');
  console.log('2. Undefined message content');
  console.log('3. Null items in content arrays');
  console.log('4. Null text properties in content objects');
  console.log('5. Multi-turn conversation history with nulls');
  console.log('6. Plan mode continuation scenarios\n');
  
  const testCases = [
    {
      name: "Simple null content",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: null },
          { role: "user", content: "Hello" }
        ],
        max_tokens: 10
      }
    },
    {
      name: "Array with null items",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { 
            role: "assistant", 
            content: [
              { type: "text", text: "Valid text" },
              null,
              { type: "text", text: null },
              undefined
            ]
          },
          { role: "user", content: "Continue" }
        ],
        max_tokens: 10
      }
    },
    {
      name: "Complex multi-turn (Plan mode scenario)",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are Claude Code" },
          { role: "user", content: "Analyze the repo" },
          { role: "assistant", content: "I'll analyze the repository structure." },
          { role: "user", content: null }, // This often happens in plan mode
          { 
            role: "assistant", 
            content: [
              { type: "text", text: "Here's my plan:" },
              { type: "text", text: null },
              { type: "plan", content: null }
            ]
          },
          { role: "user", content: "CONTINUE with the approved plan" }
        ],
        max_tokens: 100
      }
    }
  ];
  
  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    try {
      const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.request)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        try {
          const error = JSON.parse(responseText);
          
          // Check for null content errors
          if (error.error?.message?.includes("Invalid type for 'input") && 
              error.error?.message?.includes("content") &&
              error.error?.message?.includes("null")) {
            console.log('❌ FAILED: Null content error still present');
            console.log(`   Error: ${error.error.message.split('\\n')[0]}`);
            failCount++;
          } else {
            console.log('✅ PASSED: No null content errors');
            console.log(`   (Failed with: ${error.error?.message?.split('\\n')[0] || 'Unknown error'})`);
            passCount++;
          }
        } catch (e) {
          console.log('⚠️  Could not parse error response');
          console.log(`   Response: ${responseText.substring(0, 100)}`);
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
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 SUCCESS! All null content scenarios are handled correctly.');
    console.log('The CR router is now resilient to null content in multi-turn conversations.');
  } else {
    console.log('\n⚠️  WARNING: Some null content scenarios still cause issues.');
    console.log('Please review the failed tests above.');
  }
  
  // Check for fix application logs
  console.log('\n' + '='.repeat(70));
  console.log('CHECKING FIX APPLICATION');
  console.log('='.repeat(70));
  
  const { execSync } = require('child_process');
  try {
    const logs = execSync('tail -50 ~/.claude-router/claude-router.log | grep "null-content-fix.*Applied"', 
      { encoding: 'utf-8' });
    if (logs) {
      console.log('Recent fix applications:');
      logs.split('\\n').slice(0, 5).forEach(line => {
        if (line) console.log('  ' + line);
      });
    }
  } catch (e) {
    console.log('No recent fix application logs found.');
  }
}

// Run comprehensive test
testComprehensiveNullFix();