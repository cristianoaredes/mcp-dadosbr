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
import { TIMEOUTS } from "../config/timeouts.js";
import { TOOL_DEFINITIONS, executeTool, resetMetrics } from "./tools.js";
import { SequentialThinkingProcessor } from "./sequential-thinking.js";
import { RateLimiter } from "../infrastructure/rate-limiter.js";
import { Cache, ApiConfig } from "../types/index.js";
import { formatErrorResponse, RateLimitError } from "../shared/errors.js";
import { readCnpjProfile } from "../shared/cnpj-profile.js";

const DEFAULT_MCP_TOOL_RATE_LIMIT_MAX = 120;

function parsePositiveIntEnv(name: string): number | undefined {
  const raw = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (!raw) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

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
  {
    tool: "pncp_licitacoes",
    file: "pncp.html",
    id: "editais-pncp",
    title: "Editais do PNCP",
    description: "Consulte publicações por período, modalidade e órgão.",
  },
  {
    tool: "cnpj_lookup",
    file: "cnpj.html",
    id: "ficha-cnpj",
    title: "Ficha por CNPJ",
    description: "Consulte situação cadastral, CNAEs, endereço e provedor dos dados.",
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
  rateLimit?: { windowMs: number; maxRequests: number } | false;
}

export function createMCPServer(options: MCPServerOptions): Server {
  const { apiConfig, cache, rateLimit } = options;

  // Reset metrics on server creation
  resetMetrics();

  // Session-local sequential thinking state (isolated per server/connection)
  const thinkingProcessor = new SequentialThinkingProcessor();

  // Session-local tool execution rate limiter covering stdio/SSE/Smithery
  const disableRateLimit =
    rateLimit === false ||
    (typeof process !== "undefined" && process.env?.MCP_DISABLE_RATE_LIMIT === "true");
  const toolRateLimiter = disableRateLimit
    ? null
    : new RateLimiter({
        windowMs:
          typeof rateLimit === "object" ? rateLimit.windowMs : TIMEOUTS.RATE_LIMIT_WINDOW_MS,
        maxRequests:
          typeof rateLimit === "object"
            ? rateLimit.maxRequests
            : (parsePositiveIntEnv("MCP_TOOL_RATE_LIMIT_MAX") ?? DEFAULT_MCP_TOOL_RATE_LIMIT_MAX),
        enableCleanupTimer: false,
      });

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

    if (toolRateLimiter && !toolRateLimiter.checkLimit("mcp-session")) {
      const retryAfter = Math.max(
        1,
        Math.ceil(toolRateLimiter.getResetTime("mcp-session") / 1000)
      );
      const errorDetails = formatErrorResponse(new RateLimitError(retryAfter));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: errorDetails.message,
                code: errorDetails.code,
                ...(errorDetails.data ? { details: errorDetails.data } : {}),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await executeTool(name, args, apiConfig, cache, {
        thinkingProcessor,
      });

      if (result.ok) {
        const appCapability = server.getClientCapabilities()?.extensions?.["io.modelcontextprotocol/ui"];
        const appMimeTypes = appCapability && "mimeTypes" in appCapability
          ? appCapability.mimeTypes
          : undefined;
        let structuredContent;
        if (name === "cnpj_lookup" && Array.isArray(appMimeTypes) && appMimeTypes.includes(appMimeType)) {
          const profile = readCnpjProfile(result.data);
          if (profile) structuredContent = { profile };
        }
        if (result.source && Array.isArray(appMimeTypes) && appMimeTypes.includes(appMimeType)) {
          if (name === "ibge_localidades" && Array.isArray(result.data)) {
            structuredContent = { items: result.data, source: result.source };
          }
          if ((name === "querido_diario" || name === "bacen_taxas" || name === "pncp_licitacoes")
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
