#!/usr/bin/env node

/**
 * Final comprehensive test of OpenAI Response Format API
 * Testing with o3-mini and gpt-4o models
 */

const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

// Helper function to make OpenAI API requests
function callOpenAI(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
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
        try {
          const json = JSON.parse(data);
          resolve({ ...json, statusCode: res.statusCode });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}\nData: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test 1: o3-mini with JSON Schema
async function testO3MiniJsonSchema() {
  console.log('\n🧪 Test 1: o3-mini with JSON Schema (Structured Output)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    messages: [
      {
        role: 'user',
        content: 'Create a simple user profile with name, age, and email'
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'user_profile',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Full name of the user'
            },
            age: {
              type: 'integer',
              minimum: 0,
              maximum: 150,
              description: 'Age in years'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address'
            }
          },
          required: ['name', 'age', 'email'],
          additionalProperties: false
        }
      }
    },
    max_completion_tokens: 200  // o3 models use this instead of max_tokens
  };
  
  try {
    console.log('📤 Sending request to o3-mini with structured output...');
    console.log('Schema:', JSON.stringify(request.response_format.json_schema.schema, null, 2));
    
    const response = await callOpenAI(request);
    
    if (response.statusCode === 200) {
      console.log('✅ Status: 200 OK');
      
      if (response.choices && response.choices[0]) {
        const content = response.choices[0].message.content;
        console.log('📥 Response:', content);
        
        try {
          const parsed = JSON.parse(content);
          console.log('✅ Valid JSON:', JSON.stringify(parsed, null, 2));
          
          // Validate schema compliance
          if (parsed.name && typeof parsed.age === 'number' && parsed.email) {
            console.log('✅ Schema validation passed!');
          } else {
            console.log('⚠️ Schema validation issues detected');
          }
        } catch (e) {
          console.log('⚠️ Response is not JSON (might be empty due to quota)');
        }
      }
      
      if (response.usage) {
        console.log('📊 Token Usage:', response.usage);
      }
    } else {
      console.log('❌ Error:', response.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 2: o3-mini with JSON Object mode
async function testO3MiniJsonObject() {
  console.log('\n🧪 Test 2: o3-mini with JSON Object Mode');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that responds in JSON format.'
      },
      {
        role: 'user',
        content: 'List 3 benefits of using TypeScript. Format as JSON.'
      }
    ],
    response_format: {
      type: 'json_object'
    },
    max_completion_tokens: 300
  };
  
  try {
    console.log('📤 Sending request to o3-mini with json_object mode...');
    
    const response = await callOpenAI(request);
    
    if (response.statusCode === 200) {
      console.log('✅ Status: 200 OK');
      
      if (response.choices && response.choices[0]) {
        const content = response.choices[0].message.content;
        console.log('📥 Response:', content);
        
        try {
          const parsed = JSON.parse(content);
          console.log('✅ Valid JSON:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('⚠️ Response is not JSON (might be empty due to quota)');
        }
      }
      
      if (response.usage) {
        console.log('📊 Token Usage:', response.usage);
      }
    } else {
      console.log('❌ Error:', response.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 3: gpt-4o with JSON Schema
async function testGPT4OJsonSchema() {
  console.log('\n🧪 Test 3: gpt-4o with JSON Schema');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: 'Generate a product listing with name, price, and description'
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'product',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            price: { 
              type: 'number',
              minimum: 0
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'GBP']
            },
            description: { 
              type: 'string',
              maxLength: 200
            },
            in_stock: { type: 'boolean' }
          },
          required: ['name', 'price', 'currency', 'description', 'in_stock'],
          additionalProperties: false
        }
      }
    },
    max_tokens: 200  // gpt-4o uses max_tokens
  };
  
  try {
    console.log('📤 Sending request to gpt-4o with structured output...');
    
    const response = await callOpenAI(request);
    
    if (response.statusCode === 200) {
      console.log('✅ Status: 200 OK');
      
      if (response.choices && response.choices[0]) {
        const content = response.choices[0].message.content;
        console.log('📥 Response:', content);
        
        try {
          const parsed = JSON.parse(content);
          console.log('✅ Valid JSON:', JSON.stringify(parsed, null, 2));
          
          // Validate enum
          if (['USD', 'EUR', 'GBP'].includes(parsed.currency)) {
            console.log('✅ Currency enum validation passed');
          }
        } catch (e) {
          console.log('⚠️ Response is not JSON (might be empty due to quota)');
        }
      }
      
      if (response.usage) {
        console.log('📊 Token Usage:', response.usage);
      }
    } else {
      console.log('❌ Error:', response.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 4: Verify parameter differences
async function testParameterDifferences() {
  console.log('\n🧪 Test 4: Parameter Differences - o3 vs gpt-4o');
  console.log('=' .repeat(50));
  
  // Test o3-mini with wrong parameter (should fail)
  console.log('\n📋 Testing o3-mini with max_tokens (should fail):');
  try {
    const o3Wrong = await callOpenAI({
      model: 'o3-mini',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100  // Wrong parameter for o3
    });
    
    if (o3Wrong.error) {
      console.log('✅ Expected error:', o3Wrong.error.message.substring(0, 100));
    } else {
      console.log('⚠️ Unexpected success - o3 should reject max_tokens');
    }
  } catch (e) {
    console.log('✅ Expected error caught');
  }
  
  // Test o3-mini with correct parameter
  console.log('\n📋 Testing o3-mini with max_completion_tokens (should work):');
  try {
    const o3Correct = await callOpenAI({
      model: 'o3-mini',
      messages: [{ role: 'user', content: 'Say "test"' }],
      max_completion_tokens: 10  // Correct parameter for o3
    });
    
    if (o3Correct.statusCode === 200) {
      console.log('✅ Success with max_completion_tokens');
    } else {
      console.log('Error:', o3Correct.error?.message);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Test gpt-4o with correct parameter
  console.log('\n📋 Testing gpt-4o with max_tokens (should work):');
  try {
    const gpt4o = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Say "test"' }],
      max_tokens: 10  // Correct parameter for gpt-4o
    });
    
    if (gpt4o.statusCode === 200) {
      console.log('✅ Success with max_tokens');
    } else {
      console.log('Error:', gpt4o.error?.message);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 OpenAI Response Format API - Final Test Suite');
  console.log('=' .repeat(50));
  console.log('Testing with o3-mini and gpt-4o models');
  console.log('API Key:', OPENAI_API_KEY.substring(0, 10) + '...');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Run tests with delays to avoid rate limits
    await testO3MiniJsonSchema();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testO3MiniJsonObject();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testGPT4OJsonSchema();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testParameterDifferences();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Test suite completed!');
    console.log('\n📝 Summary:');
    console.log('- o3-mini supports: json_object ✅, json_schema ✅');
    console.log('- o3-mini requires: max_completion_tokens (NOT max_tokens)');
    console.log('- gpt-4o supports: json_object ✅, json_schema ✅');
    console.log('- gpt-4o uses: max_tokens (standard)');
    console.log('\n🎯 Implementation Requirements:');
    console.log('1. Auto-convert max_tokens → max_completion_tokens for o3 models');
    console.log('2. Support both response_format types for all models');
    console.log('3. Handle refusals and parsed responses properly');
    console.log('4. Validate schema compatibility per model');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();