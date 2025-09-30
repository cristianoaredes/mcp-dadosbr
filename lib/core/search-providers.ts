/**
 * Search Provider Interface and Implementations
 * Supports multiple search engines: DuckDuckGo, Tavily, SerpAPI
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  name: string;
  search(query: string, maxResults: number): Promise<SearchResult[]>;
  isAvailable(): Promise<boolean>;
}

// DuckDuckGo Provider (Free, may be rate-limited)
import { search as duckSearch } from 'duck-duck-scrape';

export class DuckDuckGoProvider implements SearchProvider {
  name = 'duckduckgo';
  
  private lastRequestTime = 0;
  private minRequestInterval = 3000; // 3 seconds

  async isAvailable(): Promise<boolean> {
    return true; // Always available, no API key needed
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    await this.rateLimit();

    try {
      const searchResults = await duckSearch(query, {
        safeSearch: 0,
        locale: 'br-br'
      });

      const limitedResults = searchResults.results.slice(0, maxResults);

      return limitedResults.map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        snippet: r.description || ''
      }));
    } catch (error: any) {
      // DuckDuckGo may block, return empty results instead of failing
      console.error(`[DuckDuckGo] Search failed: ${error.message}`);
      return [];
    }
  }
}

// Tavily Provider (Paid, reliable)
import { TavilyClient } from 'tavily';

export class TavilyProvider implements SearchProvider {
  name = 'tavily';
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

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    if (!this.apiKey || !this.client) {
      throw new Error('Tavily API key not configured. Set TAVILY_API_KEY environment variable.');
    }

    try {
      const response = await this.client.search({
        query: query,
        max_results: maxResults,
        search_depth: 'basic', // 'basic' or 'advanced'
        include_answer: false,
        include_raw_content: false,
        include_images: false
      });

      if (!response || !response.results) {
        return [];
      }

      return response.results.map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        snippet: r.content || ''
      }));
    } catch (error: any) {
      console.error(`[Tavily] Search failed: ${error.message}`);
      throw error;
    }
  }
}

// SerpAPI Provider (Paid, most expensive)
export class SerpAPIProvider implements SearchProvider {
  name = 'serpapi';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPAPI_KEY;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('SerpAPI key not configured');
    }

    // TODO: Implement SerpAPI integration
    // For now, return empty to avoid breaking
    console.warn('[SerpAPI] Not yet implemented');
    return [];
  }
}

// Provider Factory
export type ProviderType = 'duckduckgo' | 'tavily' | 'serpapi';

export function createProvider(type: ProviderType = 'duckduckgo'): SearchProvider {
  switch (type) {
    case 'tavily':
      return new TavilyProvider();
    case 'serpapi':
      return new SerpAPIProvider();
    case 'duckduckgo':
    default:
      return new DuckDuckGoProvider();
  }
}

// Get first available provider
export async function getAvailableProvider(preferred?: ProviderType): Promise<SearchProvider> {
  const providers: SearchProvider[] = [
    preferred ? createProvider(preferred) : null,
    new DuckDuckGoProvider(),
    new TavilyProvider(),
    new SerpAPIProvider()
  ].filter(Boolean) as SearchProvider[];

  for (const provider of providers) {
    if (await provider.isAvailable()) {
      return provider;
    }
  }

  // Fallback to DuckDuckGo even if it may fail
  return new DuckDuckGoProvider();
}
