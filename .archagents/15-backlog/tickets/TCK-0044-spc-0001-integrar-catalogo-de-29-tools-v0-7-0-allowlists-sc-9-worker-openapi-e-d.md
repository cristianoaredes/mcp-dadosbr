---
id: TCK-0044
slug: spc-0001-integrar-catalogo-de-29-tools-v0-7-0-allowlists-sc-9-worker-openapi-e-d
title: "[SPC-0001] Integrar catalogo de 29 tools v0.7.0, allowlists SC-9, Worker/OpenAPI e docs"
source: spec
created_at: 2026-11-21T16:23:37Z
created_by: ops
updated_at: 2026-11-21T17:00:03Z
status: executing
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0040
linked_runs:
  - RUN-20261121-170002-tck-0044
linked_verifications: []
linked_docs:
  - .archagents/12-inception/specs/SPC-0001-pacote-fontes-transversais-v070.md
external_refs: []
external_sync: []
blocks: []
blocked_by:
  - TCK-0041
  - TCK-0042
  - TCK-0043
related:
  - TCK-0040
acceptance:
  - check: "npm run build && npm run build:worker"
  - check: "node -e \"import('./build/lib/core/tools.js').then(m => { const names = m.TOOL_DEFINITIONS.map(t => t.name); const req = ['tcu_certidoes','cnae_ncm_lookup','sistema_financeiro_lookup','feriados_ddd_lookup','bcb_olinda','ibge_indicadores']; if (names.length !== 29 || !req.every(r => names.includes(r))) process.exit(1); console.log('TOOLS_OK:' + names.length); })\""
    expect: TOOLS_OK:29
  - check: "node -e \"import('node:fs').then(fs => { const allow = JSON.parse(fs.readFileSync('.archagents/mcp-tool-allowlist.json','utf8')); const pkg = JSON.parse(fs.readFileSync('package.json','utf8')); const names = allow.entries.map(t => t.name); if (pkg.version !== '0.7.0' || names.length !== 29) process.exit(1); console.log('ALLOWLIST_AND_VERSION_OK'); })\""
    expect: ALLOWLIST_AND_VERSION_OK
  - check: "npx vitest run"
  - check: "npm run test:transport"
  - check: "rg -q 'cadastro_de_empregadores\\.csv' lib/ && ! rg -q 'consumidor\\.gov\\.br/pages/indicador/empresa/listar' lib/tools/company.ts"
linked_spec: SPC-0001
security_sensitive: true
---
# TCK-0044 - [SPC-0001] Integrar catalogo de 29 tools v0.7.0, allowlists SC-9, Worker/OpenAPI e docs

## Contexto

Unit 4 de `SPC-0001` (Wave 2 de integração, `blocked_by: [TCK-0041, TCK-0042, TCK-0043]`). Registra as 6 novas tools em `lib/tools/index.ts` e `lib/core/tool-schemas.ts`, atualiza versão para `0.7.0`, sincroniza `.archagents/mcp-tool-allowlist.json` (`SC-9`), `_capabilities.json`, testes de catálogo/transporte e documentação canônica.

## Falsificador

Antes desta integração, `TOOL_DEFINITIONS` lista 23 tools, `package.json` declara `0.6.0` e `.archagents/mcp-tool-allowlist.json` contém 23 entradas.

## Log de transicoes

- 2026-11-21T16:23:37Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T16:57:23Z - **triaged** - Wave 1 TCK-0041..0043 done; ready for Wave 2 integration
- 2026-11-21T17:00:02Z - **designed** - DES-0040 approved
- 2026-11-21T17:00:03Z - **executing** - Wave 2 integration execution (RUN-20261121-170002-tck-0044)
