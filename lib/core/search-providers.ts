/**
 * Search Provider Interface and Implementations
 * Supports multiple search engines: DuckDuckGo, Tavily, SerpAPI
 */

import { Result, RateLimitError } from "../shared/types/result.js";
import { SEARCH } from "../shared/utils/constants.js";
import { TIMEOUTS } from "../config/timeouts.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  name: string;
  search(
    query: string,
    maxResults: number
  ): Promise<Result<SearchResult[], Error>>;
  isAvailable(): Promise<boolean>;
}

// Tavily Provider (Paid, reliable)
import { TavilyClient } from "tavily";

export class TavilyProvider implements SearchProvider {
  name = "tavily";
  private apiKey?: string;
  private client?: TavilyClient;

  constructor() {
    // Use server-configured API key only (never accept from client)
    this.apiKey = process.env.TAVILY_API_KEY;
    if (this.apiKey) {
      this.client = new TavilyClient({ apiKey: this.apiKey });
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async search(
    query: string,
    maxResults: number = 5
  ): Promise<Result<SearchResult[], Error>> {
    if (!this.apiKey || !this.client) {
      return Result.err(
        new Error(
          "Tavily API key not configured. Set TAVILY_API_KEY environment variable."
        )
      );
    }

    try {
      const response = await this.client.search({
        query: query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      });

      if (!response || !response.results) {
        return Result.ok([]);
      }

      const mapped = response.results.map((r: unknown) => {
        const result = r as { title?: string; url?: string; content?: string };
        return {
          title: result.title || "",
          url: result.url || "",
          snippet: result.content || "",
        };
      });

      return Result.ok(mapped);
    } catch (error: unknown) {
      const err = error as Error & { statusCode?: number };
      // Check for rate limiting
      if (err.statusCode === 429 || err.message?.includes("rate limit")) {
        return Result.err(
          new RateLimitError("Tavily API rate limit exceeded", TIMEOUTS.RATE_LIMIT_WINDOW_MS)
        );
      }

      // Check for auth errors
      if (err.statusCode === 401 || err.statusCode === 403) {
        return Result.err(
          new Error("Tavily API authentication failed. Check your API key.")
        );
      }

      return Result.err(new Error(`Tavily search failed: ${err.message}`));
    }
  }
}

// Note: SerpAPI provider was removed as it was not implemented
// If you need SerpAPI support, please open an issue on GitHub

// Provider Factory
export type ProviderType = "tavily";

export function createProvider(
  type: ProviderType = "tavily"
): SearchProvider {
  if (type !== "tavily") {
    throw new Error(`Provider ${type} is not supported. Configure TAVILY_API_KEY and use provider \"tavily\".`);
  }
  return new TavilyProvider();
}

// Get first available provider with smart fallback
export async function getAvailableProvider(
  preferred?: ProviderType
): Promise<SearchProvider> {
  const provider = preferred ? createProvider(preferred) : new TavilyProvider();

  if (!(await provider.isAvailable())) {
    throw new Error(
      "Tavily provider is unavailable. Set TAVILY_API_KEY to use cnpj_intelligence searches."
    );
  }

  return provider;
}

// Enhanced search with automatic fallback
export async function searchWithFallback(
  query: string,
  maxResults: number = SEARCH.DEFAULT_MAX_RESULTS,
  preferredProvider?: ProviderType
): Promise<Result<SearchResult[], Error>> {
  const provider = preferredProvider ? createProvider(preferredProvider) : new TavilyProvider();

  if (!(await provider.isAvailable())) {
    return Result.err(
      new Error(
        "Tavily provider unavailable. Set TAVILY_API_KEY to enable cnpj_intelligence searches."
      )
    );
  }

  return provider.search(query, maxResults);
}
