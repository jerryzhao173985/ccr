#!/bin/bash

# Start CCR in background
echo "Starting CCR server..."
ccr start &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Run the test
echo "Running test..."
node /Users/jerry/ccr/test-o3-mini.js

# Clean up
echo "Test complete"