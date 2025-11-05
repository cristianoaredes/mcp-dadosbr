/**
 * Cloudflare Worker entry point for MCP DadosBR
 * Supports both HTTP JSON-RPC and Server-Sent Events (SSE) for remote MCP
 * Based on Cloudflare's MCP Agent documentation
 */

import {
  handleMCPRequest,
  handleMCPEndpoint,
  handleCORS,
  handleHealthCheck,
  corsHeaders,
  Env
} from "../adapters/cloudflare.js";
import { MCPRequest } from "../types/index.js";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 30; // Max requests per window per IP

/**
 * Generate cryptographically secure random token
 * @param prefix - Token prefix (e.g., 'mcp', 'access', 'bearer')
 * @returns Secure random token string
 */
function generateSecureToken(prefix: string = 'mcp'): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  const token = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${token}`;
}

// Authentication and rate limiting middleware
async function authenticateRequest(request: Request, env: Env): Promise<{ authenticated: boolean; error?: Response }> {
  // Skip authentication for health checks, OAuth endpoints, and MCP protocol endpoints
  const url = new URL(request.url);
  if (url.pathname === "/health" ||
    url.pathname === "/mcp" ||
    url.pathname === "/sse" ||
    url.pathname.startsWith("/oauth/") ||
    url.pathname.startsWith("/.well-known/") ||
    url.pathname === "/openapi.json") {
    return { authenticated: true };
  }

  // Check for API key if configured
  const expectedApiKey = env.MCP_API_KEY;
  if (expectedApiKey) {
    const authHeader = request.headers.get("Authorization");
    const apiKey = request.headers.get("X-API-Key");

    let providedKey: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      providedKey = authHeader.substring(7);
    } else if (apiKey) {
      providedKey = apiKey;
    }

    if (!providedKey || providedKey !== expectedApiKey) {
      return {
        authenticated: false,
        error: new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Valid API key required. Provide via 'Authorization: Bearer <key>' or 'X-API-Key: <key>' header."
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": "Bearer",
              ...corsHeaders,
            },
          }
        )
      };
    }
  }

  return { authenticated: true };
}

async function checkRateLimit(request: Request, env: Env): Promise<{ allowed: boolean; error?: Response }> {
  // Skip rate limiting for health checks
  const url = new URL(request.url);
  if (url.pathname === "/health") {
    return { allowed: true };
  }

  // Skip rate limiting if disabled
  if (env.MCP_DISABLE_RATE_LIMIT === "true") {
    return { allowed: true };
  }

  const clientIP = request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    request.headers.get("X-Real-IP") ||
    "unknown";

  const now = Date.now();
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW;
  const key = `ratelimit:${clientIP}:${windowStart}`;

  try {
    // Get current request count
    const currentCount = await env.MCP_KV?.get(key) || "0";
    const count = parseInt(currentCount as string) || 0;

    if (count >= RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        error: new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            message: `Too many requests. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute allowed.`,
            retryAfter: Math.ceil((windowStart + RATE_LIMIT_WINDOW - now) / 1000)
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": Math.ceil((windowStart + RATE_LIMIT_MAX_REQUESTS - now) / 1000).toString(),
              ...corsHeaders,
            },
          }
        )
      };
    }

    // Increment counter
    await env.MCP_KV?.put(key, (count + 1).toString());

    return { allowed: true };
  } catch (error) {
    // If KV fails, allow request but log error
    console.error("Rate limiting error:", error);
    return { allowed: true };
  }
}

// Local type for ExportedHandler to avoid conflicts
type WorkerExportedHandler<Env = unknown> = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
};

// Request body types for REST endpoints
interface SearchRequestBody {
  query: string;
  max_results?: number;
}

interface IntelligenceRequestBody {
  cnpj: string;
  categories?: string[];
  max_results_per_query?: number;
  max_queries?: number;
}

interface ThinkingRequestBody {
  thoughts: string;
  next_thought_needed?: boolean;
  thought_number?: number;
  total_thoughts?: number;
}

declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }
}

/**
 * Handle Server-Sent Events (SSE) endpoint for streaming MCP
 * Based on Cloudflare's MCP Agent SSE documentation
 */
async function handleSSEEndpoint(
  request: Request,
  env: Env
): Promise<Response> {
  // Check if client accepts SSE (relaxed for MCP connectors)
  const acceptHeader = request.headers.get("Accept");
  if (acceptHeader && !acceptHeader.includes("text/event-stream") && !acceptHeader.includes("*/*")) {
    return new Response("SSE endpoint requires Accept: text/event-stream", {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Create SSE response stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // SSE headers
  const sseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...corsHeaders,
  };

  // Send initial connection event
  const sendSSEMessage = async (data: any, event?: string, id?: string) => {
    let message = "";
    if (id) message += `id: ${id}\n`;
    if (event) message += `event: ${event}\n`;
    message += `data: ${JSON.stringify(data)}\n\n`;

    try {
      await writer.write(encoder.encode(message));
    } catch (error) {
      console.error("SSE write error:", error);
    }
  };

  // Handle the SSE connection
  (async () => {
    try {
      // Send connection established event
      await sendSSEMessage(
        {
          type: "connection",
          status: "connected",
          server: "mcp-dadosbr",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        },
        "connection"
      );

      // Send server capabilities
      await sendSSEMessage(
        {
          jsonrpc: "2.0",
          id: "init",
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "mcp-dadosbr",
              version: "1.0.0",
            },
          },
        },
        "message"
      );

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(async () => {
        try {
          await sendSSEMessage(
            {
              type: "ping",
              timestamp: new Date().toISOString(),
            },
            "ping"
          );
        } catch (error) {
          clearInterval(pingInterval);
        }
      }, 30000); // Ping every 30 seconds

      // Handle incoming messages from request body (if any)
      if (request.method === "POST") {
        try {
          const body = await request.text();
          if (body) {
            const mcpRequest: MCPRequest = JSON.parse(body);

            const config = {
              transport: env.MCP_TRANSPORT || "http",
              httpPort: parseInt(env.MCP_HTTP_PORT || "8787"),
              cacheSize: parseInt(env.MCP_CACHE_SIZE || "256"),
              cacheTTL: parseInt(env.MCP_CACHE_TTL || "60000"),
            };

            const response = await handleMCPRequest(mcpRequest, env);
            await sendSSEMessage(
              response,
              "message",
              mcpRequest.id?.toString()
            );
          }
        } catch (error) {
          await sendSSEMessage(
            {
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32700,
                message: "Parse error",
                data: error instanceof Error ? error.message : "Invalid JSON",
              },
            },
            "error"
          );
        }
      }

      // Clean up on connection close
      setTimeout(() => {
        clearInterval(pingInterval);
        writer.close();
      }, 300000); // Close after 5 minutes of inactivity
    } catch (error) {
      console.error("SSE handler error:", error);
      await sendSSEMessage(
        {
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        "error"
      );
      writer.close();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: sseHeaders,
  });
}

/**
 * Main Cloudflare Worker fetch handler
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    const corsResponse = handleCORS(request);
    if (corsResponse) {
      return corsResponse;
    }

    // Apply rate limiting
    const rateLimitResult = await checkRateLimit(request, env);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!;
    }

    // Apply authentication
    const authResult = await authenticateRequest(request, env);
    if (!authResult.authenticated) {
      return authResult.error!;
    }

    // Route handling
    switch (url.pathname) {
      case "/health":
        return handleHealthCheck();

      case "/mcp":
        // HTTP JSON-RPC endpoint
        if (request.method !== "POST") {
          return new Response("Method not allowed", {
            status: 405,
            headers: corsHeaders,
          });
        }
        return await handleMCPEndpoint(request, env);

      case "/sse":
        // Server-Sent Events endpoint for streaming MCP
        if (request.method !== "GET" && request.method !== "POST") {
          return new Response("Method not allowed", {
            status: 405,
            headers: corsHeaders,
          });
        }
        return await handleSSEEndpoint(request, env);

      case "/.well-known/oauth-authorization-server":
      case "/.well-known/openid_configuration":
        // OAuth discovery endpoint for ChatGPT MCP connector
        const baseUrl = new URL(request.url).origin;
        const oauthConfig = {
          issuer: baseUrl,
          authorization_endpoint: `${baseUrl}/oauth/authorize`,
          token_endpoint: `${baseUrl}/oauth/token`,
          userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
          jwks_uri: `${baseUrl}/.well-known/jwks.json`,
          scopes_supported: ["openid", "profile", "mcp"],
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
          token_endpoint_auth_methods_supported: ["client_secret_basic", "none"]
        };

        return new Response(JSON.stringify(oauthConfig, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });

      case "/oauth/authorize":
        // Simple OAuth authorize endpoint (for MCP connector)
        const authUrl = new URL(request.url);
        const clientId = authUrl.searchParams.get("client_id");
        const redirectUri = authUrl.searchParams.get("redirect_uri");
        const state = authUrl.searchParams.get("state");

        if (!redirectUri) {
          return new Response("Missing redirect_uri", { status: 400, headers: corsHeaders });
        }

        // For MCP connector, we'll auto-approve and redirect with a secure code
        const code = generateSecureToken('access');
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set("code", code);
        if (state) redirectUrl.searchParams.set("state", state);

        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectUrl.toString(),
            ...corsHeaders,
          },
        });

      case "/oauth/token":
        // OAuth token endpoint
        if (request.method !== "POST") {
          return new Response("Method not allowed", { status: 405, headers: corsHeaders });
        }

        const tokenResponse = {
          access_token: generateSecureToken('bearer'),
          token_type: "Bearer",
          expires_in: 3600,
          scope: "mcp"
        };

        return new Response(JSON.stringify(tokenResponse), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });

      case "/oauth/userinfo":
        // OAuth userinfo endpoint
        const userInfo = {
          sub: "mcp-dadosbr-user",
          name: "MCP DadosBR User",
          preferred_username: "mcp-user"
        };

        return new Response(JSON.stringify(userInfo), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });

      case "/.well-known/jwks.json":
        // JSON Web Key Set (dummy for MCP)
        const jwks = {
          keys: []
        };

        return new Response(JSON.stringify(jwks), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });

      case "/openapi.json":
        // OpenAPI schema for ChatGPT integration
        const openApiSchema = {
          openapi: "3.0.0",
          info: {
            title: "MCP DadosBR API",
            description: "Brazilian public data lookup API for CNPJ (companies) and CEP (postal codes) with advanced search capabilities",
            version: "1.0.0"
          },
          servers: [{ url: new URL(request.url).origin }],
          security: [
            {
              "OAuth2": ["mcp"]
            },
            {
              "ApiKeyAuth": []
            }
          ],
          components: {
            securitySchemes: {
              OAuth2: {
                type: "oauth2",
                flows: {
                  authorizationCode: {
                    authorizationUrl: `${new URL(request.url).origin}/oauth/authorize`,
                    tokenUrl: `${new URL(request.url).origin}/oauth/token`,
                    scopes: {
                      "mcp": "Access to MCP DadosBR tools",
                      "openid": "OpenID Connect",
                      "profile": "User profile information"
                    }
                  }
                }
              },
              ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "X-API-Key",
                description: "API key for authentication. Can also be provided via 'Authorization: Bearer <key>' header."
              }
            }
          },
          paths: {
            "/cnpj/{cnpj}": {
              get: {
                summary: "Look up CNPJ company data",
                security: [
                  { "OAuth2": ["mcp"] },
                  { "ApiKeyAuth": [] }
                ],
                parameters: [{
                  name: "cnpj",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                  description: "CNPJ number (with or without formatting)"
                }],
                responses: {
                  "200": { description: "Company information" },
                  "404": { description: "CNPJ not found" },
                  "401": { description: "Unauthorized - API key required" },
                  "429": { description: "Rate limit exceeded" }
                }
              }
            },
            "/cep/{cep}": {
              get: {
                summary: "Look up CEP postal code data",
                security: [
                  { "OAuth2": ["mcp"] },
                  { "ApiKeyAuth": [] }
                ],
                parameters: [{
                  name: "cep",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                  description: "CEP postal code (with or without formatting)"
                }],
                responses: {
                  "200": { description: "Address information" },
                  "404": { description: "CEP not found" },
                  "401": { description: "Unauthorized - API key required" },
                  "429": { description: "Rate limit exceeded" }
                }
              }
            },
            "/search": {
              post: {
                summary: "Search the web for Brazilian company information",
                security: [
                  { "OAuth2": ["mcp"] },
                  { "ApiKeyAuth": [] }
                ],
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          query: {
                            type: "string",
                            description: "Search query with optional operators (site:, intext:, filetype:, etc.)"
                          },
                          max_results: {
                            type: "integer",
                            minimum: 1,
                            maximum: 20,
                            default: 5,
                            description: "Maximum number of results to return"
                          }
                        },
                        required: ["query"]
                      }
                    }
                  }
                },
                responses: {
                  "200": { description: "Search results" },
                  "400": { description: "Invalid request" },
                  "401": { description: "Unauthorized - API key required" },
                  "429": { description: "Rate limit exceeded" }
                }
              }
            },
            "/intelligence": {
              post: {
                summary: "Intelligent search for Brazilian company information",
                security: [
                  { "OAuth2": ["mcp"] },
                  { "ApiKeyAuth": [] }
                ],
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          cnpj: {
                            type: "string",
                            description: "Brazilian CNPJ number (with or without formatting)"
                          },
                          categories: {
                            type: "array",
                            items: {
                              type: "string",
                              enum: ["government", "legal", "news", "documents", "social", "partners"]
                            },
                            description: "Search categories to include"
                          },
                          max_results_per_query: {
                            type: "integer",
                            minimum: 1,
                            maximum: 10,
                            default: 5,
                            description: "Maximum results per search query"
                          },
                          max_queries: {
                            type: "integer",
                            minimum: 1,
                            maximum: 20,
                            default: 10,
                            description: "Maximum number of search queries"
                          }
                        },
                        required: ["cnpj"]
                      }
                    }
                  }
                },
                responses: {
                  "200": { description: "Intelligence search results" },
                  "400": { description: "Invalid request" },
                  "401": { description: "Unauthorized - API key required" },
                  "429": { description: "Rate limit exceeded" }
                }
              }
            },
            "/thinking": {
              post: {
                summary: "Structured reasoning and problem-solving",
                security: [
                  { "OAuth2": ["mcp"] },
                  { "ApiKeyAuth": [] }
                ],
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          thought: {
                            type: "string",
                            description: "Current thinking step"
                          },
                          nextThoughtNeeded: {
                            type: "boolean",
                            description: "Whether another thought step is needed"
                          },
                          thoughtNumber: {
                            type: "integer",
                            minimum: 1,
                            description: "Current thought number"
                          },
                          totalThoughts: {
                            type: "integer",
                            minimum: 1,
                            description: "Estimated total thoughts needed"
                          }
                        },
                        required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
                      }
                    }
                  }
                },
                responses: {
                  "200": { description: "Thinking result" },
                  "400": { description: "Invalid request" },
                  "401": { description: "Unauthorized - API key required" },
                  "429": { description: "Rate limit exceeded" }
                }
              }
            },
            "/mcp": {
              post: {
                summary: "MCP JSON-RPC endpoint",
                description: "Model Context Protocol JSON-RPC endpoint for AI assistants",
                security: [], // No authentication required for MCP protocol
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          jsonrpc: { type: "string", enum: ["2.0"] },
                          id: { type: ["string", "number", "null"] },
                          method: { type: "string" },
                          params: { type: "object" }
                        },
                        required: ["jsonrpc", "method"]
                      }
                    }
                  }
                },
                responses: {
                  "200": { description: "MCP response" },
                  "400": { description: "Invalid request" }
                }
              }
            },
            "/sse": {
              get: {
                summary: "MCP Server-Sent Events endpoint",
                description: "Model Context Protocol streaming endpoint for real-time communication",
                security: [], // No authentication required for MCP protocol
                responses: {
                  "200": { description: "SSE stream established" },
                  "400": { description: "Invalid request" }
                }
              }
            }
          }
        };

        return new Response(JSON.stringify(openApiSchema, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });

      case "/":
        // Root endpoint with basic info
        const info = {
          service: "MCP DadosBR",
          description:
            "Model Context Protocol server for Brazilian public data",
          version: "1.0.0",
          runtime: "cloudflare-workers",
          free_tier: {
            workers: "100,000 requests/day",
            kv: "100,000 reads/day, 1,000 writes/day, 1GB storage",
            note: "Perfect for MCP remote server hosting",
          },
          endpoints: {
            mcp: "/mcp (HTTP JSON-RPC)",
            sse: "/sse (Server-Sent Events)",
            health: "/health",
            openapi: "/openapi.json",
            oauth: "/.well-known/oauth-authorization-server"
          },
          tools: ["cnpj_lookup", "cep_lookup", "cnpj_search", "sequentialthinking", "cnpj_intelligence"],
          documentation: "https://github.com/cristianoaredes/mcp-dadosbr",
          cloudflare_docs: {
            agents: "https://developers.cloudflare.com/agents/",
            sse: "https://developers.cloudflare.com/agents/api-reference/http-sse/",
            pricing:
              "https://developers.cloudflare.com/workers/platform/pricing/",
          },
        };

        return new Response(JSON.stringify(info, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });

      default:
        // Handle REST API endpoints for ChatGPT integration
        const pathMatch = url.pathname.match(/^\/(cnpj|cep)\/(.+)$/);
        if (pathMatch && request.method === "GET") {
          const [, toolType, value] = pathMatch;

          try {
            const mcpRequest: MCPRequest = {
              jsonrpc: "2.0",
              id: Date.now(),
              method: "tools/call",
              params: {
                name: `${toolType}_lookup`,
                arguments: { [toolType]: value }
              }
            };

            const config = {
              transport: env.MCP_TRANSPORT || "http",
              httpPort: parseInt(env.MCP_HTTP_PORT || "8787"),
              cacheSize: parseInt(env.MCP_CACHE_SIZE || "256"),
              cacheTTL: parseInt(env.MCP_CACHE_TTL || "60000"),
            };

            const mcpResponse = await handleMCPRequest(mcpRequest, env);

            if (mcpResponse.error) {
              return new Response(
                JSON.stringify({
                  error: mcpResponse.error.message,
                  code: mcpResponse.error.code,
                  data: mcpResponse.error.data
                }),
                {
                  status: mcpResponse.error.code === -32603 && mcpResponse.error.data === "Not found" ? 404 : 400,
                  headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                  },
                }
              );
            }

            return new Response(JSON.stringify(mcpResponse.result, null, 2), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            });
          } catch (error) {
            return new Response(
              JSON.stringify({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error"
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

        // Handle advanced REST endpoints for ChatGPT integration
        if (url.pathname === "/search" && request.method === "POST") {
          try {
            const body = await request.json() as SearchRequestBody;
            const { query, max_results = 5 } = body;

            if (!query) {
              return new Response(
                JSON.stringify({ error: "Missing query parameter" }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json", ...corsHeaders },
                }
              );
            }

            const mcpRequest: MCPRequest = {
              jsonrpc: "2.0",
              id: Date.now(),
              method: "tools/call",
              params: {
                name: "cnpj_search",
                arguments: { query, max_results }
              }
            };

            const mcpResponse = await handleMCPRequest(mcpRequest, env);

            if (mcpResponse.error) {
              return new Response(
                JSON.stringify({
                  error: mcpResponse.error.message,
                  code: mcpResponse.error.code
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json", ...corsHeaders },
                }
              );
            }

            return new Response(JSON.stringify(mcpResponse.result, null, 2), {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          } catch (error) {
            return new Response(
              JSON.stringify({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error"
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }
        }

        if (url.pathname === "/intelligence" && request.method === "POST") {
          try {
            const body = await request.json() as IntelligenceRequestBody;
            const { cnpj, categories, max_results_per_query = 5, max_queries = 10 } = body;

            if (!cnpj) {
              return new Response(
                JSON.stringify({ error: "Missing cnpj parameter" }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json", ...corsHeaders },
                }
              );
            }

            const mcpRequest: MCPRequest = {
              jsonrpc: "2.0",
              id: Date.now(),
              method: "tools/call",
              params: {
                name: "cnpj_intelligence",
                arguments: { cnpj, categories, max_results_per_query, max_queries }
              }
            };

            const mcpResponse = await handleMCPRequest(mcpRequest, env);

            if (mcpResponse.error) {
              return new Response(
                JSON.stringify({
                  error: mcpResponse.error.message,
                  code: mcpResponse.error.code
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json", ...corsHeaders },
                }
              );
            }

            return new Response(JSON.stringify(mcpResponse.result, null, 2), {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          } catch (error) {
            return new Response(
              JSON.stringify({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error"
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }
        }

        if (url.pathname === "/thinking" && request.method === "POST") {
          try {
            const body = await request.json() as ThinkingRequestBody;

            const mcpRequest: MCPRequest = {
              jsonrpc: "2.0",
              id: Date.now(),
              method: "tools/call",
              params: {
                name: "sequentialthinking",
                arguments: body
              }
            };

            const mcpResponse = await handleMCPRequest(mcpRequest, env);

            if (mcpResponse.error) {
              return new Response(
                JSON.stringify({
                  error: mcpResponse.error.message,
                  code: mcpResponse.error.code
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json", ...corsHeaders },
                }
              );
            }

            return new Response(JSON.stringify(mcpResponse.result, null, 2), {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          } catch (error) {
            return new Response(
              JSON.stringify({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error"
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }
        }

        return new Response("Not found", {
          status: 404,
          headers: corsHeaders,
        });
    }
  },
} satisfies WorkerExportedHandler<Env>;
