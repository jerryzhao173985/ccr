#!/usr/bin/env node

// This test reproduces the EXACT error the user is experiencing:
// "Invalid type for 'input[4].content': expected one of an array of objects or string, but got null instead"

async function testExactErrorScenario() {
  console.log('='.repeat(80));
  console.log('REPRODUCING EXACT ERROR: input[4].content null');
  console.log('='.repeat(80));
  console.log('\nScenario: Plan → Approval → Tool Execution Error\n');
  
  // This mimics the exact message sequence that causes the error
  const problemRequest = {
    model: "openai-responses,o3-mini",
    messages: [
      // Message 0: System prompt
      {
        role: "system",
        content: "You are Claude Code, an AI coding assistant."
      },
      
      // Message 1: User asks for a plan
      {
        role: "user",
        content: "Create a plan to refactor the authentication module"
      },
      
      // Message 2: Assistant presents the plan
      {
        role: "assistant",
        content: "I'll create a plan to refactor the authentication module:\n\n1. Analyze current implementation\n2. Identify issues\n3. Refactor code\n4. Add tests\n\nLet me start by analyzing the current code."
      },
      
      // Message 3: User approves (sometimes with null content)
      {
        role: "user",
        content: null  // NULL approval
      },
      
      // Message 4: THIS IS WHERE THE ERROR OCCURS
      // Assistant immediately calls tools with null content
      {
        role: "assistant",
        content: null,  // NULL because going straight to tools
        tool_calls: [
          {
            id: "call_analyze_001",
            type: "function",
            function: {
              name: "read_file",
              arguments: JSON.stringify({ path: "src/auth.ts" })
            }
          }
        ]
      },
      
      // Message 5: Tool result
      {
        role: "tool",
        tool_call_id: "call_analyze_001",
        content: "// auth.ts content here..."
      },
      
      // Message 6: Assistant might call more tools
      {
        role: "assistant",
        content: null,  // Another null for more tools
        tool_calls: [
          {
            id: "call_search_002",
            type: "function",
            function: {
              name: "grep",
              arguments: JSON.stringify({ pattern: "authenticate" })
            }
          }
        ]
      }
    ],
    max_tokens: 100
  };
  
  console.log('Testing with request that has:');
  console.log(`- ${problemRequest.messages.length} messages`);
  console.log(`- Message[3] (user approval): content = ${problemRequest.messages[3].content}`);
  console.log(`- Message[4] (assistant tools): content = ${problemRequest.messages[4].content}`);
  console.log(`- Message[4] has ${problemRequest.messages[4].tool_calls?.length || 0} tool calls\n`);
  
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(problemRequest)
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      const error = JSON.parse(responseText);
      
      // Check if it's the exact error we're looking for
      if (error.error?.message?.includes("Invalid type for 'input[4].content'")) {
        console.log('❌ REPRODUCED THE EXACT ERROR!');
        console.log('\nError details:');
        console.log('- Parameter:', error.error.param || 'input[4].content');
        console.log('- Message:', error.error.message.split('\\n')[0]);
        console.log('\n⚠️  This is the error that needs to be fixed!');
        console.log('The middleware is NOT properly handling null content at input[4]');
        
        // Now test if the fix would work
        console.log('\n' + '-'.repeat(80));
        console.log('Testing what the fixed request should look like...\n');
        
        // Create a fixed version
        const fixedRequest = JSON.parse(JSON.stringify(problemRequest));
        
        // Fix the null content issues
        fixedRequest.messages[3].content = "";  // User approval becomes empty string
        fixedRequest.messages[4].content = "[Executing 1 tool: read_file]";  // Tool execution context
        fixedRequest.messages[6].content = "[Executing 1 tool: grep]";  // Tool execution context
        
        console.log('Fixed message[3].content:', JSON.stringify(fixedRequest.messages[3].content));
        console.log('Fixed message[4].content:', JSON.stringify(fixedRequest.messages[4].content));
        console.log('Fixed message[6].content:', JSON.stringify(fixedRequest.messages[6].content));
        
        const fixedResponse = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fixedRequest)
        });
        
        if (fixedResponse.ok) {
          console.log('\n✅ Fixed version works! The middleware needs to apply these transformations.');
        } else {
          console.log('\n⚠️  Fixed version still has issues.');
        }
        
      } else if (error.error?.message?.includes("null") || error.error?.message?.includes("content")) {
        console.log('❌ Related null content error found:');
        console.log(error.error.message.split('\\n')[0]);
      } else {
        console.log('⚠️  Different error:', error.error?.message || 'Unknown error');
      }
    } else {
      console.log('✅ Request succeeded! The middleware might be working.');
      console.log('However, let\'s verify the response format...');
      
      try {
        const result = JSON.parse(responseText);
        if (result.choices?.[0]?.finish_reason) {
          console.log('- finish_reason:', result.choices[0].finish_reason);
          if (result.choices[0].finish_reason === 'tool_calls') {
            console.log('⚠️  WARNING: finish_reason is "tool_calls" - this might break continuation!');
          }
        }
      } catch (e) {
        console.log('Could not parse response');
      }
    }
    
  } catch (error) {
    console.log('❌ Network or other error:', error.message);
  }
  
  // Additional test: Direct Responses API format
  console.log('\n' + '='.repeat(80));
  console.log('TESTING RESPONSES API FORMAT DIRECTLY');
  console.log('='.repeat(80) + '\n');
  
  const responsesApiRequest = {
    model: "o3-mini",
    input: [
      { role: "system", content: [{ type: "input_text", text: "You are Claude Code" }] },
      { role: "user", content: [{ type: "input_text", text: "Create a plan" }] },
      { role: "assistant", content: [{ type: "output_text", text: "Here's my plan..." }] },
      { role: "user", content: null },  // THIS WILL CAUSE ERROR
      { role: "assistant", content: null }  // THIS TOO
    ],
    max_tokens: 100
  };
  
  console.log('Testing Responses API format with:');
  console.log(`- input[3].content = ${responsesApiRequest.input[3].content}`);
  console.log(`- input[4].content = ${responsesApiRequest.input[4].content}`);
  
  const responsesResponse = await fetch('http://127.0.0.1:3456/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(responsesApiRequest)
  });
  
  if (!responsesResponse.ok) {
    const error = await responsesResponse.json();
    if (error.error?.message?.includes("Invalid type for 'input")) {
      console.log('\n❌ Responses API format also fails with null content!');
      console.log('Error at:', error.error.param);
    }
  } else {
    console.log('\n✅ Responses API format handled correctly');
  }
}

// Run the test
testExactErrorScenario().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}).catch(console.error);