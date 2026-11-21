---
id: DES-0028-playbook
created_at: 2026-11-20T21:05:03Z
status: approved
design: DES-0028
ticket: TCK-0025
approved_at: 2026-11-20T21:05:03Z
approved_by: codex
executed_at: 2026-11-20T21:13:00Z
executed_runs:
  - RUN-20261120-210540-tck-0025
dry_run_supported: true
total_steps: 5
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: ops/
branch_name: ops/TCK-0025-conectar-logger-stderr-tracing-web-crypto-x-request-id-metricas-red-cachehits-au
commit_per_step: false
commit_message_format: "[TCK-0025] passo N/5: <titulo>"
---
# Playbook - DES-0028

**Ticket:** TCK-0025
**Objetivo:** Conectar logger stderr, tracing Web Crypto X-Request-Id, metricas RED/cacheHits, audit log 401 e health KV

## Pre-requisitos

- [x] Worktree `.worktrees/audit-remediation` empilhada após `TCK-0024` (`786d7ed`) sem contaminar o repo principal (`109` itens).

## Modo dry-run

`/ops-execute DES-0028 --dry-run`

## Passos

1. **Passo 1/5 — Logger & Tracing Worker-safe:** Direcionar `Logger` 100% para `console.error`, proteger `process.env`, usar `Web Crypto` (`randomUUID`/`getRandomValues`) e sanitizar `X-Request-Id` em `tracing.ts`.
2. **Passo 2/5 — Métricas RED, Cache Hits & Contexto:** Adicionar `ToolMetrics`, proxy observável de `cache.get()`, `getToolMetrics()`, reset completo (`lastMetricsLog` + `toolMetrics`), e remover `resetMetrics()` de `createMCPServer()`.
3. **Passo 3/5 — CLI HTTP, Auth Audit Log, SSE & Health KV:** Propagar `X-Request-Id` em `cli-http.ts` e `worker.ts`, estruturar 401 em `auth.ts` sem segredos, tornar `handleHealthCheck()` assíncrono com sonda KV bounded e tirar `console.log` de `sse.ts`.
4. **Passo 4/5 — Testes, Ratchet & Runbook:** Criar `test/unit/observability.test.ts`, ajustar `await handleHealthCheck`, ratchetar `vitest.config.ts` (`85/85/80/85`) e atualizar `.archagents/10-runbooks.md`.
5. **Passo 5/5 — Verificação, Verificador Independente, VER, Judge & Commit:** Rodar suíte completa, `criteria-check.py`, `audit-measure.py`, verificador `self`, `VER`, `pipeline-judge.py`, `done`, `secret-scan.sh`, commit e `ops/validate.py`.

## Criterios de sucesso do playbook

- [x] Todos os 4 critérios de aceite em `TCK-0025` passam (`4/4`).
- [x] `npm run test:coverage` passa no novo ratchet (`85/85/80/85`) + `npm run test:transport` limpo em `stdout`.
- [x] `ops/validate.py` (`8/8 ok: true`) após commit no worktree.

## Log de execucoes

- `RUN-20261120-210540-tck-0025` (`2026-11-20`): `59/59` testes direcionados (`5` arquivos), `442/442` Vitest (`31` arquivos), V8 `91.32% Stmts | 83.57% Branch | 93.25% Funcs | 92.09% Lines >= 85/80/85/85`, `tsc` + `tsc.worker` + `build` + `build:worker` + `test:transport` verdes, `criteria-check.py` `4/4 pass`.
