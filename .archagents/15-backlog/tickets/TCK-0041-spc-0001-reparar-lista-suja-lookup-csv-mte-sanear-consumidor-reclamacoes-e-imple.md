---
id: TCK-0041
slug: spc-0001-reparar-lista-suja-lookup-csv-mte-sanear-consumidor-reclamacoes-e-imple
title: "[SPC-0001] Reparar lista_suja_lookup (CSV MTE), sanear consumidor_reclamacoes e implementar tcu_certidoes"
source: spec
created_at: 2026-11-21T16:23:36Z
created_by: ops
updated_at: 2026-11-21T16:27:20Z
status: executing
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0037
linked_runs:
  - RUN-20261121-162555-tck-0041
linked_verifications: []
linked_docs:
  - .archagents/12-inception/specs/SPC-0001-pacote-fontes-transversais-v070.md
external_refs: []
external_sync: []
blocks:
  - TCK-0044
blocked_by: []
related:
  - TCK-0040
acceptance:
  - check: "npx vitest run test/unit/tcu-mte-v070.test.ts test/unit/tools-company-health-osint-legal.test.ts test/unit/performance-cache-pagination.test.ts"
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit"
  - check: "rg -q 'cadastro_de_empregadores\\.csv' lib/shared/mte-lista-suja.ts && ! rg -q 'consumidor\\.gov\\.br/pages/indicador/empresa/listar' lib/tools/company.ts"
linked_spec: SPC-0001
security_sensitive: true
---
# TCK-0041 - [SPC-0001] Reparar lista_suja_lookup (CSV MTE), sanear consumidor_reclamacoes e implementar tcu_certidoes

## Contexto

Unit 1 de `SPC-0001` (filho de `TCK-0040`). Substitui a rota `405` de `lista_suja_lookup` pelo CSV aberto oficial do MTE (`cadastro_de_empregadores.csv`, ~76 KB) com sanitização e `lgpd_notice`, remove a requisição HTTP contra o challenge anti-bot de `consumidor_reclamacoes`, e implementa `tcu_certidoes` (com `registerTcuTool()`) integrada a `company_deep_profile`.

## Falsificador

Antes do fix, `lib/tools/legal.ts:L482` consulta `portaldatransparencia.gov.br/sancoes/consulta` (`405`), `lib/tools/company.ts:L127-L133` chama `httpJson` contra `consumidor.gov.br/pages/indicador/empresa/listar`, e `lib/tools/tcu.ts` não existe.

## Log de transicoes

- 2026-11-21T16:23:36Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T16:24:37Z - **triaged** - Compiled from SPC-0001 (DoR 100/100)
- 2026-11-21T16:25:55Z - **designed** - DES-0037 approved
- 2026-11-21T16:27:20Z - **executing** - Wave 1 parallel execution (RUN-20261121-162555-tck-0041)
