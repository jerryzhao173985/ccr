#!/usr/bin/env node

async function testMultiTurnConversation() {
  console.log('Testing multi-turn conversation with potential null content...\n');
  
  // Simulate a multi-turn conversation that might occur in Claude Code interactive mode
  const multiTurnRequest = {
    model: "openai-responses,o3-mini",
    messages: [
      {
        role: "system",
        content: "You are Claude Code, an AI assistant."
      },
      {
        role: "user",
        content: "Help me understand the codebase"
      },
      {
        role: "assistant",
        content: "I'll help you understand the codebase. Let me analyze it."
      },
      {
        role: "user",
        content: null  // This simulates a null content in conversation history
      },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Here's my plan:" },
          { type: "text", text: null },  // Null text in array
          null,  // Completely null item
          { type: "text", text: "1. Analyze structure" }
        ]
      },
      {
        role: "user",
        content: "CONTINUE with the approved plan"
      }
    ],
    max_tokens: 100,
    temperature: 0.7
  };

  console.log('Sending multi-turn request with various null content scenarios...');
  console.log('- messages[3].content is null');
  console.log('- messages[4].content has null items in array');
  console.log('- messages[4].content[1].text is null');
  console.log('- messages[4].content[2] is completely null\n');
  
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(multiTurnRequest)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`\nRequest failed with status ${response.status}`);
      
      try {
        const error = JSON.parse(responseText);
        
        // Check specifically for null content errors
        if (error.error?.message?.includes("Invalid type for 'input") && 
            error.error?.message?.includes("content")) {
          console.log('\n❌ NULL CONTENT ERROR DETECTED!');
          console.log('The fix did not handle all null content cases.');
          console.log('\nError details:', error.error.message.split('\\n')[0]);
          
          // Extract which input index has the problem
          const match = error.error.message.match(/input\[(\d+)\]/);
          if (match) {
            console.log(`Problem at input[${match[1]}]`);
          }
        } else if (error.error?.message?.includes("API key")) {
          console.log('\n✅ SUCCESS! No null content errors detected.');
          console.log('The request was processed without null content issues.');
          console.log('(Failed due to API key, which is expected in testing)');
        } else {
          console.log('\n⚠️  Different error occurred:');
          console.log(error.error?.message?.split('\\n')[0]);
        }
      } catch (e) {
        console.log('Error response:', responseText);
      }
    } else {
      const data = JSON.parse(responseText);
      console.log('\n✅ Request succeeded! Multi-turn conversation handled correctly.');
      
      if (data.choices && data.choices[0]) {
        console.log('Response preview:', data.choices[0].message.content.substring(0, 100));
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request error:', error.message);
  }
  
  // Check logs for our fix messages
  console.log('\n\nChecking logs for null content fixes...');
  const { execSync } = require('child_process');
  try {
    const logs = execSync('tail -30 ~/.claude-router/claude-router.log | grep "null-content-fix"', 
      { encoding: 'utf-8' });
    if (logs) {
      console.log('Fix messages found in logs:');
      const lines = logs.split('\\n').slice(0, 10);
      lines.forEach(line => console.log(line));
      if (logs.split('\\n').length > 10) {
        console.log(`... and ${logs.split('\\n').length - 10} more fixes applied`);
      }
    }
  } catch (e) {
    console.log('No fix messages found in recent logs.');
  }
  
  // Also check for the transformed request
  console.log('\n\nChecking final transformed request...');
  try {
    const transformedLogs = execSync('tail -50 ~/.claude-router/claude-router.log | grep -A2 "Full transformed request"', 
      { encoding: 'utf-8' });
    if (transformedLogs) {
      console.log('Transformed request found - checking for null values...');
      if (transformedLogs.includes('null')) {
        console.log('⚠️  WARNING: Null values still present in transformed request');
      } else {
        console.log('✅ No null values found in transformed request');
      }
    }
  } catch (e) {
    // No transformed request logs found
  }
}

// Run test
testMultiTurnConversation();