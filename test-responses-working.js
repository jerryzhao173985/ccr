#!/usr/bin/env node

/**
 * Working example of OpenAI Responses API
 * Demonstrates successful usage with o3-mini and gpt-4o models
 */

const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

// Helper function to call API
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
          statusCode: res.statusCode
        });
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test 1: o3-mini basic call
async function testO3Basic() {
  console.log('\n✅ Test 1: o3-mini Basic (Responses API)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    input: [
      {
        role: 'user',
        content: 'What is the capital of France?'
      }
    ],
    max_output_tokens: 50,  // Minimum is 16
    reasoning: {
      effort: 'low'
    },
    stream: false
  };
  
  try {
    console.log('📤 Sending to /v1/responses...');
    const response = await callAPI(request, '/v1/responses');
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Response:', json.output?.text || json.text || JSON.stringify(json));
      if (json.response_id) {
        console.log('Response ID:', json.response_id);
      }
    } else {
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

// Test 2: gpt-4o with JSON output
async function testGPT4OJson() {
  console.log('\n✅ Test 2: gpt-4o with JSON (Responses API)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: 'Create a JSON object with product name and price'
      }
    ],
    text: {
      format: {
        type: 'json_object'
      }
    },
    max_output_tokens: 100,
    temperature: 0.7,
    stream: false
  };
  
  try {
    console.log('📤 Sending to /v1/responses...');
    const response = await callAPI(request, '/v1/responses');
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Response:', json.output?.text || json.text || JSON.stringify(json));
    } else {
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

// Test 3: o3-mini with JSON Schema (corrected format)
async function testO3JsonSchema() {
  console.log('\n✅ Test 3: o3-mini with JSON Schema (Responses API)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    input: [
      {
        role: 'user',
        content: 'Generate a person with name and age'
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'person',  // name at format level, not inside json_schema
        strict: true,
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer', minimum: 0, maximum: 120 }
          },
          required: ['name', 'age'],
          additionalProperties: false
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
    console.log('📤 Sending structured output request...');
    const response = await callAPI(request, '/v1/responses');
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Response:', json.output?.text || json.text || JSON.stringify(json));
    } else {
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

// Compare both endpoints
async function compareEndpoints() {
  console.log('\n📊 Endpoint Comparison');
  console.log('=' .repeat(50));
  
  const message = 'What is 5 + 5?';
  
  // Chat completions format
  console.log('\n1️⃣ Chat Completions (/v1/chat/completions):');
  const chatReq = {
    model: 'o3-mini',
    messages: [{ role: 'user', content: message }],
    max_completion_tokens: 20
  };
  
  try {
    const chatRes = await callAPI(chatReq, '/v1/chat/completions');
    if (chatRes.statusCode === 200) {
      const json = JSON.parse(chatRes.data);
      console.log('✅ Works! Answer:', json.choices?.[0]?.message?.content);
    } else {
      console.log('Status:', chatRes.statusCode);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Responses API format
  console.log('\n2️⃣ Responses API (/v1/responses):');
  const respReq = {
    model: 'o3-mini',
    input: [{ role: 'user', content: message }],
    max_output_tokens: 20,
    stream: false
  };
  
  try {
    const respRes = await callAPI(respReq, '/v1/responses');
    if (respRes.statusCode === 200) {
      const json = JSON.parse(respRes.data);
      console.log('✅ Works! Answer:', json.output?.text || json.text);
      if (json.response_id) {
        console.log('Response ID (stateful):', json.response_id);
      }
    } else {
      console.log('Status:', respRes.statusCode);
      const error = JSON.parse(respRes.data);
      console.log('Error:', error.error?.message);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

// Main runner
async function main() {
  console.log('🚀 OpenAI Responses API Working Examples');
  console.log('=' .repeat(50));
  console.log('Time:', new Date().toISOString());
  
  await compareEndpoints();
  await new Promise(r => setTimeout(r, 2000));
  
  await testO3Basic();
  await new Promise(r => setTimeout(r, 2000));
  
  await testGPT4OJson();
  await new Promise(r => setTimeout(r, 2000));
  
  await testO3JsonSchema();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All tests completed!');
  console.log('\n📝 How to use with CCR:');
  console.log('1. Add responses-api transformer to llms package');
  console.log('2. Configure provider with /v1/responses endpoint');
  console.log('3. Use transformer: ["responses-api"] in config');
  console.log('4. CCR will automatically convert request parameters');
}

main();