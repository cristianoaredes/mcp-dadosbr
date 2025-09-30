#!/usr/bin/env node

/**
 * Test script for cnpj_intelligence tool
 * Usage: node test-intelligence.js
 */

import { executeTool } from './build/lib/core/tools.js';
import { MemoryCache } from './build/lib/core/cache.js';

const cache = new MemoryCache();
const apiConfig = {
  cnpjBaseUrl: 'https://open.cnpja.com/office/',
  cepBaseUrl: 'https://opencep.com/v1/',
  authHeaders: {}
};

console.log('🧪 Testing CNPJ Intelligence Tool\n');
console.log('⏳ This may take a few seconds due to rate limiting...\n');

try {
  const result = await executeTool(
    'cnpj_intelligence',
    {
      cnpj: '00000000000191',
      categories: ['government', 'legal'],  // Limit categories for faster test
      provider: 'duckduckgo',
      max_results_per_query: 3,
      max_queries: 4  // Limit queries for faster test
    },
    apiConfig,
    cache
  );

  if (result.ok) {
    console.log('\n✅ CNPJ Intelligence: PASSOU\n');
    console.log('📊 Results:');
    console.log('───────────────────────────────────────────────────────\n');
    
    const data = result.data;
    
    // Company Data
    console.log('🏢 Company Data:');
    console.log(`   Razão Social: ${data.company_data.razao_social}`);
    console.log(`   CNPJ: ${data.company_data.cnpj}`);
    console.log(`   Status: ${data.company_data.situacao_cadastral}`);
    console.log(`   Sócios: ${data.company_data.qsa ? data.company_data.qsa.length : 0}`);
    
    // Search Results
    console.log('\n🔍 Search Results:');
    console.log(`   Provider: ${data.provider_used}`);
    console.log(`   Queries Executed: ${data.queries_executed}`);
    
    // Results by category
    for (const [category, results] of Object.entries(data.search_results)) {
      if (results.length > 0) {
        console.log(`\n   📁 ${category.toUpperCase()}: ${results.length} results`);
        results.slice(0, 2).forEach((r, i) => {
          console.log(`      ${i + 1}. ${r.title}`);
          console.log(`         ${r.url}`);
        });
      }
    }
    
    console.log('\n───────────────────────────────────────────────────────');
    console.log(`\n⏱️  Timestamp: ${data.timestamp}`);
    
  } else {
    console.log(`\n❌ CNPJ Intelligence: FALHOU`);
    console.log(`   Error: ${result.error}`);
  }
  
} catch (error) {
  console.log(`\n💥 ERROR: ${error.message}`);
  console.error(error);
}

console.log('\n🎉 Test completed!\n');
