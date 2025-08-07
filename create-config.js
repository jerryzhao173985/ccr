#!/usr/bin/env node

/**
 * Create CCR config with environment variable API key
 */

const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

const config = {
  "LOG": true,
  "NON_INTERACTIVE_MODE": false,
  "API_TIMEOUT_MS": 600000,
  "Providers": [
    {
      "name": "openai-responses",
      "api_base_url": "https://api.openai.com/v1/responses",
      "api_key": OPENAI_API_KEY,
      "models": [
        "gpt-4o",
        "gpt-4o-mini",
        "o3",
        "o3-mini",
        "o3-mini-2025-01-31"
      ],
      "transformer": {
        "use": ["responses-api"]
      }
    },
    {
      "name": "openai-chat",
      "api_base_url": "https://api.openai.com/v1/chat/completions",
      "api_key": OPENAI_API_KEY,
      "models": [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-3.5-turbo",
        "gpt-4-turbo",
        "o1-mini",
        "o3-mini",
        "o3-mini-2025-01-31"
      ],
      "transformer": {
        "use": ["openai-response-format", "o3"]
      }
    }
  ],
  "Router": {
    "default": "openai-responses,o3-mini",
    "structuredOutput": "openai-responses,o3-mini",
    "jsonMode": "openai-responses,gpt-4o",
    "predictedOutput": "openai-chat,gpt-4o",
    "think": "openai-responses,o3-mini",
    "reasoning": "openai-responses,o3",
    "longContext": "openai-responses,gpt-4o",
    "webSearch": "openai-chat,gpt-4o",
    "background": "openai-chat,gpt-3.5-turbo"
  }
};

const configPath = path.join(process.env.HOME, '.claude-code-router', 'config.json');

// Backup existing config
if (fs.existsSync(configPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${configPath}.backup-${timestamp}`;
  fs.copyFileSync(configPath, backupPath);
  console.log(`✅ Backed up existing config to ${backupPath}`);
}

// Write new config
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`✅ Config written to ${configPath}`);
console.log(`✅ Using API key: ${OPENAI_API_KEY.substring(0, 20)}...`);
console.log('\n📝 Configuration summary:');
console.log('- Default model: o3-mini (via Responses API)');
console.log('- Structured output: o3-mini (via Responses API)');
console.log('- JSON mode: gpt-4o (via Responses API)');
console.log('- Reasoning: o3 (via Responses API)');
console.log('\n🚀 Now run: ccr start');