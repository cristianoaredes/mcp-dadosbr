import { readFile } from "node:fs/promises";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SERVER_NAME, SERVER_VERSION } from "../config/index.js";
import { TOOL_DEFINITIONS, executeTool, resetMetrics } from "./tools.js";
import { Cache, ApiConfig } from "../types/index.js";
import { formatErrorResponse } from "../shared/errors.js";

const ibgeTool = "ibge_localidades";
const appMimeType = "text/html;profile=mcp-app";
const ibgeApp = {
  uri: "ui://dadosbr/ibge-localidades.html",
  name: "Explorador de localidades do IBGE",
  description: "Explore regiões, estados e municípios e confira a fonte oficial.",
  mimeType: appMimeType,
  _meta: { ui: { prefersBorder: true } },
};
const ibgeAppFile = new URL(
  import.meta.url.endsWith(".ts") ? "../../build/lib/apps/ibge.html" : "../apps/ibge.html",
  import.meta.url,
);

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
    { capabilities: { tools: {}, resources: {} } }
  );

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS.map((tool) => tool.name === ibgeTool
      ? { ...tool, _meta: { ui: { resourceUri: ibgeApp.uri } } }
      : tool),
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [ibgeApp],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
    if (params.uri !== ibgeApp.uri) {
      throw new McpError(ErrorCode.InvalidParams, "Unknown resource URI");
    }

    return { contents: [{
      uri: ibgeApp.uri,
      mimeType: ibgeApp.mimeType,
      text: await readFile(ibgeAppFile, "utf8"),
      _meta: ibgeApp._meta,
    }] };
  });

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await executeTool(name, args, apiConfig, cache);

      if (result.ok) {
        const appCapability = server.getClientCapabilities()?.extensions?.["io.modelcontextprotocol/ui"];
        const appMimeTypes = appCapability && "mimeTypes" in appCapability
          ? appCapability.mimeTypes
          : undefined;
        const structuredContent = name === ibgeTool && result.source
          && Array.isArray(appMimeTypes) && appMimeTypes.includes(appMimeType)
          && Array.isArray(result.data)
          ? { items: result.data, source: result.source }
          : undefined;
        return {
          ...(structuredContent && { structuredContent }),
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
