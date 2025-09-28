/**
 * Core MCP server logic shared between Node.js and Cloudflare Workers
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Types and interfaces
interface MCPConfig {
  transport: string;
  httpPort: number;
  cacheSize: number;
  cacheTTL: number;
}

interface CacheEntry {
  data: any;
  expires: number;
}

interface MCPRequest {
  jsonrpc: string;
  id: string | number | null;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Validation schemas
const CnpjSchema = z.object({
  cnpj: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length === 14, {
      message: "CNPJ must have exactly 14 digits",
    }),
});

const CepSchema = z.object({
  cep: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length === 8, {
      message: "CEP must have exactly 8 digits",
    }),
});

// In-memory cache for Node.js, KV for Cloudflare Workers
class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 256, ttl = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + this.ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
let globalCache: MemoryCache;

/**
 * Initialize cache
 */
function initializeCache(config: MCPConfig): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache(config.cacheSize, config.cacheTTL);
  }
  return globalCache;
}

/**
 * HTTP client with timeout
 */
async function httpJson(
  url: string,
  timeoutMs = 8000
): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MCP-DadosBR/1.0.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return { ok: false, error: "Not found" };
      }
      if (response.status === 429) {
        return { ok: false, error: "Rate limited, try again later" };
      }
      if (response.status >= 500) {
        return { ok: false, error: "Service temporarily unavailable" };
      }
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { ok: false, error: "Request timeout after 8 seconds" };
      }
      return { ok: false, error: `Network error: ${error.message}` };
    }
    return { ok: false, error: "Unknown error" };
  }
}

/**
 * CNPJ lookup function
 */
async function cnpjLookup(
  cnpj: string,
  cache: MemoryCache | KVNamespace | null
): Promise<any> {
  const startTime = Date.now();
  const cacheKey = `cnpj:${cnpj}`;

  // Check cache first
  let cachedResult = null;
  if (cache) {
    if (cache instanceof MemoryCache) {
      cachedResult = cache.get(cacheKey);
    } else {
      // KV namespace for Cloudflare Workers
      const cached = await cache.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() < parsed.expires) {
          cachedResult = parsed.data;
        }
      }
    }
  }

  if (cachedResult) {
    const elapsed = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] [cnpj_lookup] [${cnpj}] [cache_hit] [${elapsed}ms]`
    );
    return { ok: true, data: cachedResult };
  }

  // Make API call
  const apiUrl = `https://opencnpj.com/api/cnpj/${cnpj}`;
  const result = await httpJson(apiUrl);
  const elapsed = Date.now() - startTime;

  if (result.ok && result.data) {
    const responseData = {
      ...result.data,
      source: "OpenCNPJ",
      fetchedAt: new Date().toISOString(),
    };

    // Cache successful result
    if (cache) {
      if (cache instanceof MemoryCache) {
        cache.set(cacheKey, responseData);
      } else {
        // KV namespace
        await cache.put(
          cacheKey,
          JSON.stringify({
            data: responseData,
            expires: Date.now() + 60000, // 60 seconds TTL
          })
        );
      }
    }

    console.log(
      `[${new Date().toISOString()}] [cnpj_lookup] [${cnpj}] [success] [${elapsed}ms]`
    );
    return { ok: true, data: responseData };
  }

  console.log(
    `[${new Date().toISOString()}] [cnpj_lookup] [${cnpj}] [error] [${elapsed}ms]`
  );
  return result;
}

/**
 * CEP lookup function
 */
async function cepLookup(
  cep: string,
  cache: MemoryCache | KVNamespace | null
): Promise<any> {
  const startTime = Date.now();
  const cacheKey = `cep:${cep}`;

  // Check cache first
  let cachedResult = null;
  if (cache) {
    if (cache instanceof MemoryCache) {
      cachedResult = cache.get(cacheKey);
    } else {
      // KV namespace for Cloudflare Workers
      const cached = await cache.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() < parsed.expires) {
          cachedResult = parsed.data;
        }
      }
    }
  }

  if (cachedResult) {
    const elapsed = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] [cep_lookup] [${cep}] [cache_hit] [${elapsed}ms]`
    );
    return { ok: true, data: cachedResult };
  }

  // Make API call
  const apiUrl = `https://opencep.com/api/cep/${cep}`;
  const result = await httpJson(apiUrl);
  const elapsed = Date.now() - startTime;

  if (result.ok && result.data) {
    const responseData = {
      ...result.data,
      source: "OpenCEP",
      fetchedAt: new Date().toISOString(),
    };

    // Cache successful result
    if (cache) {
      if (cache instanceof MemoryCache) {
        cache.set(cacheKey, responseData);
      } else {
        // KV namespace
        await cache.put(
          cacheKey,
          JSON.stringify({
            data: responseData,
            expires: Date.now() + 60000, // 60 seconds TTL
          })
        );
      }
    }

    console.log(
      `[${new Date().toISOString()}] [cep_lookup] [${cep}] [success] [${elapsed}ms]`
    );
    return { ok: true, data: responseData };
  }

  console.log(
    `[${new Date().toISOString()}] [cep_lookup] [${cep}] [error] [${elapsed}ms]`
  );
  return result;
}

/**
 * Create MCP server instance
 */
export function createMCPServer(): Server {
  const server = new Server(
    {
      name: "mcp-dadosbr",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "cnpj_lookup",
        description: "Look up Brazilian company information by CNPJ number",
        inputSchema: {
          type: "object",
          properties: {
            cnpj: {
              type: "string",
              description: "CNPJ number (with or without formatting)",
            },
          },
          required: ["cnpj"],
        },
      },
      {
        name: "cep_lookup",
        description: "Look up Brazilian postal code information by CEP",
        inputSchema: {
          type: "object",
          properties: {
            cep: {
              type: "string",
              description: "CEP postal code (with or without formatting)",
            },
          },
          required: ["cep"],
        },
      },
    ],
  }));

  return server;
}

/**
 * Handle MCP request (for Cloudflare Workers)
 */
export async function handleMCPRequest(
  request: MCPRequest,
  config: MCPConfig,
  kvCache?: KVNamespace
): Promise<MCPResponse> {
  const cache = kvCache || initializeCache(config);

  try {
    switch (request.method) {
      case "tools/list":
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            tools: [
              {
                name: "cnpj_lookup",
                description:
                  "Look up Brazilian company information by CNPJ number",
                inputSchema: {
                  type: "object",
                  properties: {
                    cnpj: {
                      type: "string",
                      description: "CNPJ number (with or without formatting)",
                    },
                  },
                  required: ["cnpj"],
                },
              },
              {
                name: "cep_lookup",
                description: "Look up Brazilian postal code information by CEP",
                inputSchema: {
                  type: "object",
                  properties: {
                    cep: {
                      type: "string",
                      description:
                        "CEP postal code (with or without formatting)",
                    },
                  },
                  required: ["cep"],
                },
              },
            ],
          },
        };

      case "tools/call":
        const { name, arguments: args } = request.params;

        if (name === "cnpj_lookup") {
          const validation = CnpjSchema.safeParse(args);
          if (!validation.success) {
            return {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32602,
                message: "Invalid parameters",
                data: validation.error.issues,
              },
            };
          }

          const result = await cnpjLookup(validation.data.cnpj, cache);
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
        }

        if (name === "cep_lookup") {
          const validation = CepSchema.safeParse(args);
          if (!validation.success) {
            return {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32602,
                message: "Invalid parameters",
                data: validation.error.issues,
              },
            };
          }

          const result = await cepLookup(validation.data.cep, cache);
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
        }

        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: "Method not found",
            data: `Unknown tool: ${name}`,
          },
        };

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

export { MemoryCache };
export type { MCPConfig, MCPRequest, MCPResponse };
