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

const appMimeType = "text/html;profile=mcp-app";
const apps = [
  {
    tool: "ibge_localidades",
    file: "ibge.html",
    id: "ibge-localidades",
    title: "Explorador de localidades do IBGE",
    description: "Explore regiões, estados e municípios e confira a fonte oficial.",
  },
  {
    tool: "querido_diario",
    file: "querido-diario.html",
    id: "querido-diario",
    title: "Querido Diário",
    description: "Pesquise publicações nos diários oficiais municipais.",
  },
  {
    tool: "bacen_taxas",
    file: "bacen.html",
    id: "banco-central",
    title: "Indicadores do Banco Central",
    description: "Consulte séries históricas de juros, inflação e câmbio.",
  },
].map(({ tool, file, id, title, description }) => ({
  tool,
  file: new URL((import.meta.url.endsWith(".ts") ? "../../build/lib/apps/" : "../apps/") + file, import.meta.url),
  resource: {
    uri: `ui://dadosbr/${id}.html`,
    name: title,
    description,
    mimeType: appMimeType,
    _meta: { ui: { prefersBorder: true } },
  },
}));

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
    tools: TOOL_DEFINITIONS.map((tool) => {
      const app = apps.find((entry) => entry.tool === tool.name);
      return app ? { ...tool, _meta: { ui: { resourceUri: app.resource.uri } } } : tool;
    }),
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: apps.map(({ resource }) => resource),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
    const app = apps.find(({ resource }) => resource.uri === params.uri);
    if (!app) {
      throw new McpError(ErrorCode.InvalidParams, "Unknown resource URI");
    }

    return { contents: [{
      uri: app.resource.uri,
      mimeType: app.resource.mimeType,
      text: await readFile(app.file, "utf8"),
      _meta: app.resource._meta,
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
        let structuredContent;
        if (result.source && Array.isArray(appMimeTypes) && appMimeTypes.includes(appMimeType)) {
          if (name === "ibge_localidades" && Array.isArray(result.data)) {
            structuredContent = { items: result.data, source: result.source };
          }
          if ((name === "querido_diario" || name === "bacen_taxas")
            && result.data && typeof result.data === "object" && !Array.isArray(result.data)) {
            structuredContent = { ...result.data, provenance: result.source };
          }
        }
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
