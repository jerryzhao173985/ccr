#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Building Claude Code Router...');

try {
  // Check if @musistudio/llms needs to be built
  const llmsPath = path.join(__dirname, '..', 'node_modules', '@musistudio', 'llms');
  const llmsDistPath = path.join(llmsPath, 'dist', 'esm', 'server.mjs');
  
  if (fs.existsSync(llmsPath) && !fs.existsSync(llmsDistPath)) {
    console.log('Building @musistudio/llms dependency...');
    try {
      execSync('npm run build', { cwd: llmsPath, stdio: 'inherit' });
      console.log('✓ @musistudio/llms built successfully');
    } catch (e) {
      console.warn('⚠ Could not build @musistudio/llms, continuing anyway...');
    }
  }
  
  // Build the main CLI application
  console.log('Building CLI application...');
  execSync('esbuild src/cli.ts --bundle --platform=node --external:@musistudio/llms --outfile=dist/cli.js', { stdio: 'inherit' });
  
  // Copy the tiktoken WASM file
  console.log('Copying tiktoken WASM file...');
  execSync('shx cp node_modules/tiktoken/tiktoken_bg.wasm dist/tiktoken_bg.wasm', { stdio: 'inherit' });
  
  // Build the UI
  console.log('Building UI...');
  // Check if node_modules exists in ui directory, if not install dependencies
  if (!fs.existsSync('ui/node_modules')) {
    console.log('Installing UI dependencies...');
    execSync('cd ui && npm install', { stdio: 'inherit' });
  }
  execSync('cd ui && npm run build', { stdio: 'inherit' });
  
  // Copy the built UI index.html to dist
  console.log('Copying UI build artifacts...');
  execSync('shx cp ui/dist/index.html dist/index.html', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}