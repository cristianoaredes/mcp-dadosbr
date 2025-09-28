import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SERVER_NAME, SERVER_VERSION } from "../config/index.js";
import { TOOL_DEFINITIONS, executeTool, resetMetrics } from "./tools.js";
import { Cache, ApiConfig } from "../types/index.js";

export interface MCPServerOptions {
  apiConfig: ApiConfig;
  cache?: Cache;
}

export function createMCPServer(options: MCPServerOptions): Server {
  const { apiConfig, cache } = options;
  
  // Reset metrics on server creation
  resetMetrics();

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      const result = await executeTool(name, args, apiConfig, cache);
      
      return {
        content: [
          {
            type: "text",
            text: result.ok
              ? JSON.stringify(result.data, null, 2)
              : `Error: ${result.error}`,
          },
        ],
        ...(result.ok ? {} : { isError: true }),
      };
    } catch (error: any) {
      return {
        content: [
          { type: "text", text: `Error: ${error.message || "Unknown error"}` },
        ],
        isError: true,
      };
    }
  });

  return server;
}
