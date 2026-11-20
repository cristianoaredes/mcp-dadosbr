/**
 * Core tools — CNPJ lookup, CEP lookup, search, intelligence
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { CnpjSchema, CepSchema } from "../core/validation.js";
import {
    CnpjIntelligenceSchema,
    CnpjSearchSchema,
    DORK_CATEGORIES,
    SEARCH_PROVIDERS,
    SequentialThinkingSchema,
} from "../core/tool-schemas.js";
import { Cache, LookupResult, ApiConfig } from "../types/index.js";
import { SEARCH_TOOL, executeSearch } from "../core/search.js";

// ─── Shared lookup with caching and deduplication ───────────────────────────

interface PendingRequest { promise: Promise<LookupResult>; timestamp: number; timeoutId: NodeJS.Timeout; }
const pendingRequests = new Map<string, PendingRequest>();

async function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = pendingRequests.get(key);
    if (existing && Date.now() - existing.timestamp < 30000) return existing.promise as Promise<T>;
    const promise = fn();
    const timeoutId = setTimeout(() => pendingRequests.delete(key), 30000);
    pendingRequests.set(key, { promise: promise as Promise<LookupResult>, timestamp: Date.now(), timeoutId });
    try { return await promise; } finally { clearTimeout(timeoutId); pendingRequests.delete(key); }
}

async function lookup(type: "cnpj" | "cep", input: string, apiConfig: ApiConfig, cache?: Cache): Promise<LookupResult> {
    const baseUrl = type === "cnpj" ? apiConfig.cnpjBaseUrl : apiConfig.cepBaseUrl;
    const cacheKey = `${type}:${baseUrl}:${input}`;
    if (cache) {
        const cached = await cache.get(cacheKey);
        if (cached) return { ok: true, data: cached };
    }
    return await deduplicate(cacheKey, async () => {
        const result = await httpJson(`${baseUrl}${input}`, apiConfig.authHeaders);
        if (result.ok && result.data) {
            const responseData = { ...result.data, source: result.source, fetchedAt: new Date().toISOString() };
            if (cache) await cache.set(cacheKey, responseData);
            return { ok: true, data: responseData };
        }
        return { ok: false, error: result.error === "not found" ? `${type.toUpperCase()} not found` : result.error || "unknown error" };
    });
}

// ─── CNPJ Lookup ────────────────────────────────────────────────────────────

registerTool({
    name: "cnpj_lookup",
    description: "Look up Brazilian company information by CNPJ number",
    inputSchema: {
        type: "object",
        properties: { cnpj: { type: "string", description: "Brazilian CNPJ number (with or without formatting)" } },
        required: ["cnpj"],
    },
    zodSchema: CnpjSchema,
    execute: async (args, apiConfig, cache) => {
        const parsed = args as { cnpj: string };
        return await lookup("cnpj", parsed.cnpj, apiConfig, cache);
    },
});

// ─── CEP Lookup ─────────────────────────────────────────────────────────────

registerTool({
    name: "cep_lookup",
    description: "Look up Brazilian address information by CEP postal code",
    inputSchema: {
        type: "object",
        properties: { cep: { type: "string", description: "Brazilian CEP postal code (with or without formatting)" } },
        required: ["cep"],
    },
    zodSchema: CepSchema,
    execute: async (args, apiConfig, cache) => {
        const parsed = args as { cep: string };
        return await lookup("cep", parsed.cep, apiConfig, cache);
    },
});

// ─── CNPJ Search ────────────────────────────────────────────────────────────

registerTool({
    ...SEARCH_TOOL,
    zodSchema: CnpjSearchSchema,
    execute: async (args, _apiConfig, cache) => {
        const { query, max_results = 5 } = args as { query: string; max_results?: number };
        return await executeSearch(query, max_results, cache);
    },
});

// ─── CNPJ Intelligence ──────────────────────────────────────────────────────

registerTool({
    name: "cnpj_intelligence",
    description: "Intelligent automatic search about a Brazilian company using CNPJ.",
    inputSchema: {
        type: "object",
        properties: {
            cnpj: { type: "string", description: "Brazilian CNPJ number (with or without formatting)" },
            categories: { type: "array", items: { type: "string", enum: [...DORK_CATEGORIES] }, description: "Categories to search" },
            provider: { type: "string", enum: [...SEARCH_PROVIDERS], description: "Search provider to use (server-configured API key required)", default: "tavily" },
            max_results_per_query: { type: "number", description: "Maximum results per query", minimum: 1, maximum: 10, default: 5 },
            max_queries: { type: "number", description: "Maximum number of search queries", minimum: 1, maximum: 20, default: 10 },
        },
        required: ["cnpj"],
    },
    zodSchema: CnpjIntelligenceSchema,
    execute: async (args, apiConfig, cache) => {
        const parsed = args as {
            cnpj: string;
            categories?: typeof DORK_CATEGORIES[number][];
            provider?: typeof SEARCH_PROVIDERS[number];
            max_results_per_query?: number;
            max_results?: number;
            max_queries?: number;
        };
        const mod = await import("../core/intelligence.js");
        return await mod.executeIntelligence(
            {
                cnpj: parsed.cnpj,
                categories: parsed.categories,
                provider: parsed.provider,
                maxResultsPerQuery: parsed.max_results_per_query ?? parsed.max_results,
                maxQueries: parsed.max_queries,
            },
            apiConfig,
            cache,
        );
    },
});

// ─── Sequential Thinking ────────────────────────────────────────────────────

import { SequentialThinkingProcessor, SEQUENTIAL_THINKING_TOOL } from "../core/sequential-thinking.js";

registerTool({
    ...SEQUENTIAL_THINKING_TOOL,
    zodSchema: SequentialThinkingSchema,
    execute: async (args, _apiConfig, _cache, context) => {
        const processor = context?.thinkingProcessor ?? new SequentialThinkingProcessor();
        return processor.processThought(args);
    },
});

export { lookup };
