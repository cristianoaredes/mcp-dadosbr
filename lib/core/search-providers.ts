/**
 * Search Provider Interface and Implementations
 * Supports multiple search engines: DuckDuckGo, Tavily, SerpAPI
 */

import {
  Result,
  RateLimitError,
  NetworkError,
} from "../shared/types/result.js";
import { RATE_LIMIT, SEARCH } from "../shared/utils/constants.js";

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

// DuckDuckGo Provider (Free, may be rate-limited)
import { search as duckSearch } from "duck-duck-scrape";

export class DuckDuckGoProvider implements SearchProvider {
  name = "duckduckgo";

  private lastRequestTime = 0;
  private readonly minRequestInterval = RATE_LIMIT.DUCKDUCKGO_INTERVAL_MS;

  async isAvailable(): Promise<boolean> {
    return true; // Always available, no API key needed
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  async search(
    query: string,
    maxResults: number = 5
  ): Promise<Result<SearchResult[], Error>> {
    await this.rateLimit();

    try {
      const searchResults = await duckSearch(query, {
        safeSearch: 0,
        locale: "br-br",
      });

      const limitedResults = searchResults.results.slice(0, maxResults);

      const mapped = limitedResults.map((r: unknown) => {
        const result = r as { title?: string; url?: string; description?: string };
        return {
          title: result.title || "",
          url: result.url || "",
          snippet: result.description || "",
        };
      });

      return Result.ok(mapped);
    } catch (error: unknown) {
      const err = error as Error;
      // Check for rate limiting
      if (
        err.message?.includes("429") ||
        err.message?.includes("detected an anomaly") ||
        err.message?.includes("rate limit")
      ) {
        return Result.err(
          new RateLimitError(
            "DuckDuckGo rate limit exceeded. Try again later or use a different provider.",
            RATE_LIMIT.DUCKDUCKGO_INTERVAL_MS
          )
        );
      }

      // Network or other errors
      if (
        err.message?.includes("fetch") ||
        err.message?.includes("network")
      ) {
        const networkErr = err as Error & { statusCode?: number };
        return Result.err(
          new NetworkError(
            `DuckDuckGo network error: ${err.message}`,
            networkErr.statusCode
          )
        );
      }

      return Result.err(
        new Error(`DuckDuckGo search failed: ${err.message}`)
      );
    }
  }
}

// Tavily Provider (Paid, reliable)
import { TavilyClient } from "tavily";

export class TavilyProvider implements SearchProvider {
  name = "tavily";
  private apiKey?: string;
  private client?: TavilyClient;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY;
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
          new RateLimitError("Tavily API rate limit exceeded", 60000)
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
export type ProviderType = "duckduckgo" | "tavily";

export function createProvider(
  type: ProviderType = "duckduckgo"
): SearchProvider {
  switch (type) {
    case "tavily":
      return new TavilyProvider();
    case "duckduckgo":
    default:
      return new DuckDuckGoProvider();
  }
}

// Get first available provider with smart fallback
export async function getAvailableProvider(
  preferred?: ProviderType
): Promise<SearchProvider> {
  const providers: SearchProvider[] = [
    preferred ? createProvider(preferred) : null,
    new TavilyProvider(),
    new DuckDuckGoProvider(),
  ].filter(Boolean) as SearchProvider[];

  for (const provider of providers) {
    if (await provider.isAvailable()) {
      return provider;
    }
  }

  // Fallback to DuckDuckGo even if it may fail
  return new DuckDuckGoProvider();
}

// Enhanced search with automatic fallback
export async function searchWithFallback(
  query: string,
  maxResults: number = SEARCH.DEFAULT_MAX_RESULTS,
  preferredProvider?: ProviderType
): Promise<Result<SearchResult[], Error>> {
  const providers: SearchProvider[] = [
    preferredProvider ? createProvider(preferredProvider) : null,
    new TavilyProvider(),
    new DuckDuckGoProvider(),
  ].filter(Boolean) as SearchProvider[];

  let lastError: Error | null = null;

  for (const provider of providers) {
    if (!(await provider.isAvailable())) {
      continue;
    }

    const result = await provider.search(query, maxResults);

    if (result.ok) {
      return result;
    }

    lastError = result.error;

    // If it's a rate limit error, try next provider immediately
    if (result.error instanceof RateLimitError) {
      console.error(`[${provider.name}] Rate limited, trying next provider...`);
      continue;
    }

    // For other errors, also try next provider
    console.error(
      `[${provider.name}] Search failed: ${result.error.message}, trying next provider...`
    );
  }

  // All providers failed
  return Result.err(lastError || new Error("All search providers failed"));
}
