#!/bin/bash

curl -X POST http://127.0.0.1:3456/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "o3-mini",
    "messages": [
      {"role": "user", "content": "what is 1+1?"}
    ],
    "max_tokens": 200,
    "stream": false
  }' -v