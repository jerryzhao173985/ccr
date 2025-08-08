#!/usr/bin/env node

// FINAL VERIFICATION TEST - Ensures all fixes are working correctly

async function finalVerification() {
  console.log('='.repeat(80));
  console.log('FINAL VERIFICATION: ALL NULL CONTENT FIXES');
  console.log('='.repeat(80));
  
  const tests = [
    {
      name: "Critical Test: input[4] null content (exact user error)",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are Claude Code" },
          { role: "user", content: "Create a plan" },
          { role: "assistant", content: "Here's my plan..." },
          { role: "user", content: null },  // Approval with null
          { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "execute", arguments: "{}" }}] }  // input[4] with null
        ]
      }
    },
    {
      name: "Edge Case: All nulls",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "assistant", content: null },
          { role: "user", content: null },
          { role: "tool", tool_call_id: "t1", content: null }
        ]
      }
    },
    {
      name: "Complex: Mixed null arrays",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "assistant", content: [null, { type: "text", text: null }, undefined] },
          { role: "user", content: [{ type: "tool_result", content: null }] }
        ]
      }
    },
    {
      name: "Tool Flow: Complete scenario",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Fix bugs" },
          { role: "assistant", content: null, tool_calls: Array(3).fill(null).map((_, i) => ({
            id: `call_${i}`,
            type: "function",
            function: { name: `tool_${i}`, arguments: "{}" }
          }))},
          { role: "tool", tool_call_id: "call_0", content: null },
          { role: "tool", tool_call_id: "call_1", content: "" },
          { role: "tool", tool_call_id: "call_2", content: undefined },
          { role: "assistant", content: null }
        ]
      }
    }
  ];
  
  let passCount = 0;
  let failCount = 0;
  
  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name}... `);
    
    try {
      const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.request)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.choices?.[0]?.finish_reason === 'stop') {
          console.log('✅ PASS');
          passCount++;
        } else {
          console.log(`⚠️  PASS (finish_reason: ${result.choices?.[0]?.finish_reason})`);
          passCount++;
        }
      } else {
        const error = await response.text();
        if (error.includes("null") && error.includes("content")) {
          console.log('❌ FAIL - Null content error!');
          failCount++;
          console.log('  Error:', error.substring(0, 200));
        } else {
          console.log('❌ FAIL - Other error');
          failCount++;
        }
      }
    } catch (e) {
      console.log('❌ ERROR:', e.message);
      failCount++;
    }
  }
  
  // Performance test
  console.log('\n' + '-'.repeat(80));
  console.log('PERFORMANCE TEST');
  console.log('-'.repeat(80));
  
  const perfStart = Date.now();
  const largeRequest = {
    model: "openai-responses,o3-mini",
    messages: Array(100).fill(null).map((_, i) => ({
      role: i % 3 === 0 ? "user" : i % 3 === 1 ? "assistant" : "tool",
      content: i % 5 === 0 ? null : i % 5 === 1 ? "" : "content",
      tool_call_id: i % 3 === 2 ? `t${i}` : undefined,
      tool_calls: i % 3 === 1 && i % 7 === 0 ? [{ id: `c${i}`, type: "function", function: { name: "test", arguments: "{}" }}] : undefined
    })),
    max_tokens: 10
  };
  
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(largeRequest)
    });
    
    const elapsed = Date.now() - perfStart;
    if (response.ok) {
      console.log(`✅ Processed 100 messages with nulls in ${elapsed}ms`);
      console.log(`   Average: ${(elapsed/100).toFixed(2)}ms per message`);
    } else {
      console.log(`❌ Failed to process large request`);
    }
  } catch (e) {
    console.log(`❌ Performance test error:`, e.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('FINAL VERIFICATION RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passCount}/${tests.length}`);
  console.log(`❌ Failed: ${failCount}/${tests.length}`);
  
  if (failCount === 0) {
    console.log('\n🎉 PERFECT! All null content scenarios are handled correctly!');
    console.log('The fix is complete and working as expected.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the errors above.');
  }
  
  // Check if services are running
  console.log('\n' + '-'.repeat(80));
  console.log('SERVICE STATUS CHECK');
  console.log('-'.repeat(80));
  
  try {
    const configResponse = await fetch('http://127.0.0.1:3456/api/config');
    if (configResponse.ok) {
      console.log('✅ CR service is running');
      const config = await configResponse.json();
      const hasResponsesApi = config.providers?.some(p => 
        p.transformer?.use?.includes('responses-api-v2') ||
        p.transformer?.use?.includes('openai-responses')
      );
      if (hasResponsesApi) {
        console.log('✅ Responses API v2 transformer is configured');
      } else {
        console.log('⚠️  Responses API v2 transformer not found in config');
      }
    }
  } catch (e) {
    console.log('❌ CR service not responding');
  }
}

finalVerification().catch(console.error);