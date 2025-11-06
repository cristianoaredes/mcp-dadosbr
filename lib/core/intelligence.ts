/**
 * CNPJ Intelligence - Automatic intelligent search based on CNPJ data
 */

import { lookup } from './tools.js';
import { ApiConfig, Cache, LookupResult } from '../types/index.js';
import { getAvailableProvider, SearchProvider, SearchResult, ProviderType } from './search-providers.js';
import { buildDorks, DorkCategory, DorkTemplate } from './dork-templates.js';
import { TimeoutError } from '../shared/types/result.js';
import { SEARCH } from '../shared/utils/constants.js';
import { TIMEOUTS } from '../config/timeouts.js';

/**
 * Execute tasks with concurrency limit
 * Runs multiple promises concurrently up to the specified limit
 * @param tasks - Array of task functions that return promises
 * @param limit - Maximum number of concurrent tasks (default: 3)
 * @returns Array of settled results
 */
async function executeWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 3
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  const executing: Set<Promise<void>> = new Set();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    // Create a promise that stores result and removes itself when done
    const promise = task()
      .then(
        value => {
          results[i] = { status: 'fulfilled', value };
        },
        reason => {
          results[i] = { status: 'rejected', reason };
        }
      )
      .then(() => {
        executing.delete(promise);
      });

    executing.add(promise);

    // If we hit the concurrency limit, wait for one to complete
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  // Wait for all remaining promises
  await Promise.all(executing);

  return results;
}

export interface IntelligenceOptions {
  cnpj: string;
  categories?: DorkCategory[];
  provider?: ProviderType;
  maxResultsPerQuery?: number;
  maxQueries?: number;
  apiKey?: string;
}

export interface IntelligenceResult {
  company_data: unknown;
  search_results: Record<DorkCategory, SearchResultWithMeta[]>;
  provider_used: string;
  queries_executed: number;
  timestamp: string;
}

export interface SearchResultWithMeta extends SearchResult {
  query: string;
  category: DorkCategory;
}

/**
 * Normalize CNPJ to digits only for comparison
 */
function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Check if a text contains the CNPJ (with or without formatting)
 * Uses word boundaries to avoid false positives
 */
function containsCnpj(text: string, cnpj: string): boolean {
  const normalizedCnpj = normalizeCnpj(cnpj);

  // Build formatted CNPJ pattern: 12.345.678/0001-90
  const formatted = normalizedCnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );

  // Escape special regex characters in formatted version
  const escapedFormatted = formatted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create patterns with word boundaries
  // \b doesn't work well with non-word chars, so use lookahead/lookbehind
  const patterns = [
    // Unformatted: 12345678000190 (with word boundaries)
    new RegExp(`(?<!\\d)${normalizedCnpj}(?!\\d)`, 'i'),
    // Formatted: 12.345.678/0001-90
    new RegExp(escapedFormatted, 'i')
  ];

  // Check if any pattern matches
  return patterns.some(pattern => pattern.test(text));
}

/**
 * Filter search results to only include those that mention the CNPJ
 */
function filterResultsByCnpj(results: SearchResult[], cnpj: string): SearchResult[] {
  return results.filter(result => {
    // Check title, URL, and snippet for CNPJ
    const searchText = `${result.title} ${result.url} ${result.snippet}`.toLowerCase();
    return containsCnpj(searchText, cnpj);
  });
}

export async function executeIntelligence(
  options: IntelligenceOptions,
  apiConfig: ApiConfig,
  cache?: Cache
): Promise<LookupResult> {
  const TOTAL_TIMEOUT_MS = TIMEOUTS.INTELLIGENCE_TOTAL_MS;

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(
        'Intelligence search timed out',
        TOTAL_TIMEOUT_MS
      ));
    }, TOTAL_TIMEOUT_MS);
  });

  // Create main execution promise
  const executionPromise = executeIntelligenceInternal(options, apiConfig, cache);

  // Race between timeout and execution
  return Promise.race([executionPromise, timeoutPromise]);
}

async function executeIntelligenceInternal(
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
    const company = companyData as { razao_social?: string };
    console.error(`[intelligence] [${options.cnpj}] Company: ${company.razao_social || 'Unknown'}`);

    // Step 2: Build dorks based on company data
    const dorks = buildDorks(companyData, options.categories);
    const maxQueries = options.maxQueries || SEARCH.DEFAULT_MAX_QUERIES;
    const selectedDorks = dorks.slice(0, maxQueries);

    console.error(`[intelligence] [${options.cnpj}] Generated ${dorks.length} dorks, using ${selectedDorks.length}`);

    // Step 3: Resolve provider (requires Tavily API key from server config)
    const provider: SearchProvider = await getAvailableProvider(options.provider);

    console.error(
      `[intelligence] [${options.cnpj}] Using provider: ${provider.name}`
    );

    // Step 4: Execute searches with concurrency limit
    const searchResults: Record<DorkCategory, SearchResultWithMeta[]> = {
      government: [],
      legal: [],
      news: [],
      documents: [],
      social: [],
      partners: []
    };

    const providerUsed = provider.name;
    const maxResultsPerQuery = options.maxResultsPerQuery || SEARCH.DEFAULT_MAX_RESULTS;

    // Get concurrency limit from environment or use default
    const concurrencyLimit = parseInt(process.env.MCP_INTELLIGENCE_CONCURRENCY || '3', 10);

    console.error(
      `[intelligence] [${options.cnpj}] Executing ${selectedDorks.length} queries ` +
      `with concurrency limit: ${concurrencyLimit}`
    );

    // Create tasks for concurrent execution
    const searchTasks = selectedDorks.map(dork => {
      return async () => {
        try {
          console.error(`[intelligence] [${dork.category}] Searching: ${dork.query}`);
          const searchResult = await provider.search(
            dork.query,
            maxResultsPerQuery
          );

          if (searchResult.ok) {
            // Filter results to ensure they contain the CNPJ
            const filteredResults = filterResultsByCnpj(searchResult.value, options.cnpj);

            const resultsWithMeta: SearchResultWithMeta[] = filteredResults.map(r => ({
              ...r,
              query: dork.query,
              category: dork.category
            }));

            console.error(
              `[intelligence] [${dork.category}] Found ${searchResult.value.length} results, ` +
              `${filteredResults.length} after CNPJ filter`
            );

            return {
              category: dork.category,
              results: resultsWithMeta,
              success: true
            };
          } else {
            // Log error but continue with other searches
            console.error(`[intelligence] [${dork.category}] Search failed: ${searchResult.error.message}`);
            return {
              category: dork.category,
              results: [],
              success: false
            };
          }
        } catch (error: unknown) {
          const err = error as Error;
          console.error(`[intelligence] [${dork.category}] Unexpected error: ${err.message}`);
          return {
            category: dork.category,
            results: [],
            success: false
          };
        }
      };
    });

    // Execute all searches with concurrency limit
    const searchTaskResults = await executeWithConcurrencyLimit(searchTasks, concurrencyLimit);

    // Aggregate results
    let queriesExecuted = 0;
    for (const result of searchTaskResults) {
      if (result.status === 'fulfilled') {
        const { category, results, success } = result.value;
        searchResults[category].push(...results);
        if (success) {
          queriesExecuted += 1;
        }
      }
    }

    // Step 5: Build response
    const elapsed = Date.now() - startTime;

    const intelligence: IntelligenceResult = {
      company_data: companyData,
      search_results: searchResults,
      provider_used: providerUsed,
      queries_executed: queriesExecuted,
      timestamp: new Date().toISOString()
    };

    console.error(
      `[intelligence] [${options.cnpj}] Complete [${elapsed}ms] [${queriesExecuted} queries] [${providerUsed}]`
    );

    return {
      ok: true,
      data: intelligence
    };

  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;

    // Handle timeout errors specifically
    if (error instanceof TimeoutError) {
      console.error(
        `[intelligence] [${options.cnpj}] Timeout after ${elapsed}ms (limit: ${error.timeoutMs}ms)`
      );
      return {
        ok: false,
        error: `Intelligence search timed out after ${elapsed}ms. Try reducing max_queries or using a faster provider.`
      };
    }

    const err = error as Error;
    console.error(
      `[intelligence] [${options.cnpj}] Error: ${err.message} [${elapsed}ms]`
    );

    return {
      ok: false,
      error: err.message || 'Intelligence search failed'
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
- tavily (requires TAVILY_API_KEY env var)

Note: You must set TAVILY_API_KEY to enable web search queries.`,
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
        enum: ["tavily"],
        description: "Search provider to use (requires TAVILY_API_KEY)",
        default: "tavily"
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
      },
      api_key: {
        type: "string",
        description: "Optional Tavily API key (if not provided, uses server configuration)"
      }
    },
    required: ["cnpj"]
  }
};
