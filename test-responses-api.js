#!/usr/bin/env node

/**
 * Test OpenAI Responses API endpoint with o3 and gpt-4o models
 * This uses the new /v1/responses endpoint instead of /v1/chat/completions
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

// Test 1: o3-mini with Responses API
async function testO3ResponsesAPI() {
  console.log('\n🧪 Test 1: o3-mini with Responses API (/v1/responses)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    messages: [
      {
        role: 'user',
        content: 'Generate a simple JSON object with name and age fields'
      }
    ],
    response_format: {
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
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    
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

// Test 2: gpt-4o with Responses API
async function testGPT4OResponsesAPI() {
  console.log('\n🧪 Test 2: gpt-4o with Responses API (/v1/responses)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: 'Create a product description in JSON format'
      }
    ],
    response_format: {
      type: 'json_object'
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

// Test 3: Try both endpoints to see which works
async function testBothEndpoints() {
  console.log('\n🧪 Test 3: Testing Both Endpoints');
  console.log('=' .repeat(50));
  
  const testRequest = {
    model: 'o3-mini',
    messages: [{ role: 'user', content: 'Say hello' }],
    max_completion_tokens: 10
  };
  
  // Test /v1/responses
  console.log('\n📋 Testing /v1/responses endpoint:');
  try {
    const responsesResult = await callResponsesAPI(testRequest, '/v1/responses');
    console.log('Status:', responsesResult.statusCode);
    if (responsesResult.statusCode === 404) {
      console.log('❌ /v1/responses not found - may not be available yet');
    } else if (responsesResult.statusCode === 200) {
      console.log('✅ /v1/responses endpoint works!');
    } else {
      console.log('Response:', responsesResult.data.substring(0, 200));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Test /v1/chat/completions
  console.log('\n📋 Testing /v1/chat/completions endpoint:');
  try {
    const chatResult = await callResponsesAPI(testRequest, '/v1/chat/completions');
    console.log('Status:', chatResult.statusCode);
    if (chatResult.statusCode === 200) {
      console.log('✅ /v1/chat/completions endpoint works!');
    } else {
      console.log('Response:', chatResult.data.substring(0, 200));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 OpenAI Responses API Testing');
  console.log('=' .repeat(50));
  console.log('API Key:', OPENAI_API_KEY.substring(0, 10) + '...');
  console.log('Timestamp:', new Date().toISOString());
  
  // First, test which endpoints are available
  await testBothEndpoints();
  
  // Then test the Responses API if available
  console.log('\n' + '=' .repeat(50));
  console.log('Testing Responses API features...');
  
  await testO3ResponsesAPI();
  await new Promise(r => setTimeout(r, 2000));
  
  await testGPT4OResponsesAPI();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Testing completed!');
}

// Run tests
runTests();