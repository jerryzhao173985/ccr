#!/usr/bin/env node

const http = require('http');

function callCCR(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: '127.0.0.1',
      port: 3456,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({ 
          data: data,
          statusCode: res.statusCode
        });
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testGPT4O() {
  console.log('\n🧪 Test 1: GPT-4o (default routing)');
  console.log('=' .repeat(50));
  
  const request = {
    messages: [
      {
        role: 'user',
        content: 'What is 2+2?'
      }
    ],
    max_tokens: 100,
    stream: false
  };
  
  try {
    console.log('📤 Sending request (should route to gpt-4o)...');
    const response = await callCCR(request);
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success! Model:', json.model);
      console.log('Response:', json.content?.[0]?.text || json);
    } else {
      console.log('❌ Error:', response.data.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function testO3() {
  console.log('\n🧪 Test 2: o3 Model (explicit)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3',
    messages: [
      {
        role: 'user',
        content: 'What is the capital of France?'
      }
    ],
    max_tokens: 200,
    stream: false
  };
  
  try {
    console.log('📤 Sending o3 request (via Responses API)...');
    const response = await callCCR(request);
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success! Model:', json.model);
      console.log('Response:', json.content?.[0]?.text || json);
    } else {
      console.log('❌ Error:', response.data.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function testO3Reasoning() {
  console.log('\n🧪 Test 3: o3 with reasoning');
  console.log('=' .repeat(50));
  
  const request = {
    messages: [
      {
        role: 'user',
        content: 'Solve: If a train travels 120 miles in 2 hours, what is its average speed?'
      }
    ],
    thinking: true,  // This should trigger o3 routing
    max_tokens: 500,
    stream: false
  };
  
  try {
    console.log('📤 Sending reasoning request (should route to o3)...');
    const response = await callCCR(request);
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success! Model:', json.model);
      console.log('Response:', json.content?.[0]?.text || json);
    } else {
      console.log('❌ Error:', response.data.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Testing o3 and gpt-4o via CCR');
  console.log('=' .repeat(50));
  console.log('CCR endpoint: http://127.0.0.1:3456');
  console.log('Time:', new Date().toISOString());
  
  await testGPT4O();
  await new Promise(r => setTimeout(r, 2000));
  
  await testO3();
  await new Promise(r => setTimeout(r, 2000));
  
  await testO3Reasoning();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Configuration Summary:');
  console.log('• Default: gpt-4o via chat completions API');
  console.log('• Thinking/Reasoning: o3 via Responses API');
  console.log('• Structured Output: o3 via Responses API');
  console.log('• Explicit o3: Routes to Responses API');
}

main();