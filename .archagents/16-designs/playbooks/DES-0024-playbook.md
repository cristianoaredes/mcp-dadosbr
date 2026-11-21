---
id: DES-0024-playbook
created_at: 2026-11-20T19:32:27Z
status: approved
design: DES-0024
ticket: TCK-0028
approved_at: 2026-11-20T19:32:27Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 5
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: ops/
branch_name: chore/TCK-0028-connect-replicated-unit-tests-to-lib
commit_per_step: false
commit_message_format: "[TCK-0028] passo N/5: <titulo>"
---
# Playbook - DES-0024

**Ticket:** TCK-0028
**Objetivo:** Conectar `sse.test.ts`, `concurrency.test.ts`, `deduplication.test.ts` e `intelligence.test.ts` ao codigo real de `lib/` com fake timers.

## Pre-requisitos

- [x] `TCK-0027` concluído (`e2d76c0`), `@vitest/coverage-v8` operando e `blocked_by: [TCK-0027]` satisfeito.

## Modo dry-run

`/ops-execute DES-0024 --dry-run`

## Passos

1. **Passo 1/5 — Exportações e higiene de `deduplicate`:** Exportar `executeWithConcurrencyLimit`, `normalizeCnpj`, `containsCnpj`, `filterResultsByCnpj` (`lib/core/intelligence.ts`) e `deduplicate`, `getPendingRequestCount`, `lookup` (`lib/tools/core.ts`, com `TIMEOUTS.DEDUP_TIMEOUT_MS` e guarda `promise === promise`).
2. **Passo 2/5 — Conectar `intelligence.test.ts` e `concurrency.test.ts`:** Remover réplicas locais, importar de `lib/core/intelligence.js`, adicionar testes de `filterResultsByCnpj` e `AbortSignal`, usar `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync`.
3. **Passo 3/5 — Conectar `deduplication.test.ts` e `sse.test.ts`:** Importar `deduplicate`/`lookup` reais e `handleSSEEndpoint`/`createCliHttpApp` reais com fake timers e cleanup seguro (`restoreAllMocks` antes de `useRealTimers`).
4. **Passo 4/5 — Guarda estática, ratchet e convenções:** Adicionar guarda anti-duplicação em `dependency-hygiene.test.ts`, recalibrar ratchet em `vitest.config.ts` e atualizar `.archagents/08-conventions.md`.
5. **Passo 5/5 — Verificação e Review:** Executar suítes, `npm run test:coverage`, `npm test`, `tsc` + `tsc.worker`, `build` + `build:worker`, `test:transport`, `criteria-check.py` e verificador `self` independente.

## Criterios de sucesso do playbook

- [x] Nenhum dos 4 arquivos de teste mantém réplica local das funções de produção.
- [x] `npm run test:coverage`, `npm test`, `tsc`, `tsc.worker`, `build`, `build:worker` e `test:transport` passam integralmente.

## Log de execucoes

- `2026-11-20T19:37:50Z` — `RUN-20261120-193311-tck-0028` (`live`): 5/5 passos concluídos; `68/68` testes nas 5 suítes alvo (`734ms`); `npm run test:coverage` PASS (`76.62% / 70.17% / 75.66% / 78.26%` >= ratchet `74/68/73/76`); `401/401` Vitest (`1.73s`); `tsc` + `tsc.worker` + `build` + `build:worker` + `test:transport` + `criteria-check.py` (`4/4`) aprovados.
