---
id: DES-0035-playbook
created_at: 2026-11-21T14:09:15Z
status: approved
design: DES-0035
ticket: TCK-0039
approved_at: 2026-11-21T14:09:15Z
approved_by: ops
executed_at: 2026-11-21T14:18:10Z
executed_runs:
  - RUN-20261121-140937-tck-0039
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min
branch_prefix: test/
branch_name: test/TCK-0039-cli-http-mcp-server-coverage
commit_per_step: false
commit_message_format: "[TCK-0039] passo N/4: <titulo>"
---
# Playbook - DES-0035

**Ticket:** TCK-0039 (`FND-0024`, `test-coverage`, `medium`)
**Objetivo:** Cobrir ramos não exercitados em `lib/adapters/cli-http.ts` (`429`, `413`, `400`, `extraAllowedHosts`, ciclo real SSE `GET /mcp` + `POST /messages`, `createGracefulShutdown`) e `lib/core/mcp-server.ts` (`ListTools`, `ListResources`, `ReadResource`, `CallTool` MCP Apps, rate limit e `catch` inesperado).

## Pre-requisitos

- [x] Worktree isolada criada em `test/TCK-0039-cli-http-mcp-server-coverage` a partir de `7984a3d`.
- [x] `lib/` inalterado (nenhum arquivo de produção no escopo).

## Passos

1. [x] **Passo 1/4 — Análise e setup de lifecycle:** Verificar ramos descobertos reais em `lib/adapters/cli-http.ts` e `lib/core/mcp-server.ts`, transicionar `TCK-0039` (`triaged` -> `designed` -> `executing`) e consultar lições (`cbctl.py learn consult`).
2. [x] **Passo 2/4 — Suíte `test/unit/cli-http-runtime-coverage.test.ts`:** Cobrir `parseCommaSeparatedList`, `isAllowedCliHost` (`extraAllowedHosts`/`bindHost`), `413`, `400`, `429` (`rateLimitMiddleware`), fluxo HTTP/SSE real (`GET /mcp`, `POST /messages`, `503`, `400`, `404`, `onclose`, `catch`) e `createGracefulShutdown` (clean + timeout com fake timers + best-effort error paths).
3. [x] **Passo 3/4 — Suíte `test/unit/mcp-server-handlers.test.ts`:** Cobrir `createMCPServer()` via `InMemoryTransport` + `Client` (`tools/list`, `resources/list`, `resources/read` válido e `InvalidParams`, `tools/call` MCP Apps `structuredContent`, rate-limit exceeded, falha de tool e `catch` de exceção inesperada).
4. [x] **Passo 4/4 — Verificação e fechamento parcial:** Executar `npm run test:coverage`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit`, `secret-scan.sh`, preencher `REPORT.md` + `run.json` e transicionar `TCK-0039` para `verifying`.

## Rollback

- Reverter o commit na branch `test/TCK-0039-cli-http-mcp-server-coverage` utilizando `git revert <commit-sha>` na worktree isolada.

## Criterios de sucesso do playbook

- [x] `npx vitest run test/unit/cli-http-runtime-coverage.test.ts test/unit/mcp-server-handlers.test.ts` passa 100% (`18/18`)
- [x] `npm run test:coverage` passa todos os thresholds com ganho mensurável em `cli-http.ts` (`99.65%` lines) e `mcp-server.ts` (`100%` lines)
- [x] `npx tsc --noEmit` e `npx tsc -p tsconfig.worker.json --noEmit` passam (exit `0`)
- [x] `secret-scan.sh` passa sem achados e `lib/` permanece intacto

## Log de execucoes

- `2026-11-21T14:18:10Z` — `RUN-20261121-140937-tck-0039` (`live`): 4/4 passos concluídos; `18/18` nas 2 novas suítes; `482/482` Vitest (`35` arquivos); `cli-http.ts` `79.86% -> 99.65%` stmts (`74.88% -> 92.23%` branch, `86.11% -> 100%` funcs, `80.00% -> 99.65%` lines); `mcp-server.ts` `78.68% -> 100%` stmts (`83.56% -> 93.15%` branch, `36.36% -> 100%` funcs, `83.63% -> 100%` lines); `All files` `92.39% -> 94.97%` stmts (`84.25% -> 86.42%` branch, `94.27% -> 97.26%` funcs, `93.03% -> 95.59%` lines); `tsc` + `tsc.worker` exit `0`; `secret-scan.sh` clean; `criteria-check.py` `3/3 PASS`.
