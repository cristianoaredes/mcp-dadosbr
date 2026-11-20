---
id: DES-0026-playbook
created_at: 2026-11-20T20:12:28Z
status: approved
design: DES-0026
ticket: TCK-0023
approved_at: 2026-11-20T20:12:28Z
approved_by: codex
executed_at: 2026-11-20T20:32:00Z
executed_runs:
  - RUN-20261120-201302-tck-0023
  - RUN-20261120-202622-tck-0023-r2
dry_run_supported: true
total_steps: 5
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: feature/
branch_name: feature/TCK-0023-cache-pagination-procurados-performance
commit_per_step: false
commit_message_format: "[TCK-0023] passo N/5: <titulo>"
---
# Playbook - DES-0026

**Ticket:** TCK-0023 (`FND-0011`)
**Objetivo:** Implementar caching em tools read-heavy, paginação/filtro opcional em `ibge_localidades`, reuso de `lookup()` em `company_deep_profile` e concorrência limitada + cache seguro em `procurados_lookup`.

## Pre-requisitos

- [x] `FND-0014` (`TCK-0026..0029`) concluído (`88a1caa`), sem `blocked_by` pendente em `TCK-0023`.

## Modo dry-run

`/ops-execute DES-0026 --dry-run`

## Passos

1. **Passo 1/5 — Schema & MCP Server (`lib/core/tool-schemas.ts`, `lib/core/mcp-server.ts`):** Adicionar `nome`, `page`, `limit` opcionais em `IbgeSchema` e adaptar `structuredContent` de `ibge_localidades` mantendo compatibilidade com array legado e objeto paginado.
2. **Passo 2/5 — Tools Governamentais e Financeiras (`lib/tools/government.ts`, `lib/tools/financial.ts`):** Implementar cache/filtro/paginação em `executeIBGE` e caching seguro (apenas sucessos reais, preservando `source`, sem segredos na chave) em `transparencia_lookup`, `ceis_cnep_lookup`, `pncp_licitacoes`, `querido_diario`, `bacen_taxas` e `fipe_veiculos`.
3. **Passo 3/5 — Company, Legal & Health (`lib/tools/company.ts`, `lib/tools/legal.ts`, `lib/tools/health.ts`):** Reutilizar `lookup()` e propagar `cache` em `executeDeepProfile`; habilitar `cache` em `domain_whois`, `consumidor_reclamacoes`, `datajud_processos`, `oab_advogado`, `bnmp_mandados`, `lista_suja_lookup`, `cnes_saude`; paralelizar `executeProcurados` com `PROCURADOS_CONCURRENCY = 4` + cache apenas quando `pagesFailed.length === 0`.
4. **Passo 4/5 — Testes & Documentação (`performance-cache-pagination.test.ts`, `legal-timeouts-intelligence.test.ts`, `.archagents/05-integrations.md`):** Atualizar teste de deadline de `procurados`, adicionar suíte completa offline de performance/cache/paginação/concorrência e documentar em `05-integrations.md`.
5. **Passo 5/5 — Verificação, Verificador Independente, Judge & Commit:** Rodar suítes alvo, `npm run test:coverage`, `npm test`, `tsc` + `tsc.worker`, `build` + `build:worker`, `test:transport`, `criteria-check.py`, `self` subagent, `VER`, `pipeline-judge.py`, transição para `done`, `secret-scan.sh`, commit e `ops/validate.py`.

## Criterios de sucesso do playbook

- [x] Cache nunca armazena erros, fallbacks ou respostas parciais e nunca incorpora secrets nas chaves.
- [x] Contratos de MCP Apps (`ibge-app`, `bacen-app`, `pncp-app`, `querido-diario-app`, `cnpj-app`) 100% preservados.
- [x] `npm run test:coverage`, `npm test`, `tsc`, `tsc.worker`, `build`, `build:worker` e `test:transport` 100% verdes.

## Log de execucoes

- `2026-11-20T20:18:00Z` — `RUN-20261120-201302-tck-0023` (`live`): R1 concluído localmente (`428/428`), rejeitado em `VER-20261120-202622-tck-0023` por corrida de aborto assíncrono em `executeProcurados`.
- `2026-11-20T20:32:00Z` — `RUN-20261120-202622-tck-0023-r2` (`live`): R2 corretivo com `succeededOffsets`, `activeCtrls` em `finally`, normalização de `cacheKey` IBGE e novos testes de regressão/fallback (`27/27` alvo, `429/429` Vitest, V8 `88.87/81.96/87.23/89.58`, `tsc`, `tsc.worker`, `build`, `build:worker`, `test:transport` e `criteria-check.py` `4/4 pass`).
