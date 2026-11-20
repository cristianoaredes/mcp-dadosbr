---
id: TCK-0023
slug: adicionar-cache-e-paginacao-em-ibge-localidades-tools-governamentais-financeiras
title: "Adicionar cache e paginacao em ibge_localidades, tools governamentais/financeiras e otimizar raspagem de procurados_lookup"
source: audit
created_at: 2026-11-20T15:16:20Z
created_by: ops
updated_at: 2026-11-20T20:41:42Z
status: done
severity: medium
category: performance
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0011
linked_designs:
  - DES-0026
linked_runs:
  - RUN-20261120-201302-tck-0023
  - RUN-20261120-202622-tck-0023-r2
linked_verifications:
  - VER-20261120-202622-tck-0023
  - VER-20261120-204111-tck-0023
linked_docs:
  - .archagents/05-integrations.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/performance-cache-pagination.test.ts test/unit/ibge-app.test.ts test/unit/legal-timeouts-intelligence.test.ts && echo PERF_TESTS_OK"
    expect: PERF_TESTS_OK
  - check: "npm run test:coverage && npm test && echo TESTS_COVERAGE_OK"
    expect: TESTS_COVERAGE_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
  - check: "npm run build && npm run build:worker && npm run test:transport && echo BUILD_TRANSPORT_OK"
    expect: BUILD_TRANSPORT_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T20:12:26Z
---
# TCK-0023 - Adicionar cache e paginacao em ibge_localidades, tools governamentais/financeiras e otimizar raspagem de procurados_lookup

## Contexto

Originado por **FND-0011** (`performance` / `medium`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/tools/government.ts:L20-L38`, `lib/tools/government.ts:L46`, `lib/tools/government.ts:L75-L110`, `lib/tools/government.ts:L142-L192`, `lib/tools/government.ts:L225-L319`, `lib/tools/financial.ts:L16-L89`, `lib/tools/company.ts:L156-L160`, `lib/tools/legal.ts:L141-L161`.
- **Problema:** `ibge_localidades({ tipo: "municipios" })` retorna ~5.570 itens sem paginação nem cache; tools de `government.ts`, `financial.ts` e `legal.ts` ignoram o parâmetro `cache`; `company_deep_profile` bypassa `lookup()`/`cache`/`deduplicate`; `procurados_lookup` raspa 13 páginas sequencialmente sem cache.
- **Mitigação:** Adicionar paginação/filtro opcional em `ibge_localidades`, habilitar cache em tools de leitura e dados estáveis/semi-estáveis, reutilizar `lookup()` em `executeDeepProfile` e cachear/paralelizar com limite a lista de `procurados_lookup`.

## Falsificador

Evidências pré-fix de **FND-0011** observadas na revisão `88a1caa`:

- `lib/tools/government.ts:27-69`: `executeIBGE` ignora o parâmetro `cache`, ignora `id` declarado no schema e não oferece filtro (`nome`) nem paginação (`page`/`limit`), retornando ~5.570 municípios em payload único não cacheado em toda chamada.
- `lib/tools/government.ts:83-355` e `lib/tools/financial.ts:17-119`: `transparencia_lookup`, `ceis_cnep_lookup`, `pncp_licitacoes`, `querido_diario`, `bacen_taxas` e `fipe_veiculos` ignoram o parâmetro `cache` repassado por `executeRegisteredTool`.
- `lib/tools/company.ts:76-192`: `executeWhois`, `executeConsumidor` e `executeDeepProfile` ignoram `cache`; `executeDeepProfile` (`lib/tools/company.ts:166`) chama `httpJson` diretamente em vez de reutilizar `lookup()` (`cache` + `deduplicate`).
- `lib/tools/legal.ts:32-356` e `lib/tools/health.ts:14-48`: `datajud_processos`, `oab_advogado`, `bnmp_mandados`, `lista_suja_lookup` e `cnes_saude` ignoram `cache`; `procurados_lookup` (`lib/tools/legal.ts:180-305`) raspa as 13 páginas sequencialmente em loop serial sem cache entre consultas.

## Log de transicoes

- 2026-11-20T15:16:20Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T20:12:26Z - **noted** - body:falsifier (replace): Registrar evidencias FND-0011 pre-fix na revisao 88a1caa
- 2026-11-20T20:12:26Z - **triaged** - Falsificador FND-0011 e criterios mecanicos de aceite registrados para TCK-0023 [aceite reescrito: 4 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T20:13:02Z - **designed** - DES-0026 aprovado para remediacao de performance FND-0011 (TCK-0023)
- 2026-11-20T20:13:02Z - **executing** - Iniciando execucao de DES-0026 (RUN-20261120-201302-tck-0023)
- 2026-11-20T20:18:02Z - **verifying** - Execucao RUN-20261120-201302-tck-0023 concluida com todos os testes, cobertura V8, builds e criteria-check aprovados
- 2026-11-20T20:26:50Z - **executing** - R2 remediation for High finding in executeProcurados async-abort race (4798042a)
- 2026-11-20T20:33:07Z - **verifying** - R2 (RUN-20261120-202622-tck-0023-r2) corrigiu corrida de aborto assincrono e todas as verificacoes passaram (429/429, criteria-check 4/4)
- 2026-11-20T20:41:42Z - **done** - TCK-0023 aprovado em R2 pelo verificador independente (14916840) e juiz com 429/429 testes e 88.87/81.96/87.23/89.58 V8
