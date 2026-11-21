---
id: DES-0017-playbook
created_at: 2026-11-20T17:25:19Z
status: approved
design: DES-0017
ticket: TCK-0018
approved_at: 2026-11-20T17:25:19Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: ops/
branch_name: ops/TCK-0018-circuit-breaker-por-upstream-cleartimeout-timeoutms-dinamico-e-retry-com-jitter
commit_per_step: false
commit_message_format: "[TCK-0018] passo N/4: <titulo>"
---
# Playbook - DES-0017

**Ticket:** TCK-0018
**Objetivo:** Circuit breaker por upstream, clearTimeout, timeoutMs dinamico e retry com jitter em httpJson

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0017 --dry-run`

## Passos

1. Refatorar `lib/core/http-client.ts` com registro particionado por origem (`MAX_CIRCUIT_BREAKERS = 100`), `TransientHttpError`, `clearTimeout` em `finally`, `formatTimeoutMessage(timeoutMs)`, `RETRY_STATUS_CODES` e `calculateBackoffDelayMs` (Equal Jitter).
2. Criar `test/unit/http-client.test.ts` cobrindo abertura/recuperação de circuit breaker, isolamento por upstream, 4xx sem tripping, `clearTimeout`, `timeoutMs` dinâmico, `RETRY_STATUS_CODES`, Equal Jitter, `204 noContent`, URL inválida e limite do mapa.
3. Atualizar `.archagents/05-integrations.md` documentando as garantias de resiliência em `lib/core/http-client.ts` (mantendo disponibilidade externa marcada como *a confirmar*).
4. Executar validação completa (`vitest`, `npm test`, `tsc`, `build`, `build:worker`, `test:transport`, `criteria-check.py`).

## Rollback

- Reverter commit da branch `bugfix/TCK-0018-http-client-circuit-breaker-jitter` via `git revert` mantendo isolamento da worktree.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- *(sem execucoes ainda)*
