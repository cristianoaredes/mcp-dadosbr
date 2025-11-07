import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SERVER_NAME, SERVER_VERSION } from "../config/index.js";
import { TOOL_DEFINITIONS, executeTool, resetMetrics } from "./tools.js";
import { Cache, ApiConfig } from "../types/index.js";
import { formatErrorResponse } from "../shared/errors.js";

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

      if (result.ok) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      }

      // Format error with proper categorization
      const errorDetails = formatErrorResponse(new Error(result.error));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorDetails.message,
              code: errorDetails.code,
              ...(errorDetails.data ? { details: errorDetails.data } : {})
            }, null, 2),
          },
        ],
        isError: true,
      };
    } catch (error: unknown) {
      // Categorize and format unexpected errors
      const errorDetails = formatErrorResponse(error);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: errorDetails.message,
              code: errorDetails.code,
              ...(errorDetails.data ? { details: errorDetails.data } : {})
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
