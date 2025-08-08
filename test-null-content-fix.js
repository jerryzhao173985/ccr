#!/usr/bin/env node

async function testNullContentFix() {
  console.log('Testing null content fix in CR...\n');
  
  // Test request that might have null content
  const testRequest = {
    model: "openai-responses,o3-mini",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: "Hello"
      },
      {
        role: "assistant",
        content: "Hi there! How can I help you today?"
      },
      {
        role: "user",
        content: null  // This is the problematic null content
      },
      {
        role: "user",
        content: "Can you help me understand something?"
      }
    ],
    max_tokens: 100,
    temperature: 0.7
  };

  console.log('Sending request with null content at messages[3]...');
  
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`\n❌ Request failed with status ${response.status}`);
      
      try {
        const error = JSON.parse(responseText);
        console.log('Error details:', JSON.stringify(error, null, 2));
        
        // Check if it's the null content error
        if (error.error?.message?.includes("Invalid type for 'input[4].content'")) {
          console.log('\n❌ NULL CONTENT ERROR STILL PRESENT!');
          console.log('The fix did not work - null content is still causing issues.');
        } else if (error.error?.message?.includes("Invalid type for 'input[3].content'")) {
          console.log('\n❌ NULL CONTENT ERROR STILL PRESENT!');
          console.log('The fix did not work - null content is still causing issues.');
        } else {
          console.log('\n✅ No null content error detected!');
          console.log('The error is something else (might be auth or model access).');
        }
      } catch (e) {
        console.log('Error response:', responseText);
      }
    } else {
      const data = JSON.parse(responseText);
      console.log('\n✅ Request succeeded! The null content fix is working.');
      
      if (data.choices && data.choices[0]) {
        console.log('Response:', data.choices[0].message.content);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request error:', error.message);
  }
  
  // Check logs for our fix messages
  console.log('\n\nChecking logs for null content fix messages...');
  const { execSync } = require('child_process');
  try {
    const logs = execSync('tail -20 ~/.claude-router/claude-router.log | grep "null-content-fix"', 
      { encoding: 'utf-8' });
    if (logs) {
      console.log('Found fix messages in logs:');
      console.log(logs);
    } else {
      console.log('No fix messages found in recent logs.');
    }
  } catch (e) {
    console.log('No fix messages found in recent logs (grep found nothing).');
  }
}

// Run test
testNullContentFix();