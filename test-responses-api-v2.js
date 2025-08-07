#!/usr/bin/env node

/**
 * Test OpenAI Responses API with correct parameter structure
 * Uses the actual API format: input instead of messages, text.format instead of response_format
 */

const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

// Helper function to call Responses API endpoint
function callResponsesAPI(data, endpoint = '/v1/responses') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({ 
          data: data,
          statusCode: res.statusCode,
          headers: res.headers
        });
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test 1: o3-mini with correct Responses API format
async function testO3ResponsesAPIv2() {
  console.log('\n🧪 Test 1: o3-mini with corrected Responses API format');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    input: [  // Changed from 'messages' to 'input'
      {
        role: 'user',
        content: 'Generate a simple JSON object with name and age fields'
      }
    ],
    text: {  // response_format moved to text.format
      format: {
        type: 'json_schema',
        json_schema: {
          name: 'person',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'integer' }
            },
            required: ['name', 'age']
          }
        }
      }
    },
    max_completion_tokens: 100,
    reasoning_effort: 'medium',
    stream: false
  };
  
  try {
    console.log('📤 Request to /v1/responses:');
    console.log(JSON.stringify(request, null, 2));
    
    const response = await callResponsesAPI(request);
    
    console.log('\n📥 Response:');
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success! Response data:');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.response_id) {
        console.log('✅ Response ID (stateful):', json.response_id);
      }
      if (json.reasoning_summary) {
        console.log('✅ Reasoning Summary:', json.reasoning_summary);
      }
    } else {
      console.log('❌ Error response:');
      console.log(response.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 2: Simple test without response format
async function testSimpleResponsesAPI() {
  console.log('\n🧪 Test 2: Simple Responses API call');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    input: [
      {
        role: 'user',
        content: 'Say hello'
      }
    ],
    max_completion_tokens: 10,
    stream: false
  };
  
  try {
    console.log('📤 Request to /v1/responses:');
    console.log(JSON.stringify(request, null, 2));
    
    const response = await callResponsesAPI(request);
    
    console.log('\n📥 Response:');
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 3: gpt-4o with correct format
async function testGPT4OResponsesAPIv2() {
  console.log('\n🧪 Test 3: gpt-4o with corrected Responses API format');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'gpt-4o',
    input: [  // Changed from 'messages' to 'input'
      {
        role: 'user',
        content: 'Create a product description in JSON format'
      }
    ],
    text: {  // response_format moved to text.format
      format: {
        type: 'json_object'
      }
    },
    max_tokens: 150,
    stream: false
  };
  
  try {
    console.log('📤 Request to /v1/responses:');
    console.log(JSON.stringify(request, null, 2));
    
    const response = await callResponsesAPI(request);
    
    console.log('\n📥 Response:');
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success! Response data:');
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 OpenAI Responses API Testing v2 (Corrected Format)');
  console.log('=' .repeat(50));
  console.log('API Key:', OPENAI_API_KEY.substring(0, 10) + '...');
  console.log('Timestamp:', new Date().toISOString());
  
  // Test with corrected format
  await testSimpleResponsesAPI();
  await new Promise(r => setTimeout(r, 2000));
  
  await testO3ResponsesAPIv2();
  await new Promise(r => setTimeout(r, 2000));
  
  await testGPT4OResponsesAPIv2();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Testing completed!');
  console.log('\n📝 Key differences in Responses API:');
  console.log('1. messages → input');
  console.log('2. response_format → text.format');
  console.log('3. Stateful with response_id');
  console.log('4. Enhanced reasoning capabilities');
}

// Run tests
runTests();