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
    put(
      key: string,
      value: string,
      options?: { expiration?: number; expirationTtl?: number; metadata?: unknown }
    ): Promise<void>;
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
  MCP_ALLOWED_ORIGINS?: string;
  MCP_DISABLE_RATE_LIMIT?: string;
  MCP_TRUST_X_FORWARDED_FOR?: string;
  MCP_KV?: KVNamespace;
  TAVILY_API_KEY?: string; // Tavily search API key (secret)
  PERPLEXITY_API_KEY?: string; // Perplexity search API key (secret)
  TRANSPARENCIA_API_KEY?: string; // Portal da Transparência API key (secret)
  DATAJUD_API_KEY?: string; // CNJ Datajud API key (secret)
}

const WORKER_ENV_KEYS = [
  "TAVILY_API_KEY",
  "PERPLEXITY_API_KEY",
  "TRANSPARENCIA_API_KEY",
  "DATAJUD_API_KEY",
] as const;

/**
 * Propagate allowlisted Worker secret bindings into process.env for tool execution.
 */
export function syncWorkerEnv(env?: Env): void {
  if (!env || typeof process === "undefined" || !process.env) return;
  for (const key of WORKER_ENV_KEYS) {
    const value = env[key];
    if (typeof value === "string" && value.length > 0) {
      process.env[key] = value;
    }
  }
}


const BASE_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
  "X-Content-Type-Options": "nosniff",
};

// Base CORS headers without wildcard origin
const corsHeaders: Record<string, string> = { ...BASE_CORS_HEADERS };

function parseAllowedOrigins(raw?: string): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const origins: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || trimmed === "*") continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        origins.push(parsed.origin);
      }
    } catch {
      // Ignore malformed origin entries
    }
  }
  return origins;
}

function getCorsHeaders(
  request: Request,
  env?: Env,
  options?: { isPublic?: boolean }
): Record<string, string> {
  const hasApiKey = typeof env?.MCP_API_KEY === "string" && env.MCP_API_KEY.length > 0;
  const allowedOrigins = parseAllowedOrigins(env?.MCP_ALLOWED_ORIGINS);
  const origin = request.headers.get("Origin");

  if (allowedOrigins.length > 0) {
    const headers: Record<string, string> = {
      ...BASE_CORS_HEADERS,
      Vary: "Origin",
    };
    if (origin && allowedOrigins.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    return headers;
  }

  if (hasApiKey && !options?.isPublic) {
    return {
      ...BASE_CORS_HEADERS,
      Vary: "Origin",
    };
  }

  return {
    ...BASE_CORS_HEADERS,
    "Access-Control-Allow-Origin": "*",
  };
}

function handleCORS(
  request: Request,
  env?: Env,
  options?: { isPublic?: boolean }
): Response | null {
  if (request.method !== "OPTIONS") return null;
  const headers = getCorsHeaders(request, env, options);
  if (request.headers.get("Origin") && !("Access-Control-Allow-Origin" in headers)) {
    return new Response("Origin not allowed", {
      status: 403,
      headers,
    });
  }
  return new Response(null, {
    status: 204,
    headers,
  });
}

function withCorsHeaders(
  response: Response,
  request: Request,
  env?: Env,
  options?: { isPublic?: boolean }
): Response {
  const headers = new Headers(response.headers);
  headers.delete("Access-Control-Allow-Origin");
  for (const [key, value] of Object.entries(getCorsHeaders(request, env, options))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function handleHealthCheck(request?: Request, env?: Env): Response {
  const healthData = {
    status: "healthy",
    service: "mcp-dadosbr",
    version: SERVER_VERSION,
    timestamp: new Date().toISOString(),
    runtime: "cloudflare-workers",
  };
  const headers = request
    ? getCorsHeaders(request, env, { isPublic: true })
    : corsHeaders;

  return new Response(JSON.stringify(healthData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export async function handleMCPRequest(
  request: MCPRequest,
  env: Env
): Promise<MCPResponse> {
  syncWorkerEnv(env);

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
  syncWorkerEnv(env);

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

export {
  corsHeaders,
  getCorsHeaders,
  parseAllowedOrigins,
  withCorsHeaders,
  handleCORS,
  handleHealthCheck,
};
