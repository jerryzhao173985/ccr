#!/usr/bin/env node

/**
 * Test script for OpenAI Response Format API integration
 * This script tests both json_object and json_schema response formats
 */

const http = require('http');

// Configuration
const API_HOST = 'localhost';
const API_PORT = 3456;
const API_KEY = process.env.API_KEY || ''; // Set this if you have APIKEY configured

// Helper function to make API requests
function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    if (API_KEY) {
      options.headers['Authorization'] = `Bearer ${API_KEY}`;
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.headers['content-type']?.includes('text/event-stream')) {
            // Handle streaming response
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
            // Handle regular JSON response
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

// Test 1: JSON Object Mode
async function testJsonObjectMode() {
  console.log('\n🧪 Test 1: JSON Object Mode');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'claude-3-5-sonnet', // Will be routed to OpenAI
    messages: [
      {
        role: 'user',
        content: 'Generate a JSON object with information about Paris. Include name, country, population, and top 3 attractions.'
      }
    ],
    response_format: {
      type: 'json_object'
    },
    max_tokens: 500
  };
  
  try {
    console.log('Request:', JSON.stringify(request, null, 2));
    const response = await makeRequest(request);
    console.log('Response Status:', response.statusCode);
    
    if (response.streaming) {
      console.log('Streaming Response Events:', response.events.length);
      // Reconstruct the content from streaming events
      let content = '';
      for (const event of response.events) {
        if (event.choices?.[0]?.delta?.content) {
          content += event.choices[0].delta.content;
        }
      }
      console.log('Content:', content);
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(content);
        console.log('✅ Valid JSON response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('❌ Response is not valid JSON:', content);
      }
    } else {
      console.log('Response:', JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 2: JSON Schema Mode (Structured Output)
async function testJsonSchemaMode() {
  console.log('\n🧪 Test 2: JSON Schema Mode (Structured Output)');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'claude-3-5-sonnet', // Will be routed to OpenAI
    messages: [
      {
        role: 'user',
        content: 'Extract information about the Eiffel Tower including its height, year built, and architect.'
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'eiffel_tower_info',
        description: 'Information about the Eiffel Tower',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the structure'
            },
            height_meters: {
              type: 'number',
              description: 'Height in meters'
            },
            year_built: {
              type: 'integer',
              description: 'Year of construction'
            },
            architect: {
              type: 'string',
              description: 'Name of the architect'
            },
            location: {
              type: 'object',
              properties: {
                city: { type: 'string' },
                country: { type: 'string' }
              },
              required: ['city', 'country']
            }
          },
          required: ['name', 'height_meters', 'year_built', 'architect', 'location']
        }
      }
    },
    max_tokens: 500
  };
  
  try {
    console.log('Request:', JSON.stringify(request, null, 2));
    const response = await makeRequest(request);
    console.log('Response Status:', response.statusCode);
    
    if (response.streaming) {
      console.log('Streaming Response Events:', response.events.length);
      // Reconstruct the content from streaming events
      let content = '';
      for (const event of response.events) {
        if (event.choices?.[0]?.delta?.content) {
          content += event.choices[0].delta.content;
        }
      }
      console.log('Content:', content);
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(content);
        console.log('✅ Valid structured JSON response:', JSON.stringify(parsed, null, 2));
        
        // Validate against schema
        const requiredFields = ['name', 'height_meters', 'year_built', 'architect', 'location'];
        const missingFields = requiredFields.filter(field => !(field in parsed));
        
        if (missingFields.length === 0) {
          console.log('✅ All required fields present');
        } else {
          console.log('❌ Missing required fields:', missingFields);
        }
      } catch (e) {
        console.log('❌ Response is not valid JSON:', content);
      }
    } else {
      console.log('Response:', JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 3: Test routing logic
async function testRouting() {
  console.log('\n🧪 Test 3: Testing Routing Logic');
  console.log('=' .repeat(50));
  
  // This test checks if the router correctly identifies and routes based on response_format
  const request = {
    model: 'claude-3-5-sonnet',
    messages: [
      {
        role: 'user',
        content: 'What model am I using?'
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'model_info',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            model: { type: 'string' },
            provider: { type: 'string' }
          },
          required: ['model', 'provider']
        }
      }
    },
    max_tokens: 100
  };
  
  try {
    console.log('Request with json_schema should route to OpenAI model');
    console.log('Request:', JSON.stringify(request, null, 2));
    const response = await makeRequest(request);
    console.log('Response Status:', response.statusCode);
    
    // The response should indicate it was routed to an OpenAI model
    if (response.model) {
      console.log('✅ Routed to model:', response.model);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting OpenAI Response Format API Tests');
  console.log('=' .repeat(50));
  console.log(`Testing API at http://${API_HOST}:${API_PORT}`);
  console.log('Make sure Claude Code Router is running!');
  
  try {
    await testJsonObjectMode();
    await testJsonSchemaMode();
    await testRouting();
    
    console.log('\n✅ All tests completed!');
    console.log('=' .repeat(50));
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();