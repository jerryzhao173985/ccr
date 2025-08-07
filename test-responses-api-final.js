#!/usr/bin/env node

/**
 * Final test of OpenAI Responses API with fully corrected parameter structure
 * 
 * Key mappings:
 * - messages → input
 * - response_format → text.format
 * - max_tokens/max_completion_tokens → max_output_tokens
 * - reasoning_effort → reasoning.effort
 */

const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

// Helper function to call API endpoints
function callAPI(data, endpoint) {
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

// Test 1: Simple o3-mini call with Responses API
async function testO3SimpleResponses() {
  console.log('\n🧪 Test 1: Simple o3-mini with Responses API');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    input: [
      {
        role: 'user',
        content: 'Say hello'
      }
    ],
    max_output_tokens: 10,
    reasoning: {
      effort: 'low'
    },
    stream: false
  };
  
  try {
    console.log('📤 Request to /v1/responses:');
    console.log(JSON.stringify(request, null, 2));
    
    const response = await callAPI(request, '/v1/responses');
    
    console.log('\n📥 Response:');
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Content:', json.output?.text || json.text || json);
      if (json.response_id) {
        console.log('Response ID:', json.response_id);
      }
      if (json.usage) {
        console.log('Usage:', json.usage);
      }
    } else {
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 2: o3-mini with JSON Schema
async function testO3JsonSchemaResponses() {
  console.log('\n🧪 Test 2: o3-mini with JSON Schema (Responses API)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    input: [
      {
        role: 'user',
        content: 'Generate a person object with name and age'
      }
    ],
    text: {
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
    max_output_tokens: 100,
    reasoning: {
      effort: 'medium'
    },
    stream: false
  };
  
  try {
    console.log('📤 Request with json_schema:');
    console.log(JSON.stringify(request.text.format, null, 2));
    
    const response = await callAPI(request, '/v1/responses');
    
    console.log('\n📥 Response:');
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Output:', json.output?.text || json.text || json);
    } else {
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 3: Compare with traditional chat/completions
async function compareEndpoints() {
  console.log('\n🧪 Test 3: Compare Responses API vs Chat Completions');
  console.log('=' .repeat(50));
  
  const chatRequest = {
    model: 'o3-mini',
    messages: [
      {
        role: 'user',
        content: 'What is 2+2?'
      }
    ],
    max_completion_tokens: 10
  };
  
  const responsesRequest = {
    model: 'o3-mini',
    input: [
      {
        role: 'user',
        content: 'What is 2+2?'
      }
    ],
    max_output_tokens: 10,
    stream: false
  };
  
  // Test chat/completions
  console.log('\n📋 Testing /v1/chat/completions:');
  try {
    const chatResponse = await callAPI(chatRequest, '/v1/chat/completions');
    console.log('Status:', chatResponse.statusCode);
    if (chatResponse.statusCode === 200) {
      const json = JSON.parse(chatResponse.data);
      console.log('✅ Works! Response:', json.choices?.[0]?.message?.content);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Test /v1/responses
  console.log('\n📋 Testing /v1/responses:');
  try {
    const responsesResponse = await callAPI(responsesRequest, '/v1/responses');
    console.log('Status:', responsesResponse.statusCode);
    if (responsesResponse.statusCode === 200) {
      const json = JSON.parse(responsesResponse.data);
      console.log('✅ Works! Response:', json.output?.text || json.text);
    } else {
      const error = JSON.parse(responsesResponse.data);
      console.log('❌ Error:', error.error?.message);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

// Test 4: gpt-4o with Responses API
async function testGPT4OResponses() {
  console.log('\n🧪 Test 4: gpt-4o with Responses API');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: 'Generate a JSON product description'
      }
    ],
    text: {
      format: {
        type: 'json_object'
      }
    },
    max_output_tokens: 150,
    temperature: 0.7,
    stream: false
  };
  
  try {
    console.log('📤 Request to gpt-4o:');
    console.log('Format:', request.text.format.type);
    
    const response = await callAPI(request, '/v1/responses');
    
    console.log('\n📥 Response:');
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Output:', json.output?.text || json.text || json);
    } else {
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 OpenAI Responses API Final Testing');
  console.log('=' .repeat(50));
  console.log('API Key:', OPENAI_API_KEY.substring(0, 10) + '...');
  console.log('Timestamp:', new Date().toISOString());
  
  // Run tests
  await compareEndpoints();
  await new Promise(r => setTimeout(r, 2000));
  
  await testO3SimpleResponses();
  await new Promise(r => setTimeout(r, 2000));
  
  await testO3JsonSchemaResponses();
  await new Promise(r => setTimeout(r, 2000));
  
  await testGPT4OResponses();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Testing completed!');
  console.log('\n📝 Responses API Parameter Mappings:');
  console.log('• messages → input');
  console.log('• response_format → text.format');
  console.log('• max_tokens → max_output_tokens');
  console.log('• max_completion_tokens → max_output_tokens');
  console.log('• reasoning_effort → reasoning.effort');
  console.log('\n🔧 Usage with CCR:');
  console.log('1. Configure provider with api_base_url: "https://api.openai.com/v1/responses"');
  console.log('2. Add transformer: ["responses-api"] to provider config');
  console.log('3. Route requests to appropriate models in Router config');
}

// Run tests
runTests();