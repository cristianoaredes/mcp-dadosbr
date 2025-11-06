import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeSearch } from '../../lib/core/search.js';
import { TavilyProvider, getAvailableProvider, searchWithFallback, createProvider } from '../../lib/core/search-providers.js';
import { MemoryCache } from '../../lib/core/cache.js';
import { Result, RateLimitError } from '../../lib/shared/types/result.js';

// Mock the Tavily client
vi.mock('tavily', () => {
  return {
    TavilyClient: vi.fn().mockImplementation(() => ({
      search: vi.fn(),
    })),
  };
});

describe('Search Functionality', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Set up environment for tests
    process.env.TAVILY_API_KEY = 'test-api-key';
    process.env.MCP_TRANSPORT = 'stdio';
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('executeSearch', () => {
    describe('Cache behavior', () => {
      it('should return cached results when available', async () => {
        const cache = new MemoryCache(10, 60000);
        const cachedData = {
          results: [{ title: 'Cached', url: 'http://cached.com', snippet: 'cached result' }],
          query: 'test query',
          count: 1,
          provider: 'tavily',
          source: 'tavily',
          fetchedAt: new Date().toISOString()
        };

        await cache.set('search:test query:5', cachedData);

        const result = await executeSearch('test query', 5, cache);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data).toEqual(cachedData);
        }

        cache.clear();
      });

      it('should not use cache when cache is not provided', async () => {
        // Mock Tavily to return results
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [
            { title: 'Test', url: 'http://test.com', content: 'test snippet' }
          ]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await executeSearch('test query');

        expect(result.ok).toBe(true);
        expect(mockSearch).toHaveBeenCalled();
      });

      it('should cache successful search results', async () => {
        const cache = new MemoryCache(10, 60000);

        // Mock Tavily to return results
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [
            { title: 'Test', url: 'http://test.com', content: 'test snippet' }
          ]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await executeSearch('new query', 5, cache);

        expect(result.ok).toBe(true);

        // Second call should hit cache
        const result2 = await executeSearch('new query', 5, cache);

        expect(result2.ok).toBe(true);
        // Tavily should only be called once
        expect(mockSearch).toHaveBeenCalledTimes(1);

        cache.clear();
      });

      it('should use different cache keys for different queries', async () => {
        const cache = new MemoryCache(10, 60000);

        const { TavilyClient } = await import('tavily');
        let callCount = 0;
        const mockSearch = vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            results: [
              { title: `Result ${callCount}`, url: 'http://test.com', content: 'snippet' }
            ]
          });
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        await executeSearch('query 1', 5, cache);
        await executeSearch('query 2', 5, cache);

        // Both queries should hit the API
        expect(mockSearch).toHaveBeenCalledTimes(2);

        cache.clear();
      });

      it('should use different cache keys for different maxResults', async () => {
        const cache = new MemoryCache(10, 60000);

        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [
            { title: 'Test', url: 'http://test.com', content: 'snippet' }
          ]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        await executeSearch('same query', 5, cache);
        await executeSearch('same query', 10, cache);

        // Different maxResults should create different cache keys
        expect(mockSearch).toHaveBeenCalledTimes(2);

        cache.clear();
      });
    });

    describe('Successful searches', () => {
      it('should return successful search results', async () => {
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [
            { title: 'Test Result', url: 'http://example.com', content: 'Test snippet' }
          ]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await executeSearch('test query', 5);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.results).toHaveLength(1);
          expect(result.data.results[0].title).toBe('Test Result');
          expect(result.data.results[0].url).toBe('http://example.com');
          expect(result.data.results[0].snippet).toBe('Test snippet');
          expect(result.data.query).toBe('test query');
          expect(result.data.count).toBe(1);
          expect(result.data.provider).toBe('tavily');
        }
      });

      it('should handle multiple search results', async () => {
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [
            { title: 'Result 1', url: 'http://example1.com', content: 'Snippet 1' },
            { title: 'Result 2', url: 'http://example2.com', content: 'Snippet 2' },
            { title: 'Result 3', url: 'http://example3.com', content: 'Snippet 3' }
          ]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await executeSearch('multi results', 10);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.results).toHaveLength(3);
          expect(result.data.count).toBe(3);
        }
      });

      it('should respect maxResults parameter', async () => {
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [
            { title: 'R1', url: 'http://1.com', content: 'S1' },
            { title: 'R2', url: 'http://2.com', content: 'S2' }
          ]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        await executeSearch('test', 7);

        expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
          query: 'test',
          max_results: 7
        }));
      });

      it('should use default maxResults when not specified', async () => {
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({ results: [] });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        await executeSearch('test');

        expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
          query: 'test',
          max_results: 5
        }));
      });
    });

    describe('Error handling', () => {
      it('should handle provider errors gracefully', async () => {
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockRejectedValue(new Error('API Error'));
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await executeSearch('error query');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toContain('API Error');
        }
      });

      it('should handle provider returning error Result', async () => {
        // This tests the case when provider.search returns Result.err
        delete process.env.TAVILY_API_KEY;

        const result = await executeSearch('no api key');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toContain('unavailable');
        }
      });

      it('should handle empty error message', async () => {
        const { TavilyClient } = await import('tavily');
        const errorWithoutMessage = new Error();
        errorWithoutMessage.message = '';
        const mockSearch = vi.fn().mockRejectedValue(errorWithoutMessage);
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await executeSearch('empty error');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          // The error message will be "Tavily search failed: " (from provider)
          expect(result.error).toContain('Tavily search failed');
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle empty query', async () => {
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({ results: [] });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await executeSearch('', 5);

        expect(result.ok).toBe(true);
        expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
          query: '',
          max_results: 5
        }));
      });

      it('should handle very long queries', async () => {
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({ results: [] });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const longQuery = 'a'.repeat(1000);
        const result = await executeSearch(longQuery, 5);

        expect(result.ok).toBe(true);
        expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
          query: longQuery,
          max_results: 5
        }));
      });

      it('should handle maxResults of 1', async () => {
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [{ title: 'One', url: 'http://one.com', content: 'snippet' }]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await executeSearch('single', 1);

        expect(result.ok).toBe(true);
        expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
          query: 'single',
          max_results: 1
        }));
      });

      it('should handle maxResults of 20 (max)', async () => {
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({ results: [] });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await executeSearch('max results', 20);

        expect(result.ok).toBe(true);
        expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
          query: 'max results',
          max_results: 20
        }));
      });
    });
  });

  describe('TavilyProvider', () => {
    describe('isAvailable', () => {
      it('should return true when API key is set', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const provider = new TavilyProvider();

        const available = await provider.isAvailable();

        expect(available).toBe(true);
      });

      it('should return false when API key is not set', async () => {
        delete process.env.TAVILY_API_KEY;
        const provider = new TavilyProvider();

        const available = await provider.isAvailable();

        expect(available).toBe(false);
      });

      it('should return false when API key is empty string', async () => {
        process.env.TAVILY_API_KEY = '';
        const provider = new TavilyProvider();

        const available = await provider.isAvailable();

        expect(available).toBe(false);
      });
    });

    describe('search', () => {
      it('should return error when API key is not configured', async () => {
        delete process.env.TAVILY_API_KEY;
        const provider = new TavilyProvider();

        const result = await provider.search('test', 5);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('not configured');
          expect(result.error.message).toContain('TAVILY_API_KEY');
        }
      });

      it('should return empty array for empty results', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({ results: [] });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const provider = new TavilyProvider();
        const result = await provider.search('no results', 5);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toEqual([]);
        }
      });

      it('should return empty array when response is null', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue(null);
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const provider = new TavilyProvider();
        const result = await provider.search('null response', 5);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toEqual([]);
        }
      });

      it('should handle rate limit errors', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const { TavilyClient } = await import('tavily');
        const rateLimitError: any = new Error('Rate limit exceeded');
        rateLimitError.statusCode = 429;
        const mockSearch = vi.fn().mockRejectedValue(rateLimitError);
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const provider = new TavilyProvider();
        const result = await provider.search('rate limited', 5);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(RateLimitError);
          expect(result.error.message).toContain('rate limit');
        }
      });

      it('should handle authentication errors (401)', async () => {
        process.env.TAVILY_API_KEY = 'invalid-key';
        const { TavilyClient } = await import('tavily');
        const authError: any = new Error('Unauthorized');
        authError.statusCode = 401;
        const mockSearch = vi.fn().mockRejectedValue(authError);
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const provider = new TavilyProvider();
        const result = await provider.search('auth error', 5);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('authentication failed');
          expect(result.error.message).toContain('API key');
        }
      });

      it('should handle authentication errors (403)', async () => {
        process.env.TAVILY_API_KEY = 'forbidden-key';
        const { TavilyClient } = await import('tavily');
        const authError: any = new Error('Forbidden');
        authError.statusCode = 403;
        const mockSearch = vi.fn().mockRejectedValue(authError);
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const provider = new TavilyProvider();
        const result = await provider.search('forbidden', 5);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('authentication failed');
        }
      });

      it('should handle general errors', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockRejectedValue(new Error('Network error'));
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const provider = new TavilyProvider();
        const result = await provider.search('network error', 5);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('Tavily search failed');
          expect(result.error.message).toContain('Network error');
        }
      });

      it('should map Tavily results correctly', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [
            { title: 'Test Title', url: 'http://test.com', content: 'Test Content' }
          ]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const provider = new TavilyProvider();
        const result = await provider.search('mapping test', 5);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toHaveLength(1);
          expect(result.value[0]).toEqual({
            title: 'Test Title',
            url: 'http://test.com',
            snippet: 'Test Content'
          });
        }
      });

      it('should handle missing fields in Tavily results', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [
            { title: undefined, url: undefined, content: undefined }
          ]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const provider = new TavilyProvider();
        const result = await provider.search('missing fields', 5);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toHaveLength(1);
          expect(result.value[0]).toEqual({
            title: '',
            url: '',
            snippet: ''
          });
        }
      });
    });
  });

  describe('Provider factory functions', () => {
    describe('createProvider', () => {
      it('should create Tavily provider', () => {
        const provider = createProvider('tavily');

        expect(provider.name).toBe('tavily');
        expect(provider).toBeInstanceOf(TavilyProvider);
      });

      it('should throw for unsupported provider type', () => {
        expect(() => createProvider('unsupported' as any)).toThrow('not supported');
      });
    });

    describe('getAvailableProvider', () => {
      it('should return Tavily provider when API key is set', async () => {
        process.env.TAVILY_API_KEY = 'test-key';

        const provider = await getAvailableProvider();

        expect(provider.name).toBe('tavily');
      });

      it('should throw when no provider is available', async () => {
        delete process.env.TAVILY_API_KEY;

        await expect(getAvailableProvider()).rejects.toThrow('unavailable');
      });

      it('should use preferred provider when specified', async () => {
        process.env.TAVILY_API_KEY = 'test-key';

        const provider = await getAvailableProvider('tavily');

        expect(provider.name).toBe('tavily');
      });
    });

    describe('searchWithFallback', () => {
      it('should return error when no provider is available', async () => {
        delete process.env.TAVILY_API_KEY;

        const result = await searchWithFallback('test query');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('unavailable');
        }
      });

      it('should use available provider for search', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({
          results: [{ title: 'Fallback', url: 'http://fb.com', content: 'test' }]
        });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await searchWithFallback('fallback query', 5);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toHaveLength(1);
        }
      });

      it('should use default max results when not specified', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({ results: [] });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        await searchWithFallback('test');

        expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
          query: 'test',
          max_results: 5
        }));
      });

      it('should use preferred provider when specified', async () => {
        process.env.TAVILY_API_KEY = 'test-key';
        const { TavilyClient } = await import('tavily');
        const mockSearch = vi.fn().mockResolvedValue({ results: [] });
        (TavilyClient as any).mockImplementation(() => ({
          search: mockSearch
        }));

        const result = await searchWithFallback('test', 5, 'tavily');

        expect(result.ok).toBe(true);
      });
    });
  });
});
