import { search as duckSearch } from 'duck-duck-scrape';
import { Cache, LookupResult } from '../types/index.js';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse extends LookupResult {
  results?: SearchResult[];
  query?: string;
  count?: number;
}

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests (DuckDuckGo is strict)

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

export async function executeSearch(
  query: string,
  maxResults: number = 5,
  cache?: Cache
): Promise<SearchResponse> {
  const startTime = Date.now();
  const cacheKey = `search:${query}:${maxResults}`;
  const transportMode = process.env.MCP_TRANSPORT || "stdio";

  // Check cache first
  if (cache) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      const elapsed = Date.now() - startTime;
      console.error(
        `[${new Date().toISOString()}] [search] [${query}] [cache_hit] [${elapsed}ms] [${transportMode}]`
      );
      return { ok: true, data: cached };
    }
  }

  // Rate limiting
  await rateLimit();

  try {
    // Perform search with duck-duck-scrape
    const searchResults = await duckSearch(query, {
      safeSearch: 0, // 0 = off, 1 = moderate, 2 = strict
      locale: 'br-br'
    });

    // Limit results
    const limitedResults = searchResults.results.slice(0, maxResults);

    const formattedResults: SearchResult[] = limitedResults.map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || ''
    }));

    const responseData = {
      results: formattedResults,
      query: query,
      count: formattedResults.length,
      source: 'duckduckgo',
      fetchedAt: new Date().toISOString()
    };

    // Cache results
    if (cache) {
      await cache.set(cacheKey, responseData);
    }

    const elapsed = Date.now() - startTime;
    console.error(
      `[${new Date().toISOString()}] [search] [${query}] [success] [${elapsed}ms] [${transportMode}] [results: ${formattedResults.length}]`
    );

    return {
      ok: true,
      data: responseData
    };
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    const errorMessage = error.message || 'Search failed';
    
    console.error(
      `[${new Date().toISOString()}] [search] [${query}] [error: ${errorMessage}] [${elapsed}ms] [${transportMode}]`
    );

    return {
      ok: false,
      error: errorMessage
    };
  }
}

// Tool definition for MCP
export const SEARCH_TOOL = {
  name: "cnpj_search",
  description: `Search the web for information about Brazilian companies, CNPJ numbers, people, and more using DuckDuckGo.

This tool supports advanced search operators:
- site:example.com - Search within a specific domain
- intext:"exact phrase" - Find exact text in page body
- intitle:keyword - Find keyword in page title
- inurl:keyword - Find keyword in URL
- filetype:pdf - Search for specific file types (pdf, xls, doc, etc.)
- "exact phrase" - Search for exact phrase
- keyword1 OR keyword2 - Search for either keyword
- -exclude - Exclude a term from results

Common use cases:
- Find company information: "CNPJ site:gov.br"
- Search legal cases: "razao social site:jusbrasil.com.br"
- Find documents: "CNPJ filetype:pdf"
- Search social media: "company name site:linkedin.com"
- Government records: "CNPJ site:transparencia.gov.br"

Examples:
- cnpj_search({ query: "28526270000150 site:gov.br", max_results: 10 })
- cnpj_search({ query: "\"CRISTIANO AREDES\" intext:CNPJ" })
- cnpj_search({ query: "site:jusbrasil.com.br \"AC SOLUCOES\"" })`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (can include operators like site:, intext:, filetype:, etc.)"
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (default: 5, max: 20)",
        minimum: 1,
        maximum: 20,
        default: 5
      }
    },
    required: ["query"]
  }
};
