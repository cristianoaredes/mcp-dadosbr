import { executeTool } from './build/lib/core/tools.js';
import { resolveApiConfig } from './build/lib/config/index.js';

async function testAllTools() {
    const apiConfig = resolveApiConfig();

    console.log('=== Full Tool Suite (17 tools) ===\n');

    // Phase 1
    console.log('--- Phase 1 ---');
    const ibge = await executeTool('ibge_localidades', { tipo: 'estados' }, apiConfig);
    console.log('ibge_localidades:', ibge.ok ? `✅ (${ibge.data.length} states)` : `❌ ${ibge.error}`);

    const whois = await executeTool('domain_whois', { domain: 'nubank.com.br' }, apiConfig);
    console.log('domain_whois:', whois.ok ? '✅' : `❌ ${whois.error}`);

    // Phase 2
    console.log('\n--- Phase 2 ---');
    const cpf = await executeTool('cpf_validate', { cpf: '529.982.247-25' }, apiConfig);
    console.log('cpf_validate:', cpf.ok ? `✅ valid=${cpf.data.valid}` : `❌ ${cpf.error}`);

    const listaSuja = await executeTool('lista_suja_lookup', { query: 'Teste' }, apiConfig);
    console.log('lista_suja_lookup:', listaSuja.ok ? '✅' : `❌ ${listaSuja.error}`);

    // Phase 3
    console.log('\n--- Phase 3 ---');
    const prompt = await executeTool('strategic_osint_prompt', { template: 'fraud_detection', company_name: 'Teste' }, apiConfig);
    console.log('strategic_osint_prompt:', prompt.ok ? '✅' : `❌ ${prompt.error}`);

    // Phase 4 — osint-brazuca
    console.log('\n--- Phase 4 (osint-brazuca) ---');

    const ceis = await executeTool('ceis_cnep_lookup', { query: 'Banco do Brasil' }, apiConfig);
    console.log('ceis_cnep_lookup:', ceis.ok ? `✅ (${ceis.data.databases_checked || 'guidance returned'})` : `❌ ${ceis.error}`);

    const diario = await executeTool('querido_diario', { query: 'Banco do Brasil', size: 3 }, apiConfig);
    console.log('querido_diario:', diario.ok ? '✅' : `❌ ${diario.error}`);

    const pncp = await executeTool('pncp_licitacoes', { query: 'informática' }, apiConfig);
    console.log('pncp_licitacoes:', pncp.ok ? '✅' : `❌ ${pncp.error}`);

    const consumidor = await executeTool('consumidor_reclamacoes', { empresa: 'Nubank' }, apiConfig);
    console.log('consumidor_reclamacoes:', consumidor.ok ? '✅' : `❌ ${consumidor.error}`);

    console.log('\n=== All tests complete ===');
}

testAllTools().catch(console.error);
