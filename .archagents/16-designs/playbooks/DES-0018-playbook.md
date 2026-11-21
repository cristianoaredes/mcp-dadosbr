---
id: DES-0018-playbook
created_at: 2026-11-20T17:40:11Z
status: approved
design: DES-0018
ticket: TCK-0019
approved_at: 2026-11-20T17:40:11Z
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
branch_name: ops/TCK-0019-timeouts-com-abortcontroller-em-fetch-providers-correcao-de-falso-negativo-em-pr
commit_per_step: false
commit_message_format: "[TCK-0019] passo N/5: <titulo>"
---
# Playbook - DES-0018

**Ticket:** TCK-0019
**Objetivo:** Timeouts com AbortController em fetch/providers, correcao de falso negativo em procurados_lookup e cancelamento em executeIntelligence

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0018 --dry-run`

## Passos

1. Criar `lib/shared/utils/timeout.ts` com helpers `isAbortOrTimeoutError`, `createTimeoutController` e `raceWithTimeoutAndSignal` compatíveis com Node e Cloudflare Workers.
2. Endurecer `lib/core/search-providers.ts` (`TavilyProvider`, `PerplexityProvider`) e `lib/core/intelligence.ts` (cancelamento via `AbortSignal` no scheduler e `clearTimeout` em `finally`).
3. Endurecer `lib/tools/legal.ts` (`executeDatajud`, `executeBnmp`, `executeProcurados` com timeouts e eliminação do falso negativo `NOT_FOUND`).
4. Criar suíte unitária/adversarial `test/unit/legal-timeouts-intelligence.test.ts` e atualizar `.archagents/05-integrations.md`.
5. Executar suíte completa, `tsc` + `tsc.worker`, `build` + `build:worker`, `test:transport` e `criteria-check.py`.

## Rollback

- Reverter commit da branch `bugfix/TCK-0019-fetch-timeouts-procurados-intelligence` via `git revert` na worktree isolada.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- *(sem execucoes ainda)*
