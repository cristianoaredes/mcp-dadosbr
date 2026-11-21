---
id: TCK-0040
slug: spc-0001-pacote-v0-7-0-29-tools-worker-safe-e-reparo-lista-suja-consumidor
title: "[SPC-0001] Pacote v0.7.0 — 29 tools Worker-safe e reparo Lista Suja/Consumidor"
source: spec
created_at: 2026-11-21T16:23:35Z
created_by: ops
updated_at: 2026-11-21T17:19:45Z
status: done
severity: medium
category: epic
effort: L
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0036
linked_runs:
  - RUN-20261121-171904-tck-0040
linked_verifications: []
linked_docs:
  - .archagents/12-inception/specs/SPC-0001-pacote-fontes-transversais-v070.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npm run build && npm run build:worker"
  - check: "node -e \"import('./build/lib/core/tools.js').then(m => { const names = m.TOOL_DEFINITIONS.map(t => t.name); const req = ['tcu_certidoes','cnae_ncm_lookup','sistema_financeiro_lookup','feriados_ddd_lookup','bcb_olinda','ibge_indicadores']; if (names.length !== 29 || !req.every(r => names.includes(r))) process.exit(1); console.log('TOOLS_OK:' + names.length); })\""
    expect: TOOLS_OK:29
  - check: "node -e \"import('node:fs').then(fs => { const allow = JSON.parse(fs.readFileSync('.archagents/mcp-tool-allowlist.json','utf8')); const pkg = JSON.parse(fs.readFileSync('package.json','utf8')); const names = allow.entries.map(t => t.name); if (pkg.version !== '0.7.0' || names.length !== 29) process.exit(1); console.log('ALLOWLIST_AND_VERSION_OK'); })\""
    expect: ALLOWLIST_AND_VERSION_OK
  - check: "npx vitest run"
  - check: "npm run test:transport"
  - check: "rg -q 'cadastro_de_empregadores\\.csv' lib/ && ! rg -q 'consumidor\\.gov\\.br/pages/indicador/empresa/listar' lib/tools/company.ts"
children:
  - TCK-0041
  - TCK-0042
  - TCK-0043
  - TCK-0044
linked_spec: SPC-0001
security_sensitive: true
---
# TCK-0040 - [SPC-0001] Pacote v0.7.0 — 29 tools Worker-safe e reparo Lista Suja/Consumidor

## Contexto

Épico compilado a partir de `SPC-0001` (`BRF-0001` / `DSC-0001`, aprovado em `2026-11-21T12:57:51-03:00`). Agrupa Wave 1 paralela (`TCK-0041`, `TCK-0042`, `TCK-0043`) e Wave 2 de integração (`TCK-0044`) para lançar `mcp-dadosbr v0.7.0` com 29 ferramentas compatíveis com Node + Cloudflare Worker (`ADR-0002`).

## Falsificador

Antes da `v0.7.0`, `package.json` aponta `0.6.0`, `TOOL_DEFINITIONS` possui 23 tools, `lista_suja_lookup` falha com HTTP `405` em `portaldatransparencia.gov.br/sancoes/consulta` (`lib/tools/legal.ts:L482`), e `consumidor_reclamacoes` ainda solicita `consumidor.gov.br/pages/indicador/empresa/listar` (`lib/tools/company.ts:L127`).

## Log de transicoes

- 2026-11-21T16:23:35Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T16:24:37Z - **triaged** - Compiled from SPC-0001 (DoR 100/100)
- 2026-11-21T16:27:20Z - **designed** - DES-0036 approved
- 2026-11-21T16:27:20Z - **executing** - Epic tracking Wave 1+2
- 2026-11-21T17:19:37Z - **verifying** - Wave 1 (TCK-0041..0043) and Wave 2 (TCK-0044) completed and verified
- 2026-11-21T17:19:45Z - **done** - Epic SPC-0001 v0.7.0 closed by child aggregation (TCK-0041..0044 done)
