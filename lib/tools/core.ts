/**
 * Core tools — CNPJ lookup, CEP lookup, search, intelligence, thinking
 */

import { registerTool } from "../core/registry.js";
import { deduplicate, getPendingRequestCount, lookup } from "../core/lookup.js";
import { CnpjSchema, CepSchema } from "../core/validation.js";
import {
    CnpjIntelligenceSchema,
    CnpjSearchSchema,
    DORK_CATEGORIES,
    SEARCH_PROVIDERS,
    SequentialThinkingSchema,
} from "../core/tool-schemas.js";
import { SEARCH_TOOL, executeSearch } from "../core/search.js";
import { CNPJ_INTELLIGENCE_TOOL, executeIntelligence } from "../core/intelligence.js";
import { SequentialThinkingProcessor, SEQUENTIAL_THINKING_TOOL } from "../core/sequential-thinking.js";

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
    ...CNPJ_INTELLIGENCE_TOOL,
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
        return await executeIntelligence(
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

registerTool({
    ...SEQUENTIAL_THINKING_TOOL,
    zodSchema: SequentialThinkingSchema,
    execute: async (args, _apiConfig, _cache, context) => {
        const processor = context?.thinkingProcessor ?? new SequentialThinkingProcessor();
        return processor.processThought(args);
    },
});

export { deduplicate, getPendingRequestCount, lookup };
