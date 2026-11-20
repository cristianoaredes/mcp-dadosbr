---
id: DES-0025-playbook
created_at: 2026-11-20T19:49:53Z
status: approved
design: DES-0025
ticket: TCK-0029
approved_at: 2026-11-20T19:49:53Z
approved_by: codex
executed_at: 2026-11-20T19:56:00Z
executed_runs:
  - RUN-20261120-195035-tck-0029
dry_run_supported: true
total_steps: 5
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: ops/
branch_name: chore/TCK-0029-critical-modules-coverage-ratchet
commit_per_step: false
commit_message_format: "[TCK-0029] passo N/5: <titulo>"
---
# Playbook - DES-0025

**Ticket:** TCK-0029
**Objetivo:** Cobrir `lib/workers/{rest,tokens,worker}.ts`, `lib/adapters/cloudflare.ts`, `lib/tools/{company,health,osint,legal}.ts` e `lib/core/tools.ts`, encerrando pendência de `lib/tools/core.ts` e elevando o ratchet em `vitest.config.ts`.

## Pre-requisitos

- [x] `TCK-0028` concluído (`a4cd423`), liberando `blocked_by: [TCK-0028]` em `TCK-0029`.

## Modo dry-run

`/ops-execute DES-0025 --dry-run`

## Passos

1. **Passo 1/5 — Higiene em `lib/tools/core.ts`:** Ajustar `PendingRequest.promise` para `Promise<unknown>` e chamar `clearTimeout(existing.timeoutId)` ao sobrescrever entrada expirada por timestamp em `deduplicate`.
2. **Passo 2/5 — Suíte Workers / REST / Cloudflare (`test/unit/worker-rest-cloudflare.test.ts`):** Cobrir `generateSecureToken`, `handleLookupEndpoint`, `handleSearchEndpoint`, `handleIntelligenceEndpoint`, `handleThinkingEndpoint`, `handleMCPRequest`, `handleMCPEndpoint`, `handleHealthCheck` e `worker.fetch` (`/`, 405, 404, REST routes, 429 rate-limit).
3. **Passo 3/5 — Suíte Tools & Orquestração (`test/unit/tools-company-health-osint-legal.test.ts`):** Cobrir `executeTool`/`getMetrics`/`resetMetrics`, `cpf_validate`, `domain_whois`, `consumidor_reclamacoes`, `company_deep_profile`, `cnes_saude`, `strategic_osint_prompt`, `datajud_processos`, `oab_advogado`, `bnmp_mandados`, `procurados_lookup`, `lista_suja_lookup` e sobrescrita expirada de `deduplicate`.
4. **Passo 4/5 — Medir V8 coverage, elevar ratchet em `vitest.config.ts` e atualizar `.archagents/08-conventions.md`:** Verificar margem confortável acima do ratchet elevado e registrar valores reais medidos.
5. **Passo 5/5 — Verificação, Reviewer Independente e Fechamento (`TCK-0029` + `TCK-0026`):** Rodar suítes, `npm run test:coverage`, `npm test`, `tsc` + `tsc.worker`, `build` + `build:worker`, `test:transport`, `criteria-check.py`, `self` subagent, `VER` e `pipeline-judge.py`, e fechar o épico pai `TCK-0026`.

## Criterios de sucesso do playbook

- [x] Todos os módulos críticos citados com cobertura direta e sem réplicas locais.
- [x] `vitest.config.ts` com ratchet elevado passando sem relaxamentos.
- [x] `npm test`, `npm run test:coverage`, `tsc`, `tsc.worker`, `build`, `build:worker` e `test:transport` 100% verdes.

## Log de execucoes

- `2026-11-20T19:56:00Z` — `RUN-20261120-195035-tck-0029` (`live`): 5/5 passos concluídos; `19/19` testes nas 2 novas suítes; `npm run test:coverage` PASS (`87.91% stmts / 80.27% branches / 86.89% funcs / 88.64% lines` >= ratchet `80/75/80/80`); `420/420` Vitest (`28` arquivos, `744ms`); `tsc` + `tsc.worker` + `build` + `build:worker` + `test:transport` + `criteria-check.py` (`4/4`) aprovados.
