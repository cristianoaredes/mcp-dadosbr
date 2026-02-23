import { executeTool } from './build/lib/core/tools.js';
import { resolveApiConfig } from './build/lib/config/index.js';

async function testTools() {
  const apiConfig = resolveApiConfig();

  console.log('\nTesting sequentialthinking...');
  const result3 = await executeTool('sequentialthinking', {
    thought: 'The user wants to find the CNPJ of a bank...',
    thoughtNumber: 1,
    totalThoughts: 3,
    nextThoughtNeeded: true
  }, apiConfig);
  console.log('sequentialthinking:', result3.ok ? 'SUCCESS' : 'FAILED');

  console.log('\nTesting cnpj_search...');
  const result4 = await executeTool('cnpj_search', {
    query: 'Banco do Brasil',
    maxResults: 1
  }, apiConfig);
  console.log('cnpj_search:', result4.ok ? 'SUCCESS' : 'FAILED', result4.ok ? '' : result4.error);

  console.log('\nTesting cnpj_intelligence...');
  const result5 = await executeTool('cnpj_intelligence', {
    query: 'What is the CNPJ of Nubank?',
    context: 'I am helping a client process payments.'
  }, apiConfig);
  console.log('cnpj_intelligence:', result5.ok ? 'SUCCESS' : 'FAILED', result5.ok ? '' : result5.error);
}

testTools().catch(console.error);
