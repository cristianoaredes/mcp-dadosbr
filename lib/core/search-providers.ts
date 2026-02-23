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

// Perplexity Provider (Paid, reliable)
export class PerplexityProvider implements SearchProvider {
  name = "perplexity";
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async search(
    query: string,
    maxResults: number = SEARCH.DEFAULT_MAX_RESULTS
  ): Promise<Result<SearchResult[], Error>> {
    if (!this.apiKey) {
      return Result.err(
        new Error(
          "Perplexity API key not configured. Set PERPLEXITY_API_KEY environment variable."
        )
      );
    }

    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content: "You are a precise search assistant. Provide concise, factual answers based on the search queries. Focus strictly on the information requested without unnecessary conversational filler."
            },
            {
              role: "user",
              content: query
            }
          ]
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          return Result.err(
            new RateLimitError("Perplexity API rate limit exceeded", TIMEOUTS.RATE_LIMIT_WINDOW_MS)
          );
        }
        if (response.status === 401 || response.status === 403) {
          return Result.err(
            new Error("Perplexity API authentication failed. Check your API key.")
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as any;
      if (!data || !data.choices || data.choices.length === 0) {
        return Result.ok([]);
      }

      const content = data.choices[0]?.message?.content || "";
      let url = "";

      // If citations are available, use the first one as a reference link
      if (data.citations && data.citations.length > 0) {
        url = data.citations[0];
      }

      return Result.ok([
        {
          title: "Perplexity Output",
          url: url,
          snippet: content
        }
      ]);
    } catch (error: unknown) {
      const err = error as Error;
      return Result.err(new Error(`Perplexity search failed: ${err.message}`));
    }
  }
}

// Note: SerpAPI provider was removed as it was not implemented
// If you need SerpAPI support, please open an issue on GitHub

// Provider Factory
export type ProviderType = "tavily" | "perplexity";

export function createProvider(
  type: ProviderType = "tavily"
): SearchProvider {
  if (type === "perplexity") {
    return new PerplexityProvider();
  } else if (type === "tavily") {
    return new TavilyProvider();
  }

  throw new Error(`Provider ${type} is not supported. Configure TAVILY_API_KEY or PERPLEXITY_API_KEY.`);
}

// Get first available provider with smart fallback
export async function getAvailableProvider(
  preferred?: ProviderType
): Promise<SearchProvider> {
  if (preferred) {
    const provider = createProvider(preferred);
    if (await provider.isAvailable()) {
      return provider;
    }
  }

  // Fallback chain: Tavily -> Perplexity
  const tavily = new TavilyProvider();
  if (await tavily.isAvailable()) return tavily;

  const perplexity = new PerplexityProvider();
  if (await perplexity.isAvailable()) return perplexity;

  throw new Error(
    "No search providers available. Configure TAVILY_API_KEY or PERPLEXITY_API_KEY to use search features."
  );
}

// Enhanced search with automatic fallback
export async function searchWithFallback(
  query: string,
  maxResults: number = SEARCH.DEFAULT_MAX_RESULTS,
  preferredProvider?: ProviderType
): Promise<Result<SearchResult[], Error>> {
  try {
    const provider = await getAvailableProvider(preferredProvider);
    return provider.search(query, maxResults);
  } catch (error) {
    return Result.err(error as Error);
  }
}
