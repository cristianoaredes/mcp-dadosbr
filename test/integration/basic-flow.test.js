#!/usr/bin/env node

/**
 * Basic integration test for MCP DadosBR
 * Tests the core flow: CNPJ lookup, CEP lookup, Sequential thinking
 */

import { executeTool } from '../../build/lib/core/tools.js';
import { MemoryCache } from '../../build/lib/core/cache.js';

const cache = new MemoryCache();
const apiConfig = {
  cnpjBaseUrl: 'https://api.opencnpj.org/',
  cepBaseUrl: 'https://opencep.com/v1/',
  authHeaders: {}
};

console.log('🧪 Running Integration Tests...\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    console.log(`📋 ${name}`);
    await fn();
    console.log(`✅ ${name}: PASSED\n`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: FAILED - ${error.message}\n`);
    failed++;
  }
}

// Test 1: CNPJ Lookup
await test('CNPJ Lookup', async () => {
  const result = await executeTool('cnpj_lookup', { cnpj: '00000000000191' }, apiConfig, cache);
  if (!result.ok) throw new Error(result.error);
  if (!result.data) throw new Error('No data returned');
});

// Test 2: CEP Lookup  
await test('CEP Lookup', async () => {
  const result = await executeTool('cep_lookup', { cep: '01310100' }, apiConfig, cache);
  if (!result.ok) throw new Error(result.error);
  if (!result.data) throw new Error('No data returned');
});

// Test 3: Sequential Thinking
await test('Sequential Thinking', async () => {
  const result = await executeTool('sequentialthinking', {
    thought: 'Testing sequential thinking integration',
    thoughtNumber: 1,
    totalThoughts: 1,
    nextThoughtNeeded: false
  }, apiConfig, cache);
  if (!result.ok) throw new Error(result.error);
  if (!result.data) throw new Error('No data returned');
});

// Test 4: Cache Functionality
await test('Cache Functionality', async () => {
  // First call
  const result1 = await executeTool('cnpj_lookup', { cnpj: '00000000000191' }, apiConfig, cache);
  if (!result1.ok) throw new Error('First call failed');
  
  // Second call should be faster (cached)
  const start = Date.now();
  const result2 = await executeTool('cnpj_lookup', { cnpj: '00000000000191' }, apiConfig, cache);
  const elapsed = Date.now() - start;
  
  if (!result2.ok) throw new Error('Second call failed');
  if (elapsed > 100) throw new Error(`Cache not working, took ${elapsed}ms`);
});

console.log('🎉 Integration Tests Complete!');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

process.exit(failed > 0 ? 1 : 0);