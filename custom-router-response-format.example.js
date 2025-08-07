/**
 * Custom router example for OpenAI Response Format API
 * This router demonstrates how to route requests based on response_format requirements
 */

module.exports = async function router(req, config) {
  const { body } = req;
  
  // Check if request has response_format
  if (body.response_format) {
    const { type, json_schema } = body.response_format;
    
    // Route based on response format type
    switch (type) {
      case "json_schema":
        // For structured outputs, use a model that supports json_schema
        console.log("Routing to structured output model for json_schema");
        
        // You can add additional logic here, e.g., based on schema complexity
        if (json_schema && json_schema.schema) {
          const schemaSize = JSON.stringify(json_schema.schema).length;
          
          // Use different models based on schema complexity
          if (schemaSize > 5000) {
            // For complex schemas, use a more powerful model
            return "openai,gpt-4o-2024-08-06";
          } else {
            // For simple schemas, use a faster model
            return "openai,gpt-4o-mini";
          }
        }
        
        // Default structured output model
        return config.Router.structuredOutput || "openai,gpt-4o-mini";
        
      case "json_object":
        // For basic JSON mode
        console.log("Routing to JSON mode model for json_object");
        
        // Check token count to decide between models
        if (req.tokenCount && req.tokenCount > 2000) {
          // For longer contexts, use a model with better context handling
          return "openai,gpt-4-turbo";
        }
        
        // Default JSON mode model
        return config.Router.jsonMode || "openai,gpt-3.5-turbo";
        
      case "text":
        // Regular text response, no special routing needed
        break;
        
      default:
        console.warn(`Unknown response_format type: ${type}`);
    }
  }
  
  // Check for specific use cases that benefit from structured outputs
  const userMessage = body.messages.find(m => m.role === "user")?.content;
  
  if (userMessage && typeof userMessage === "string") {
    // Route data extraction tasks to structured output models
    if (userMessage.match(/extract|parse|analyze.*data|json|structured/i)) {
      console.log("Detected data extraction task, routing to structured output model");
      return config.Router.structuredOutput || "openai,gpt-4o-mini";
    }
    
    // Route API response generation to JSON mode
    if (userMessage.match(/api|endpoint|rest|response/i)) {
      console.log("Detected API response generation, routing to JSON mode model");
      return config.Router.jsonMode || "openai,gpt-3.5-turbo";
    }
  }
  
  // Check if tools are being used (might benefit from structured outputs)
  if (body.tools && body.tools.length > 0) {
    // Complex tool usage might benefit from structured outputs
    if (body.tools.length > 3) {
      console.log("Multiple tools detected, considering structured output model");
      return config.Router.structuredOutput || "openai,gpt-4o-mini";
    }
  }
  
  // Fallback to default router logic
  return null;
};

/**
 * Example usage in Claude Code:
 * 
 * 1. For structured data extraction:
 * ```javascript
 * const response = await fetch('http://localhost:3456/v1/messages', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer your-api-key'
 *   },
 *   body: JSON.stringify({
 *     model: 'claude-3-5-sonnet',
 *     messages: [{
 *       role: 'user',
 *       content: 'Extract the key information from this text...'
 *     }],
 *     response_format: {
 *       type: 'json_schema',
 *       json_schema: {
 *         name: 'extraction_result',
 *         strict: true,
 *         schema: {
 *           type: 'object',
 *           properties: {
 *             title: { type: 'string' },
 *             summary: { type: 'string' },
 *             key_points: {
 *               type: 'array',
 *               items: { type: 'string' }
 *             }
 *           },
 *           required: ['title', 'summary', 'key_points']
 *         }
 *       }
 *     }
 *   })
 * });
 * ```
 * 
 * 2. For JSON mode (less strict):
 * ```javascript
 * const response = await fetch('http://localhost:3456/v1/messages', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer your-api-key'
 *   },
 *   body: JSON.stringify({
 *     model: 'claude-3-5-sonnet',
 *     messages: [{
 *       role: 'user',
 *       content: 'Generate a JSON response with user data'
 *     }],
 *     response_format: {
 *       type: 'json_object'
 *     }
 *   })
 * });
 * ```
 */