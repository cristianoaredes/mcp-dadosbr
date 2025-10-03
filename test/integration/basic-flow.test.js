/**
 * Basic integration test for MCP DadosBR
 * Tests the core flow: CNPJ lookup, CEP lookup, Sequential thinking
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { executeTool } from '../../build/lib/core/tools.js';
import { MemoryCache } from '../../build/lib/core/cache.js';

describe('MCP DadosBR Integration Tests', () => {
  let cache;
  let apiConfig;

  beforeAll(() => {
    cache = new MemoryCache();
    apiConfig = {
      cnpjBaseUrl: 'https://api.opencnpj.org/',
      cepBaseUrl: 'https://opencep.com/v1/',
      authHeaders: {}
    };
  });

  it('should lookup CNPJ successfully', async () => {
    const result = await executeTool('cnpj_lookup', { cnpj: '00000000000191' }, apiConfig, cache);
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should lookup CEP successfully', async () => {
    const result = await executeTool('cep_lookup', { cep: '01310100' }, apiConfig, cache);
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should execute sequential thinking', async () => {
    const result = await executeTool('sequentialthinking', {
      thought: 'Testing sequential thinking integration',
      thoughtNumber: 1,
      totalThoughts: 1,
      nextThoughtNeeded: false
    }, apiConfig, cache);
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should use cache for repeated lookups', async () => {
    // First call
    const result1 = await executeTool('cnpj_lookup', { cnpj: '00000000000191' }, apiConfig, cache);
    expect(result1.ok).toBe(true);
    
    // Second call should be faster (cached)
    const start = Date.now();
    const result2 = await executeTool('cnpj_lookup', { cnpj: '00000000000191' }, apiConfig, cache);
    const elapsed = Date.now() - start;
    
    expect(result2.ok).toBe(true);
    expect(elapsed).toBeLessThan(100); // Should be much faster from cache
  });
});