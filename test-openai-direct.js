#!/usr/bin/env node

/**
 * Direct test of OpenAI Response Format API
 * This tests directly against OpenAI API to verify the formats work
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
          if (res.statusCode !== 200) {
            console.error(`API Error (${res.statusCode}):`, data);
            reject(new Error(`API returned status ${res.statusCode}: ${data}`));
            return;
          }
          
          if (res.headers['content-type']?.includes('text/event-stream')) {
            // Handle streaming
            const events = data.split('\n\n')
              .filter(e => e.trim())
              .map(e => {
                const lines = e.split('\n');
                const dataLine = lines.find(l => l.startsWith('data: '));
                if (dataLine && dataLine !== 'data: [DONE]') {
                  try {
                    return JSON.parse(dataLine.slice(6));
                  } catch {
                    return null;
                  }
                }
                return null;
              })
              .filter(e => e);
            resolve({ streaming: true, events, statusCode: res.statusCode });
          } else {
            const json = JSON.parse(data);
            resolve({ ...json, statusCode: res.statusCode });
          }
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

// Test 1: Basic JSON Mode with gpt-3.5-turbo
async function testJsonMode() {
  console.log('\n🧪 Test 1: JSON Mode with gpt-3.5-turbo');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that always responds in valid JSON format.'
      },
      {
        role: 'user',
        content: 'List 3 programming languages with their year of creation and main use case. Respond in JSON.'
      }
    ],
    response_format: {
      type: 'json_object'
    },
    max_tokens: 200,
    temperature: 0.7
  };
  
  try {
    console.log('📤 Request:', JSON.stringify(request.response_format));
    const response = await callOpenAI(request);
    console.log('✅ Response Status:', response.statusCode || 200);
    
    if (response.choices && response.choices[0]) {
      const content = response.choices[0].message.content;
      console.log('📥 Raw Content:', content);
      
      try {
        const parsed = JSON.parse(content);
        console.log('✅ Valid JSON:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('❌ Invalid JSON:', e.message);
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 2: Structured Output with JSON Schema using gpt-4o-mini
async function testJsonSchema() {
  console.log('\n🧪 Test 2: Structured Output with gpt-4o-mini');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: 'Generate information about Python programming language'
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'programming_language',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the programming language'
            },
            year_created: {
              type: 'integer',
              description: 'Year the language was created'
            },
            creator: {
              type: 'string',
              description: 'Person or organization who created it'
            },
            paradigms: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Programming paradigms supported'
            },
            popular_frameworks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['name', 'description'],
                additionalProperties: false
              },
              minItems: 2,
              maxItems: 5
            }
          },
          required: ['name', 'year_created', 'creator', 'paradigms', 'popular_frameworks'],
          additionalProperties: false
        }
      }
    },
    max_tokens: 500,
    temperature: 0.7
  };
  
  try {
    console.log('📤 Request Schema:', JSON.stringify(request.response_format.json_schema.schema, null, 2));
    const response = await callOpenAI(request);
    console.log('✅ Response Status:', response.statusCode || 200);
    
    if (response.choices && response.choices[0]) {
      const content = response.choices[0].message.content;
      console.log('📥 Raw Content:', content);
      
      try {
        const parsed = JSON.parse(content);
        console.log('✅ Structured JSON:', JSON.stringify(parsed, null, 2));
        
        // Validate schema compliance
        const requiredFields = ['name', 'year_created', 'creator', 'paradigms', 'popular_frameworks'];
        const missingFields = requiredFields.filter(field => !(field in parsed));
        
        if (missingFields.length === 0) {
          console.log('✅ All required fields present');
        } else {
          console.log('❌ Missing required fields:', missingFields);
        }
        
        // Validate types
        if (typeof parsed.year_created === 'number') {
          console.log('✅ year_created is a number');
        } else {
          console.log('❌ year_created should be a number, got:', typeof parsed.year_created);
        }
        
        if (Array.isArray(parsed.paradigms)) {
          console.log('✅ paradigms is an array');
        } else {
          console.log('❌ paradigms should be an array');
        }
      } catch (e) {
        console.log('❌ Invalid JSON:', e.message);
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 3: Test with latest o1 model (if available)
async function testO1Model() {
  console.log('\n🧪 Test 3: Testing with o1-mini model');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o1-mini',
    messages: [
      {
        role: 'user',
        content: 'Write a simple Python function that checks if a number is prime. Return the code in JSON format with fields: function_name, parameters, return_type, and code.'
      }
    ],
    max_completion_tokens: 500  // o1 models use max_completion_tokens instead of max_tokens
  };
  
  try {
    console.log('📤 Testing o1-mini model (no response_format for o1 models)');
    const response = await callOpenAI(request);
    console.log('✅ Response Status:', response.statusCode || 200);
    
    if (response.choices && response.choices[0]) {
      const content = response.choices[0].message.content;
      console.log('📥 Response:', content.substring(0, 500) + (content.length > 500 ? '...' : ''));
    }
  } catch (error) {
    console.error('⚠️  o1-mini test failed (model may not be available):', error.message);
  }
}

// Test 4: Complex nested schema
async function testComplexSchema() {
  console.log('\n🧪 Test 4: Complex Nested Schema with gpt-4o-mini');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: 'Create a simple API documentation for a user management system with 2 endpoints'
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'api_documentation',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            api_name: { type: 'string' },
            version: { type: 'string' },
            base_url: { type: 'string' },
            endpoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  method: { 
                    type: 'string',
                    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
                  },
                  description: { type: 'string' },
                  parameters: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        type: { type: 'string' },
                        required: { type: 'boolean' },
                        description: { type: 'string' }
                      },
                      required: ['name', 'type', 'required'],
                      additionalProperties: false
                    }
                  },
                  response: {
                    type: 'object',
                    properties: {
                      status_code: { type: 'integer' },
                      description: { type: 'string' },
                      schema: {
                        type: 'object',
                        additionalProperties: true
                      }
                    },
                    required: ['status_code', 'description'],
                    additionalProperties: false
                  }
                },
                required: ['path', 'method', 'description', 'response'],
                additionalProperties: false
              },
              minItems: 2,
              maxItems: 2
            }
          },
          required: ['api_name', 'version', 'base_url', 'endpoints'],
          additionalProperties: false
        }
      }
    },
    max_tokens: 1000,
    temperature: 0.7
  };
  
  try {
    console.log('📤 Complex Schema Test');
    const response = await callOpenAI(request);
    console.log('✅ Response Status:', response.statusCode || 200);
    
    if (response.choices && response.choices[0]) {
      const content = response.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        console.log('✅ Complex Structured JSON:', JSON.stringify(parsed, null, 2));
        
        // Validate complex structure
        if (parsed.endpoints && parsed.endpoints.length === 2) {
          console.log('✅ Exactly 2 endpoints as required');
        } else {
          console.log('❌ Should have exactly 2 endpoints');
        }
        
        if (parsed.endpoints && parsed.endpoints[0].method) {
          console.log('✅ Method enum validated:', parsed.endpoints[0].method);
        }
      } catch (e) {
        console.log('❌ Invalid JSON:', e.message);
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 5: Error handling - incompatible model
async function testIncompatibleModel() {
  console.log('\n🧪 Test 5: Error Handling - Incompatible Model');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'gpt-3.5-turbo',  // This model doesn't support json_schema
    messages: [
      {
        role: 'user',
        content: 'Test message'
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'test',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            test: { type: 'string' }
          },
          required: ['test']
        }
      }
    },
    max_tokens: 100
  };
  
  try {
    console.log('📤 Testing incompatible model with json_schema');
    const response = await callOpenAI(request);
    console.log('Response:', response);
  } catch (error) {
    console.log('✅ Expected error for incompatible model:', error.message.substring(0, 100));
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Direct OpenAI API Response Format Tests');
  console.log('=' .repeat(50));
  console.log('Using API Key:', OPENAI_API_KEY.substring(0, 10) + '...');
  
  try {
    // Run tests sequentially to avoid rate limits
    await testJsonMode();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between tests
    
    await testJsonSchema();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testComplexSchema();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testO1Model();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testIncompatibleModel();
    
    console.log('\n✅ All tests completed!');
    console.log('=' .repeat(50));
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();