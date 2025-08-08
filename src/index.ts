import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { initConfig, initDir } from "./utils";
import { createServer } from "./server";
import { router } from "./utils/router";
import { apiKeyAuth } from "./middleware/auth";
import {
  cleanupPidFile,
  isServiceRunning,
  savePid,
} from "./utils/processCheck";
import { CONFIG_FILE } from "./constants";

async function initializeClaudeConfig() {
  const homeDir = homedir();
  const configPath = join(homeDir, ".claude.json");
  if (!existsSync(configPath)) {
    const userID = Array.from(
      { length: 64 },
      () => Math.random().toString(16)[2]
    ).join("");
    const configContent = {
      numStartups: 184,
      autoUpdaterStatus: "enabled",
      userID,
      hasCompletedOnboarding: true,
      lastOnboardingVersion: "1.0.17",
      projects: {},
    };
    await writeFile(configPath, JSON.stringify(configContent, null, 2));
  }
}

interface RunOptions {
  port?: number;
}

async function run(options: RunOptions = {}) {
  // Check if service is already running
  if (isServiceRunning()) {
    console.log("✅ Service is already running in the background.");
    return;
  }

  await initializeClaudeConfig();
  await initDir();
  const config = await initConfig();
  let HOST = config.HOST;

  if (config.HOST && !config.APIKEY) {
    HOST = "127.0.0.1";
    console.warn(
      "⚠️ API key is not set. HOST is forced to 127.0.0.1."
    );
  }

  const port = config.PORT || 3456;

  // Save the PID of the background process
  savePid(process.pid);

  // Handle SIGINT (Ctrl+C) to clean up PID file
  process.on("SIGINT", () => {
    console.log("Received SIGINT, cleaning up...");
    cleanupPidFile();
    process.exit(0);
  });

  // Handle SIGTERM to clean up PID file
  process.on("SIGTERM", () => {
    cleanupPidFile();
    process.exit(0);
  });
  console.log(HOST)

  // Use port from environment variable if set (for background process)
  const servicePort = process.env.SERVICE_PORT
    ? parseInt(process.env.SERVICE_PORT)
    : port;
  const server = createServer({
    jsonPath: CONFIG_FILE,
    initialConfig: {
      // ...config,
      providers: config.Providers || config.providers,
      HOST: HOST,
      PORT: servicePort,
      LOG_FILE: join(
        homedir(),
        ".claude-router",
        "claude-router.log"
      ),
    },
  });
  server.addHook("preHandler", apiKeyAuth(config));
  
  // Fix null content in messages before processing
  server.addHook("preHandler", async (req, reply) => {
    if (req.body && typeof req.body === 'object') {
      let fixCount = 0;
      const isResponsesApi = req.url.includes('/v1/responses');
      
      // Deep fix for null/undefined content in messages
      const fixMessageContent = (msg: any, path: string) => {
        // Special handling for tool messages
        if (msg.role === 'tool' || msg.tool_call_id) {
          // Tool result messages might have null content
          if (msg.content === null || msg.content === undefined) {
            console.log(`[null-content-fix] Fixed null tool result at ${path}`);
            fixCount++;
            return { ...msg, content: "" };
          }
        }
        
        // Handle assistant messages with tool_calls
        if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
          // If there are tool_calls, content being null is EXPECTED and VALID
          // This is by design in OpenAI's API - the action is in tool_calls
          if (msg.content === null || msg.content === undefined) {
            console.log(`[null-content-fix] Assistant tool execution at ${path} - preserving semantics`);
            fixCount++;
            // Don't just use empty string - indicate what's happening
            const toolNames = msg.tool_calls.map((tc: any) => 
              tc.function?.name || tc.name || 'unknown'
            );
            // Provide semantic context for the transformation
            return { ...msg, content: `[Executing ${toolNames.length} tool${toolNames.length > 1 ? 's' : ''}: ${toolNames.join(', ')}]` };
          }
        }
        
        // Handle null or undefined content (without tool_calls)
        if (msg.content === null || msg.content === undefined) {
          console.log(`[null-content-fix] Fixed null/undefined content at ${path}`);
          fixCount++;
          // For user messages, null often means approval/continuation
          // For assistant without tools, add a continuation indicator
          if (msg.role === 'user') {
            return { ...msg, content: "" };  // Empty is valid for user continuation
          } else {
            return { ...msg, content: "[Continuing...]" };  // Assistant continuation
          }
        }
        
        // Handle array content with null items
        if (Array.isArray(msg.content)) {
          const fixedContent = msg.content.map((item: any, idx: number) => {
            if (item === null || item === undefined) {
              console.log(`[null-content-fix] Fixed null/undefined item at ${path}.content[${idx}]`);
              fixCount++;
              return { type: "text", text: "" };
            }
            
            // Handle different content types
            if (typeof item === 'object' && item !== null) {
              // Handle tool_use blocks (Anthropic format)
              if (item.type === 'tool_use') {
                // Ensure tool_use has required fields
                if (!item.name) item.name = "unknown_tool";
                if (!item.id) item.id = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                if (item.input === null || item.input === undefined) item.input = {};
                return item;
              }
              
              // Handle tool_result blocks
              if (item.type === 'tool_result') {
                if (item.content === null || item.content === undefined) {
                  console.log(`[null-content-fix] Fixed null tool_result content at ${path}.content[${idx}]`);
                  fixCount++;
                  item.content = "";
                }
                if (!item.tool_use_id) item.tool_use_id = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                return item;
              }
              
              // Handle text blocks
              if (item.text === null || item.text === undefined) {
                console.log(`[null-content-fix] Fixed null/undefined text at ${path}.content[${idx}].text`);
                fixCount++;
                return { ...item, text: "" };
              }
              
              // Handle nested content
              if (item.content === null || item.content === undefined) {
                if (item.type !== 'tool_use' && item.type !== 'tool_result') {
                  console.log(`[null-content-fix] Fixed null/undefined nested content at ${path}.content[${idx}].content`);
                  fixCount++;
                  return { ...item, content: "" };
                }
              }
            }
            return item;
          }).filter((item: any) => item !== null && item !== undefined);
          
          return { ...msg, content: fixedContent };
        }
        
        return msg;
      };
      
      // Fix messages array
      if (req.body.messages && Array.isArray(req.body.messages)) {
        req.body.messages = req.body.messages.map((msg: any, index: number) => 
          fixMessageContent(msg, `messages[${index}]`)
        );
      }
      
      // Fix input array (for Responses API)
      if (req.body.input && Array.isArray(req.body.input)) {
        req.body.input = req.body.input.map((msg: any, index: number) => {
          // Handle tool-related roles in Responses API
          if (msg.role === 'tool' || msg.tool_call_id) {
            if (msg.content === null || msg.content === undefined) {
              console.log(`[null-content-fix] Fixed null tool content at input[${index}]`);
              fixCount++;
              return { ...msg, content: [{ type: "input_text", text: "" }] };
            }
          }
          
          // For Responses API, ensure content is always an array
          if (msg.content === null || msg.content === undefined) {
            console.log(`[null-content-fix] Fixed null/undefined content at input[${index}]`);
            fixCount++;
            // Check role to determine appropriate content type
            const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
            // Always provide at least one empty text item to avoid trim() errors
            return { ...msg, content: [{ type: contentType, text: "" }] };
          }
          
          // If content is a string, wrap it in proper format
          if (typeof msg.content === 'string') {
            const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
            return { ...msg, content: [{ type: contentType, text: msg.content }] };
          }
          
          // If content is an array, fix any null items
          if (Array.isArray(msg.content)) {
            const fixedContent = msg.content.map((item: any, idx: number) => {
              if (item === null || item === undefined) {
                console.log(`[null-content-fix] Fixed null/undefined item at input[${index}].content[${idx}]`);
                fixCount++;
                const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
                return { type: contentType, text: "" };
              }
              
              // Ensure item has proper structure
              if (typeof item === 'string') {
                const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
                return { type: contentType, text: item };
              }
              
              // Handle tool blocks in Responses API format
              if (typeof item === 'object' && item !== null) {
                // Fix null text in objects
                if (item.text === null || item.text === undefined) {
                  console.log(`[null-content-fix] Fixed null/undefined text at input[${index}].content[${idx}].text`);
                  fixCount++;
                  return { ...item, text: "" };
                }
                
                // Ensure type is set correctly
                if (!item.type) {
                  const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
                  item.type = contentType;
                }
                
                // Handle tool-specific content
                if (item.type === 'tool_use' || item.type === 'tool_result') {
                  // Convert to text representation for Responses API
                  const toolText = item.type === 'tool_use' 
                    ? `[Tool: ${item.name || 'unknown'} (${item.id || 'unknown'})]`
                    : `[Tool Result ${item.tool_use_id || 'unknown'}]\n${item.content || ''}`;
                  return { 
                    type: msg.role === 'assistant' ? 'output_text' : 'input_text', 
                    text: toolText 
                  };
                }
              }
              
              return item;
            }).filter((item: any) => item !== null && item !== undefined);
            
            // Ensure we always have at least one item for Responses API
            if (fixedContent.length === 0) {
              const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
              fixedContent.push({ type: contentType, text: "" });
            }
            return { ...msg, content: fixedContent };
          }
          
          return msg;
        });
      }
      
      // Additional safety check for Responses API
      if (isResponsesApi && req.body.input) {
        // Final pass to ensure NO nulls remain
        req.body.input = req.body.input.map((msg: any, idx: number) => {
          // Absolute guarantee: no null content
          if (msg.content === null || msg.content === undefined) {
            console.log(`[null-content-fix] CRITICAL: Found null at input[${idx}].content after initial fix - applying emergency fix`);
            fixCount++;
            const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
            return { ...msg, content: [{ type: contentType, text: "" }] };
          }
          
          // Ensure content is always an array for Responses API
          if (typeof msg.content === 'string') {
            const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
            return { ...msg, content: [{ type: contentType, text: msg.content }] };
          }
          
          // Ensure array has no nulls
          if (Array.isArray(msg.content)) {
            const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
            const cleanContent = msg.content
              .filter((item: any) => item !== null && item !== undefined)
              .map((item: any) => {
                if (typeof item === 'string') {
                  return { type: contentType, text: item };
                }
                if (typeof item === 'object' && item !== null) {
                  // Ensure text is not null
                  if (item.text === null || item.text === undefined) {
                    return { ...item, text: "" };
                  }
                  // Ensure type is set
                  if (!item.type) {
                    return { ...item, type: contentType };
                  }
                  return item;
                }
                return { type: contentType, text: "" };
              });
            
            // Always have at least one item
            if (cleanContent.length === 0) {
              cleanContent.push({ type: contentType, text: "" });
            }
            
            return { ...msg, content: cleanContent };
          }
          
          return msg;
        });
      }
      
      // Log summary if any fixes were applied
      if (fixCount > 0) {
        console.log(`[null-content-fix] Applied ${fixCount} fixes to prevent null content errors (${isResponsesApi ? 'Responses API' : 'Chat Completions'})`);
      }
    }
  });
  
  server.addHook("preHandler", async (req, reply) => {
    if(req.url.startsWith("/v1/messages")) {
      router(req, reply, config)
    }
  });
  server.start();
}

export { run };
// run();
