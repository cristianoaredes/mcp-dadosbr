import { createMCPServer } from "../core/mcp-server.js";
import { KVCache } from "../core/cache.js";
import { resolveApiConfig, SERVER_VERSION } from "../config/index.js";
import { TOOL_DEFINITIONS, executeTool } from "../core/tools.js";
import { ServerConfig, MCPRequest, MCPResponse } from "../types/index.js";
import { TIMEOUTS } from "../config/timeouts.js";
import { CACHE } from "../shared/utils/constants.js";

// Cloudflare Worker types
declare global {
  interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  }
}

// Cloudflare Worker environment interface
export interface Env {
  MCP_TRANSPORT?: string;
  MCP_HTTP_PORT?: string;
  MCP_CACHE_SIZE?: string;
  MCP_CACHE_TTL?: string;
  MCP_CACHE?: KVNamespace;
  MCP_API_KEY?: string;
  MCP_DISABLE_RATE_LIMIT?: string;
  MCP_KV?: KVNamespace;
  TAVILY_API_KEY?: string; // Tavily search API key (secret)
}


// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

function handleCORS(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return null;
}

function handleHealthCheck(): Response {
  const healthData = {
    status: "healthy",
    service: "mcp-dadosbr",
    version: SERVER_VERSION,
    timestamp: new Date().toISOString(),
    runtime: "cloudflare-workers",
  };

  return new Response(JSON.stringify(healthData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export async function handleMCPRequest(
  request: MCPRequest,
  env: Env
): Promise<MCPResponse> {
  // Inject Cloudflare Workers environment variables into process.env
  // This allows tools to access secrets like TAVILY_API_KEY
  if (env.TAVILY_API_KEY) {
    process.env.TAVILY_API_KEY = env.TAVILY_API_KEY;
  }

  const serverConfig: ServerConfig = {
    transport: env.MCP_TRANSPORT || "http",
    httpPort: parseInt(env.MCP_HTTP_PORT || "8787"),
    cacheSize: parseInt(env.MCP_CACHE_SIZE || String(CACHE.DEFAULT_SIZE)),
    cacheTTL: parseInt(env.MCP_CACHE_TTL || String(CACHE.DEFAULT_TTL_MS)),
    apiTimeout: TIMEOUTS.HTTP_REQUEST_MS,
  };

  const apiConfig = resolveApiConfig();
  const cache = env.MCP_CACHE ? new KVCache(env.MCP_CACHE, serverConfig.cacheTTL as number) : undefined;

  try {
    switch (request.method) {
      case "tools/list":
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            tools: TOOL_DEFINITIONS,
          },
        };

      case "tools/call":
        const params = request.params as { name: string; arguments: unknown };
        const { name, arguments: args } = params;

        try {
          const result = await executeTool(name, args, apiConfig, cache);

          if (result.ok) {
            return {
              jsonrpc: "2.0",
              id: request.id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(result.data, null, 2),
                  },
                ],
              },
            };
          } else {
            return {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32603,
                message: "Tool execution failed",
                data: result.error,
              },
            };
          }
        } catch (error: unknown) {
          const err = error as Error;
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32602,
              message: "Invalid parameters",
              data: err.message,
            },
          };
        }

      default:
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: "Method not found",
            data: `Unknown method: ${request.method}`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

export async function handleMCPEndpoint(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.text();
    let mcpRequest: MCPRequest;

    try {
      mcpRequest = JSON.parse(body) as MCPRequest;
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error",
            data: "Invalid JSON in request body",
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const response = await handleMCPRequest(mcpRequest, env);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}

export { corsHeaders, handleCORS, handleHealthCheck };
