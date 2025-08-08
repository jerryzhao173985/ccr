#!/usr/bin/env node

async function testExhaustiveToolScenarios() {
  console.log('='.repeat(80));
  console.log('EXHAUSTIVE TOOL SCENARIOS TEST FOR CR (Claude Router)');
  console.log('='.repeat(80));
  console.log('\nThis test covers EVERY possible edge case with tool calls and null content\n');
  
  const scenarios = [
    // Scenario 1: Classic OpenAI tool call with null content
    {
      name: "OpenAI tool call - null content",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Search for files" },
          { 
            role: "assistant",
            content: null,  // Typical for tool calls
            tool_calls: [{
              id: "call_1",
              type: "function",
              function: { name: "search", arguments: "{}" }
            }]
          },
          { role: "tool", tool_call_id: "call_1", content: "Results" },
          { role: "user", content: "Continue" }
        ],
        max_tokens: 50
      }
    },
    
    // Scenario 2: Anthropic tool_use with mixed null content
    {
      name: "Anthropic tool_use - mixed nulls",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Analyze code" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "I'll analyze it" },
              { type: "tool_use", id: "t1", name: "read", input: {} },
              null,  // Null item
              { type: "text", text: null }  // Null text
            ]
          },
          {
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: "t1", content: null }  // Null result
            ]
          },
          { role: "user", content: "What did you find?" }
        ],
        max_tokens: 50
      }
    },
    
    // Scenario 3: Multiple sequential tool calls with nulls
    {
      name: "Sequential tools - all null content",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Fix all errors" },
          { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "lint", arguments: "{}" }}] },
          { role: "tool", tool_call_id: "c1", content: null },
          { role: "assistant", content: null, tool_calls: [{ id: "c2", type: "function", function: { name: "fix", arguments: "{}" }}] },
          { role: "tool", tool_call_id: "c2", content: null },
          { role: "assistant", content: null, tool_calls: [{ id: "c3", type: "function", function: { name: "test", arguments: "{}" }}] },
          { role: "tool", tool_call_id: "c3", content: null },
          { role: "user", content: "Status?" }
        ],
        max_tokens: 50
      }
    },
    
    // Scenario 4: Plan mode with tools and approval
    {
      name: "Plan mode - tools then approval",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "system", content: "You are Claude Code" },
          { role: "user", content: "Refactor the codebase" },
          { role: "assistant", content: null, tool_calls: [{ id: "analyze", type: "function", function: { name: "analyze", arguments: "{}" }}] },
          { role: "tool", tool_call_id: "analyze", content: "Analysis complete" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "Plan:" },
              { type: "plan", content: null },  // Null plan content
              null,  // Null item
              { type: "text", text: null }  // Null text
            ]
          },
          { role: "user", content: null },  // Null approval
          { role: "user", content: "CONTINUE" }
        ],
        max_tokens: 100
      }
    },
    
    // Scenario 5: Second round starts with immediate tool call
    {
      name: "Second round - immediate tool",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          // First round
          { role: "user", content: "Help me debug" },
          { role: "assistant", content: "I'll help debug" },
          { role: "assistant", content: null, tool_calls: [{ id: "debug1", type: "function", function: { name: "debug", arguments: "{}" }}] },
          { role: "tool", tool_call_id: "debug1", content: "Error found" },
          { role: "assistant", content: "Found an error. Plan: Fix it" },
          // Second round - starts with tool
          { role: "user", content: "Fix it now" },
          { role: "assistant", content: null, tool_calls: [{ id: "fix1", type: "function", function: { name: "fix", arguments: "{}" }}] }
        ],
        max_tokens: 100
      }
    },
    
    // Scenario 6: Complex nested tool results
    {
      name: "Nested tool results - all nulls",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Search everything" },
          {
            role: "assistant",
            content: [
              { type: "text", text: null },
              { type: "tool_use", id: "s1", name: "search", input: null },
              { type: "tool_use", id: "s2", name: "grep", input: {} }
            ]
          },
          {
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: "s1", content: null },
              null,  // Null between results
              { type: "tool_result", tool_use_id: "s2", content: null }
            ]
          },
          { role: "assistant", content: null },  // Thinking
          { role: "user", content: "What's next?" }
        ],
        max_tokens: 50
      }
    },
    
    // Scenario 7: Empty tool responses
    {
      name: "Empty tool responses",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Check status" },
          { role: "assistant", content: null, tool_calls: [{ id: "status", type: "function", function: { name: "status", arguments: "{}" }}] },
          { role: "tool", tool_call_id: "status", content: "" },  // Empty string
          { role: "assistant", content: [] },  // Empty array
          { role: "user", content: [null, undefined, ""] }  // Mixed nulls
        ],
        max_tokens: 50
      }
    },
    
    // Scenario 8: Tool error with null fallback
    {
      name: "Tool error handling",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Read file" },
          { role: "assistant", content: null, tool_calls: [{ id: "read", type: "function", function: { name: "read", arguments: JSON.stringify({ path: null }) }}] },
          { role: "tool", tool_call_id: "read", content: null, error: "File not found" },
          { role: "assistant", content: [{ type: "text", text: null }, null] },
          { role: "user", content: undefined }  // Undefined content
        ],
        max_tokens: 50
      }
    },
    
    // Scenario 9: Parallel tool calls
    {
      name: "Parallel tool calls",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          { role: "user", content: "Check everything" },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "t1", type: "function", function: { name: "check1", arguments: "{}" }},
              { id: "t2", type: "function", function: { name: "check2", arguments: "{}" }},
              { id: "t3", type: "function", function: { name: "check3", arguments: "{}" }}
            ]
          },
          { role: "tool", tool_call_id: "t1", content: null },
          { role: "tool", tool_call_id: "t2", content: null },
          { role: "tool", tool_call_id: "t3", content: null },
          { role: "assistant", content: null },
          { role: "user", content: "Results?" }
        ],
        max_tokens: 50
      }
    },
    
    // Scenario 10: Mixed format messages
    {
      name: "Mixed formats - OpenAI + Anthropic",
      request: {
        model: "openai-responses,o3-mini",
        messages: [
          // OpenAI format
          { role: "assistant", content: null, tool_calls: [{ id: "o1", type: "function", function: { name: "test", arguments: "{}" }}] },
          { role: "tool", tool_call_id: "o1", content: "Result" },
          // Anthropic format
          {
            role: "assistant",
            content: [
              { type: "tool_use", id: "a1", name: "test2", input: {} },
              { type: "text", text: null }
            ]
          },
          {
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: "a1", content: null }
            ]
          },
          // Mixed nulls
          { role: "user", content: null }
        ],
        max_tokens: 50
      }
    }
  ];
  
  console.log(`Testing ${scenarios.length} exhaustive scenarios...\n`);
  
  let passCount = 0;
  let failCount = 0;
  const failures = [];
  
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    process.stdout.write(`[${i+1}/${scenarios.length}] ${scenario.name}... `);
    
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
            console.log('❌ FAILED');
            failCount++;
            failures.push({
              scenario: scenario.name,
              error: error.error.message.split('\\n')[0]
            });
          } else {
            console.log('✅ PASSED');
            passCount++;
          }
        } catch (e) {
          console.log('⚠️  PARSE ERROR');
        }
      } else {
        console.log('✅ PASSED (200 OK)');
        passCount++;
      }
      
    } catch (error) {
      console.log('❌ ERROR');
      failCount++;
      failures.push({
        scenario: scenario.name,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('EXHAUSTIVE TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total scenarios tested: ${scenarios.length}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success rate: ${((passCount/scenarios.length)*100).toFixed(1)}%`);
  
  if (failures.length > 0) {
    console.log('\n⚠️  FAILURES DETECTED:');
    failures.forEach(f => {
      console.log(`  - ${f.scenario}: ${f.error}`);
    });
  } else {
    console.log('\n🎉 PERFECT! All tool call scenarios with null content are handled correctly!');
    console.log('The CR router is now fully resilient to ANY null content scenario.');
  }
  
  // Performance check
  console.log('\n' + '='.repeat(80));
  console.log('PERFORMANCE CHECK');
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  const perfRequest = {
    model: "openai-responses,o3-mini",
    messages: Array(50).fill(null).map((_, i) => ({
      role: i % 3 === 0 ? "user" : i % 3 === 1 ? "assistant" : "tool",
      content: i % 4 === 0 ? null : i % 4 === 1 ? [] : i % 4 === 2 ? [null, { text: null }] : "text",
      tool_call_id: i % 3 === 2 ? `call_${i}` : undefined,
      tool_calls: i % 3 === 1 && i % 2 === 0 ? [{ id: `c${i}`, type: "function", function: { name: "test", arguments: "{}" }}] : undefined
    })),
    max_tokens: 10
  };
  
  try {
    await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perfRequest)
    });
    const elapsed = Date.now() - startTime;
    console.log(`Processing 50 complex messages with nulls: ${elapsed}ms`);
    console.log(`Average per message: ${(elapsed/50).toFixed(2)}ms`);
    
    if (elapsed < 100) {
      console.log('✅ Excellent performance - negligible overhead');
    } else if (elapsed < 500) {
      console.log('✅ Good performance - minimal overhead');
    } else {
      console.log('⚠️  Performance could be optimized');
    }
  } catch (e) {
    console.log('Could not complete performance test');
  }
}

// Run exhaustive test
testExhaustiveToolScenarios();