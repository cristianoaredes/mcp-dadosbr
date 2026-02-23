/**
 * Core tools — CNPJ lookup, CEP lookup, search, intelligence
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { CnpjSchema, CepSchema } from "../core/validation.js";
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
    execute: async (args, apiConfig, cache) => {
        const parsed = CnpjSchema.parse(args);
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
    execute: async (args, apiConfig, cache) => {
        const parsed = CepSchema.parse(args);
        return await lookup("cep", parsed.cep, apiConfig, cache);
    },
});

// ─── CNPJ Search ────────────────────────────────────────────────────────────

registerTool({
    ...SEARCH_TOOL,
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
            categories: { type: "array", items: { type: "string" }, description: "Categories to search" },
            max_results: { type: "number", description: "Maximum results per category", default: 10 },
            api_key: { type: "string", description: "Optional Tavily API key" },
        },
        required: ["cnpj"],
    },
    execute: async (args, apiConfig, cache) => {
        const mod = await import("../core/intelligence.js");
        return await mod.executeIntelligence(args as unknown as Parameters<typeof mod.executeIntelligence>[0], apiConfig, cache);
    },
});

// ─── Sequential Thinking ────────────────────────────────────────────────────

import { SequentialThinkingProcessor, SEQUENTIAL_THINKING_TOOL } from "../core/sequential-thinking.js";

const thinkingProcessor = new SequentialThinkingProcessor();

registerTool({
    ...SEQUENTIAL_THINKING_TOOL,
    execute: async (args) => thinkingProcessor.processThought(args),
});

export { lookup };
