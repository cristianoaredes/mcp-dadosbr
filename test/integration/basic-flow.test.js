/**
 * Basic integration test for MCP DadosBR
 * Tests the core flow: CNPJ lookup, CEP lookup, Sequential thinking
 * 
 * Run with: node test/integration/basic-flow.test.js
 */

import assert from 'node:assert';
import { executeTool } from '../../build/lib/core/tools.js';
import { MemoryCache } from '../../build/lib/core/cache.js';

async function runTests() {
  console.error('Starting MCP DadosBR Integration Tests...\n');

  // Setup
  const cache = new MemoryCache();
  const apiConfig = {
    cnpjBaseUrl: 'https://api.opencnpj.org/',
    cepBaseUrl: 'https://opencep.com/v1/',
    authHeaders: {}
  };

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: CNPJ Lookup
  try {
    console.error('Test 1: CNPJ lookup...');
    const result = await executeTool('cnpj_lookup', { cnpj: '00000000000191' }, apiConfig, cache);
    assert.strictEqual(result.ok, true, 'CNPJ lookup should succeed');
    assert.ok(result.data, 'CNPJ lookup should return data');
    console.error('✓ CNPJ lookup test passed\n');
    testsPassed++;
  } catch (error) {
    console.error('✗ CNPJ lookup test failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 2: CEP Lookup
  try {
    console.error('Test 2: CEP lookup...');
    const result = await executeTool('cep_lookup', { cep: '01310100' }, apiConfig, cache);
    assert.strictEqual(result.ok, true, 'CEP lookup should succeed');
    assert.ok(result.data, 'CEP lookup should return data');
    console.error('✓ CEP lookup test passed\n');
    testsPassed++;
  } catch (error) {
    console.error('✗ CEP lookup test failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 3: Sequential Thinking
  try {
    console.error('Test 3: Sequential thinking...');
    const result = await executeTool('sequentialthinking', {
      thought: 'Testing sequential thinking integration',
      thoughtNumber: 1,
      totalThoughts: 1,
      nextThoughtNeeded: false
    }, apiConfig, cache);
    assert.strictEqual(result.ok, true, 'Sequential thinking should succeed');
    assert.ok(result.data, 'Sequential thinking should return data');
    console.error('✓ Sequential thinking test passed\n');
    testsPassed++;
  } catch (error) {
    console.error('✗ Sequential thinking test failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 4: Cache functionality
  try {
    console.error('Test 4: Cache for repeated lookups...');
    
    // First call
    const result1 = await executeTool('cnpj_lookup', { cnpj: '00000000000191' }, apiConfig, cache);
    assert.strictEqual(result1.ok, true, 'First CNPJ lookup should succeed');
    
    // Second call should be faster (cached)
    const start = Date.now();
    const result2 = await executeTool('cnpj_lookup', { cnpj: '00000000000191' }, apiConfig, cache);
    const elapsed = Date.now() - start;
    
    assert.strictEqual(result2.ok, true, 'Second CNPJ lookup should succeed');
    assert.ok(elapsed < 100, `Cache lookup should be fast (was ${elapsed}ms)`);
    console.error('✓ Cache test passed\n');
    testsPassed++;
  } catch (error) {
    console.error('✗ Cache test failed:', error.message, '\n');
    testsFailed++;
  }

  // Summary
  console.error('=====================================');
  console.error(`Tests completed: ${testsPassed + testsFailed}`);
  console.error(`Passed: ${testsPassed}`);
  console.error(`Failed: ${testsFailed}`);
  console.error('=====================================');

  if (testsFailed > 0) {
    console.error('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.error('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests and handle errors
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});