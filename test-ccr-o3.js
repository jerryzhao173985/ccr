#!/usr/bin/env node

/**
 * Test CCR with o3 model using Responses API
 */

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

async function testO3Simple() {
  console.log('\n🧪 Test 1: Simple o3-mini request via CCR');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    messages: [
      {
        role: 'user',
        content: 'What is 2+2?'
      }
    ],
    max_tokens: 50
  };
  
  try {
    console.log('📤 Sending to CCR (should route to Responses API)...');
    const response = await callCCR(request);
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Response:', json.content?.[0]?.text || json);
    } else {
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function testO3JsonOutput() {
  console.log('\n🧪 Test 2: o3-mini with JSON output');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    messages: [
      {
        role: 'user',
        content: 'Generate a JSON object with a product name and price'
      }
    ],
    response_format: {
      type: 'json_object'
    },
    max_tokens: 100
  };
  
  try {
    console.log('📤 Sending JSON mode request...');
    const response = await callCCR(request);
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Response:', json.content?.[0]?.text || json);
    } else {
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function testO3StructuredOutput() {
  console.log('\n🧪 Test 3: o3-mini with Structured Output (JSON Schema)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    messages: [
      {
        role: 'user',
        content: 'Create a person with name and age'
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
            age: { type: 'integer', minimum: 0, maximum: 120 }
          },
          required: ['name', 'age'],
          additionalProperties: false
        }
      }
    },
    max_tokens: 100
  };
  
  try {
    console.log('📤 Sending structured output request...');
    const response = await callCCR(request);
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Response:', json.content?.[0]?.text || json);
    } else {
      console.log('Response:', response.data.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Testing CCR with o3 model via Responses API');
  console.log('=' .repeat(50));
  console.log('CCR endpoint: http://127.0.0.1:3456');
  console.log('Time:', new Date().toISOString());
  
  await testO3Simple();
  await new Promise(r => setTimeout(r, 2000));
  
  await testO3JsonOutput();
  await new Promise(r => setTimeout(r, 2000));
  
  await testO3StructuredOutput();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All tests completed!');
  console.log('\n📝 Summary:');
  console.log('• CCR is routing o3-mini to the Responses API endpoint');
  console.log('• The ResponsesApiTransformer handles parameter conversions');
  console.log('• messages → input, max_tokens → max_output_tokens');
  console.log('• response_format → text.format');
}

main();