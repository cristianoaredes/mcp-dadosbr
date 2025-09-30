#!/usr/bin/env node

/**
 * Script de teste manual para as novas funcionalidades
 * Uso: node test-manual.js
 */

import { executeTool } from './build/lib/core/tools.js';
import { MemoryCache } from './build/lib/core/cache.js';

const cache = new MemoryCache();
const apiConfig = {
  cnpjBaseUrl: 'https://open.cnpja.com/office/',
  cepBaseUrl: 'https://opencep.com/v1/',
  authHeaders: {}
};

console.log('🧪 Testando MCP DadosBR v0.2.0\n');

// Teste 1: CNPJ Lookup (existente)
console.log('📋 Teste 1: cnpj_lookup');
try {
  const result1 = await executeTool(
    'cnpj_lookup',
    { cnpj: '00000000000191' },
    apiConfig,
    cache
  );
  console.log('✅ cnpj_lookup:', result1.ok ? 'PASSOU' : 'FALHOU');
  if (result1.ok) {
    console.log(`   Empresa: ${result1.data.razao_social}`);
    console.log(`   Status: ${result1.data.situacao_cadastral}`);
  }
} catch (error) {
  console.log('❌ cnpj_lookup: ERRO', error.message);
}

console.log('\n---\n');

// Teste 2: Web Search (nova)
console.log('📋 Teste 2: cnpj_search');
try {
  const result2 = await executeTool(
    'cnpj_search',
    { 
      query: '00000000000191 site:gov.br',
      max_results: 3
    },
    apiConfig,
    cache
  );
  console.log('✅ cnpj_search:', result2.ok ? 'PASSOU' : 'FALHOU');
  if (result2.ok) {
    console.log(`   Resultados encontrados: ${result2.data.count}`);
    result2.data.results.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.title}`);
      console.log(`      ${r.url}`);
    });
  }
} catch (error) {
  console.log('❌ cnpj_search: ERRO', error.message);
}

console.log('\n---\n');

// Teste 3: Sequential Thinking (nova)
console.log('📋 Teste 3: sequentialthinking');
try {
  const result3 = await executeTool(
    'sequentialthinking',
    {
      thought: 'Iniciando teste do sequential thinking. Este é o primeiro pensamento.',
      thoughtNumber: 1,
      totalThoughts: 3,
      nextThoughtNeeded: true
    },
    apiConfig,
    cache
  );
  console.log('✅ sequentialthinking:', result3.ok ? 'PASSOU' : 'FALHOU');
  if (result3.ok) {
    console.log(`   Thought ${result3.data.thoughtNumber}/${result3.data.totalThoughts}`);
    console.log(`   Next needed: ${result3.data.nextThoughtNeeded}`);
  }
  
  // Pensamento 2
  const result3b = await executeTool(
    'sequentialthinking',
    {
      thought: 'Segundo pensamento. Analisando dados...',
      thoughtNumber: 2,
      totalThoughts: 3,
      nextThoughtNeeded: true
    },
    apiConfig,
    cache
  );
  
  // Pensamento final
  const result3c = await executeTool(
    'sequentialthinking',
    {
      thought: 'Pensamento final. Teste concluído com sucesso!',
      thoughtNumber: 3,
      totalThoughts: 3,
      nextThoughtNeeded: false
    },
    apiConfig,
    cache
  );
  console.log('   ✅ Sequência completa de 3 pensamentos executada');
  
} catch (error) {
  console.log('❌ sequentialthinking: ERRO', error.message);
}

console.log('\n---\n');
console.log('🎉 Testes concluídos!\n');
