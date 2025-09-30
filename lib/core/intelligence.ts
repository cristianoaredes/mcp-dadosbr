/**
 * CNPJ Intelligence - Automatic intelligent search based on CNPJ data
 */

import { lookup } from './tools.js';
import { ApiConfig, Cache, LookupResult } from '../types/index.js';
import { createProvider, getAvailableProvider, SearchProvider, SearchResult, ProviderType } from './search-providers.js';
import { buildDorks, DorkCategory, DorkTemplate } from './dork-templates.js';

export interface IntelligenceOptions {
  cnpj: string;
  categories?: DorkCategory[];
  provider?: ProviderType;
  maxResultsPerQuery?: number;
  maxQueries?: number;
}

export interface IntelligenceResult {
  company_data: any;
  search_results: Record<DorkCategory, SearchResultWithMeta[]>;
  provider_used: string;
  queries_executed: number;
  timestamp: string;
}

export interface SearchResultWithMeta extends SearchResult {
  query: string;
  category: DorkCategory;
}

export async function executeIntelligence(
  options: IntelligenceOptions,
  apiConfig: ApiConfig,
  cache?: Cache
): Promise<LookupResult> {
  const startTime = Date.now();
  const transportMode = process.env.MCP_TRANSPORT || "stdio";

  try {
    // Step 1: Get company data via cnpj_lookup
    console.error(`[intelligence] [${options.cnpj}] Starting CNPJ intelligence search...`);
    
    const cnpjResult = await lookup('cnpj', options.cnpj, apiConfig, cache);
    
    if (!cnpjResult.ok) {
      return {
        ok: false,
        error: `Failed to lookup CNPJ: ${cnpjResult.error}`
      };
    }

    const companyData = cnpjResult.data;
    console.error(`[intelligence] [${options.cnpj}] Company: ${companyData.razao_social}`);

    // Step 2: Build dorks based on company data
    const dorks = buildDorks(companyData, options.categories);
    const maxQueries = options.maxQueries || 10;
    const selectedDorks = dorks.slice(0, maxQueries);
    
    console.error(`[intelligence] [${options.cnpj}] Generated ${dorks.length} dorks, using ${selectedDorks.length}`);

    // Step 3: Get search provider
    const provider = options.provider 
      ? createProvider(options.provider)
      : await getAvailableProvider();

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      return {
        ok: false,
        error: `Provider ${provider.name} is not available (missing API key?)`
      };
    }

    console.error(`[intelligence] [${options.cnpj}] Using provider: ${provider.name}`);

    // Step 4: Execute searches
    const searchResults: Record<DorkCategory, SearchResultWithMeta[]> = {
      government: [],
      legal: [],
      news: [],
      documents: [],
      social: [],
      partners: []
    };

    let queriesExecuted = 0;
    const maxResultsPerQuery = options.maxResultsPerQuery || 5;

    for (const dork of selectedDorks) {
      try {
        console.error(`[intelligence] [${dork.category}] Searching: ${dork.query}`);
        
        const results = await provider.search(dork.query, maxResultsPerQuery);
        
        const resultsWithMeta: SearchResultWithMeta[] = results.map(r => ({
          ...r,
          query: dork.query,
          category: dork.category
        }));

        searchResults[dork.category].push(...resultsWithMeta);
        queriesExecuted++;

        console.error(`[intelligence] [${dork.category}] Found ${results.length} results`);
      } catch (error: any) {
        console.error(`[intelligence] [${dork.category}] Search failed: ${error.message}`);
      }
    }

    // Step 5: Build response
    const elapsed = Date.now() - startTime;
    
    const intelligence: IntelligenceResult = {
      company_data: companyData,
      search_results: searchResults,
      provider_used: provider.name,
      queries_executed: queriesExecuted,
      timestamp: new Date().toISOString()
    };

    console.error(
      `[intelligence] [${options.cnpj}] Complete [${elapsed}ms] [${queriesExecuted} queries] [${provider.name}]`
    );

    return {
      ok: true,
      data: intelligence
    };

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(
      `[intelligence] [${options.cnpj}] Error: ${error.message} [${elapsed}ms]`
    );

    return {
      ok: false,
      error: error.message || 'Intelligence search failed'
    };
  }
}

// Tool definition for MCP
export const CNPJ_INTELLIGENCE_TOOL = {
  name: "cnpj_intelligence",
  description: `Intelligent automatic search about a Brazilian company using CNPJ.

This tool combines CNPJ lookup with automatic web search using intelligent dorks.
It automatically:
1. Looks up company data (razão social, sócios, etc.)
2. Generates smart search queries (Google Dorks)
3. Searches multiple categories: government, legal, news, documents, social, partners
4. Returns consolidated results with company data + web findings

Perfect for: Due diligence, company research, background checks, investigations.

Provider options:
- duckduckgo (default, free, may be rate-limited)
- tavily (paid, reliable, requires TAVILY_API_KEY env var)
- serpapi (paid, most expensive, requires SERPAPI_KEY env var)`,
  inputSchema: {
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
        description: "Search categories to include (default: all)"
      },
      provider: {
        type: "string",
        enum: ["duckduckgo", "tavily", "serpapi"],
        description: "Search provider to use (default: duckduckgo)",
        default: "duckduckgo"
      },
      max_results_per_query: {
        type: "number",
        description: "Maximum results per search query (default: 5)",
        minimum: 1,
        maximum: 10,
        default: 5
      },
      max_queries: {
        type: "number",
        description: "Maximum number of search queries to execute (default: 10)",
        minimum: 1,
        maximum: 20,
        default: 10
      }
    },
    required: ["cnpj"]
  }
};
