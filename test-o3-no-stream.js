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

async function main() {
  console.log('Testing o3 with explicit stream:false');
  console.log('=' .repeat(50));
  
  const request = {
    model: 'o3',
    messages: [
      {
        role: 'user',
        content: 'What is 1+1?'
      }
    ],
    max_tokens: 50,
    stream: false  // Explicitly disable streaming
  };
  
  try {
    console.log('📤 Sending to CCR with stream:false...');
    const response = await callCCR(request);
    console.log('Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const json = JSON.parse(response.data);
      console.log('✅ Success!');
      console.log('Response:', json.content?.[0]?.text || json);
    } else {
      console.log('❌ Error response:');
      try {
        const error = JSON.parse(response.data);
        console.log(JSON.stringify(error, null, 2));
      } catch {
        console.log(response.data);
      }
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

main();