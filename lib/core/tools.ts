import { CnpjSchema, CepSchema } from "./validation.js";
import { httpJson } from "./http-client.js";
import { Cache, LookupResult, Metrics, ApiConfig } from "../types/index.js";
import { SEARCH_TOOL, executeSearch } from "./search.js";
import {
  SEQUENTIAL_THINKING_TOOL,
  SequentialThinkingProcessor,
} from "./sequential-thinking.js";
import type { IntelligenceOptions } from "./intelligence.js";

let metrics: Metrics = {
  requests: 0,
  cacheHits: 0,
  errors: 0,
  totalTime: 0,
  startTime: Date.now(),
};

// Simple performance monitoring
function logPerformanceMetrics(): void {
  const uptime = Date.now() - metrics.startTime;
  const avgResponseTime = metrics.requests > 0 ? metrics.totalTime / metrics.requests : 0;
  const cacheHitRate = metrics.requests > 0 ? (metrics.cacheHits / metrics.requests) * 100 : 0;

  console.error(`[metrics] Uptime: ${Math.round(uptime / 1000)}s | Requests: ${metrics.requests} | Cache Hit Rate: ${cacheHitRate.toFixed(1)}% | Avg Response: ${avgResponseTime.toFixed(0)}ms | Errors: ${metrics.errors}`);
}

// Log metrics every 100 requests
let lastMetricsLog = 0;

function recordMetrics(elapsed: number, fromCache: boolean, error: boolean) {
  metrics.requests++;
  metrics.totalTime += elapsed;
  if (fromCache) metrics.cacheHits++;
  if (error) metrics.errors++;

  // Log metrics every 10 requests (simple monitoring)
  if (metrics.requests - lastMetricsLog >= 10) {
    logPerformanceMetrics();
    lastMetricsLog = metrics.requests;
  }
}

// Request deduplication to prevent concurrent identical API calls
const pendingRequests = new Map<string, Promise<any>>();

async function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const promise = fn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

export async function lookup(
  type: "cnpj" | "cep",
  input: string,
  apiConfig: ApiConfig,
  cache?: Cache
): Promise<LookupResult> {
  const startTime = Date.now();
  const baseUrl = type === "cnpj" ? apiConfig.cnpjBaseUrl : apiConfig.cepBaseUrl;
  const cacheKey = `${type}:${baseUrl}:${input}`;
  const transportMode = process.env.MCP_TRANSPORT || "stdio";

  // Check cache first
  if (cache) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      const elapsed = Date.now() - startTime;
      recordMetrics(elapsed, true, false);
      console.log(
        `[${new Date().toISOString()}] [${type}_lookup] [${input}] [cache_hit] [${elapsed}ms] [${transportMode}] [${baseUrl}]`
      );
      return { ok: true, data: cached };
    }
  }

  // Use deduplication to prevent concurrent identical API calls
  return await deduplicate(cacheKey, async () => {
    const apiUrl = `${baseUrl}${input}`;
    const result = await httpJson(apiUrl, apiConfig.authHeaders);
    const elapsed = Date.now() - startTime;

    if (result.ok && result.data) {
      const responseData = {
        ...result.data,
        source: result.source,
        fetchedAt: new Date().toISOString(),
      };

      if (cache) {
        await cache.set(cacheKey, responseData);
      }

      recordMetrics(elapsed, false, false);
      console.log(
        `[${new Date().toISOString()}] [${type}_lookup] [${input}] [success] [${elapsed}ms] [${transportMode}] [${baseUrl}]`
      );
      return { ok: true, data: responseData };
    } else {
      const errorMessage =
        result.error === "not found"
          ? `${type.toUpperCase()} not found`
          : result.error || "unknown error";
      recordMetrics(elapsed, false, true);
      console.log(
        `[${new Date().toISOString()}] [${type}_lookup] [${input}] [error: ${errorMessage}] [${elapsed}ms] [${transportMode}] [${baseUrl}]`
      );
      return { ok: false, error: errorMessage };
    }
  });
}

// Sequential Thinking processor instance
const thinkingProcessor = new SequentialThinkingProcessor();

// Tool definitions for MCP
export const TOOL_DEFINITIONS = [
  {
    name: "cnpj_lookup",
    description: "Look up Brazilian company information by CNPJ number",
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "Brazilian CNPJ number (with or without formatting)",
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
          description: "Brazilian CEP postal code (with or without formatting)",
        },
      },
      required: ["cep"],
    },
  },
  SEARCH_TOOL,
  SEQUENTIAL_THINKING_TOOL,
  {
    name: "cnpj_intelligence",
    description:
      "Intelligent automatic search about a Brazilian company using CNPJ.",
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "Brazilian CNPJ number (with or without formatting)",
        },
        categories: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "government",
              "legal",
              "news",
              "documents",
              "social",
              "partners",
            ],
          },
          description: "Search categories to include (default: all)",
        },
        provider: {
          type: "string",
          enum: ["duckduckgo", "tavily"],
          description:
            "Search provider to use (default: duckduckgo with automatic fallback)",
          default: "duckduckgo",
        },
        max_results_per_query: {
          type: "number",
          description: "Maximum results per search query (default: 5)",
          minimum: 1,
          maximum: 10,
          default: 5,
        },
        max_queries: {
          type: "number",
          description: "Maximum number of search queries to execute (default: 10)",
          minimum: 1,
          maximum: 20,
          default: 10,
        },
        api_key: {
          type: "string",
          description: "Optional Tavily API key (if not provided, uses server configuration)",
        },
      },
      required: ["cnpj"],
    },
  },
];

// Tool execution logic
export async function executeTool(
  name: string,
  args: any,
  apiConfig: ApiConfig,
  cache?: Cache
): Promise<LookupResult> {
  if (name === "cnpj_lookup") {
    const parsed = CnpjSchema.parse(args);
    return await lookup("cnpj", parsed.cnpj, apiConfig, cache);
  } else if (name === "cep_lookup") {
    const parsed = CepSchema.parse(args);
    return await lookup("cep", parsed.cep, apiConfig, cache);
  } else if (name === "cnpj_search") {
    const { query, max_results = 5 } = args;
    return await executeSearch(query, max_results, cache);
  } else if (name === "sequentialthinking") {
    const result = thinkingProcessor.processThought(args);
    return result;
  } else if (name === "cnpj_intelligence") {
    const { executeIntelligence } = await import("./intelligence.js");
    return await executeIntelligence(
      args as IntelligenceOptions,
      apiConfig,
      cache
    );
  } else {
    throw new Error(`Unknown tool: ${name}`);
  }
}

export function getMetrics(): Metrics {
  return { ...metrics };
}

export function resetMetrics(): void {
  metrics = {
    requests: 0,
    cacheHits: 0,
    errors: 0,
    totalTime: 0,
    startTime: Date.now(),
  };
}
