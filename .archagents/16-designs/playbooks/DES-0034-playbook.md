---
id: DES-0034-playbook
created_at: 2026-11-21T14:11:00Z
status: approved
design: DES-0034
ticket: TCK-0038
approved_at: 2026-11-21T14:11:00Z
approved_by: self
executed_at: 2026-11-21T14:20:19Z
executed_runs:
  - RUN-20261121-141121-tck-0038
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 15min-30min
branch_prefix: feat/
branch_name: feat/TCK-0038-request-correlation-unified-logger
commit_per_step: false
---
# Playbook - DES-0034

**Ticket:** TCK-0038 (`FND-0023`)
**Objetivo:** Propagar `RequestContext` ponta a ponta em Worker REST e CLI HTTP/SSE (`AsyncLocalStorage`), migrar `rate-limit.ts`, `search.ts` e `intelligence.ts` para `createLogger` estruturado, e elevar `tool.executed` para `INFO`.

## Pre-requisitos

- [x] Worktree isolado na base `7984a3d` (`feature/audit-remediation-wave2`) e branch `feat/TCK-0038-request-correlation-unified-logger`.
- [x] `TCK-0038` triado com critérios de aceite e `DES-0034` criado.

## Passos

1. **Passo 1/4 — Correlação Worker REST & Rate-Limit (`worker.ts`, `rest.ts`, `rate-limit.ts`):**
   - Adicionar `requestContext?: RequestContext` aos 4 endpoints de `rest.ts` e a `checkRateLimit` em `rate-limit.ts`.
   - Propagar `requestContext` em `worker.ts` (rate-limit + 4 endpoints REST) e em `handleMCPRequest(..., requestContext)`.
   - Substituir `console.error` de `rate-limit.ts` por `createLogger("worker-rate-limit").error("rate_limit.check_failed", ...)`.
2. **Passo 2/4 — Correlação CLI HTTP/SSE -> MCP (`cli-http.ts`, `mcp-server.ts`):**
   - Adicionar `getRequestContext?: () => RequestContext | undefined` a `MCPServerOptions` e resolver `getRequestContext?.() ?? new RequestContext()` em `CallToolRequestSchema`.
   - Configurar `AsyncLocalStorage<RequestContext>` em `cli-http.ts` (`GET /mcp` + `POST /messages` via `requestContextStore.run`).
3. **Passo 3/4 — Logger Estruturado & `tool.executed` em `INFO` (`search.ts`, `intelligence.ts`, `tools.ts`, `tools/core.ts`, `tools/company.ts`):**
   - Migrar os 4 `console.error` de `search.ts` para `createLogger("search")` com `requestId` opcional.
   - Migrar todos os `console.error` de `intelligence.ts` para `createLogger("intelligence")` (`debug`/`info`/`warn`/`error`) preservando helpers de redação e `requestId` opcional.
   - Alterar `toolsLogger.debug("tool.executed", ...)` para `toolsLogger.info("tool.executed", ...)` em `lib/core/tools.ts`.
4. **Passo 4/4 — Testes, Runbook & Gates de Verificação:**
   - Adicionar testes de correlação e logging estruturado em `test/unit/observability.test.ts` e validar `test/unit/session-thinking-redaction-ratelimit.test.ts` e `test/unit/legal-timeouts-intelligence.test.ts`.
   - Atualizar `.archagents/10-runbooks.md` e rodar `npm run test`, `tsc --noEmit`, `tsc -p tsconfig.worker.json --noEmit`, `build`, `build:worker`, `test:transport` e `secret-scan.sh`.

## Criterios de sucesso do playbook

- [x] `npx vitest run test/unit/observability.test.ts test/unit/legal-timeouts-intelligence.test.ts test/unit/session-thinking-redaction-ratelimit.test.ts test/unit/worker-rest-cloudflare.test.ts test/unit/worker-sse-kv-shutdown.test.ts` passa 100%.
- [x] `npm run test` passa 100%.
- [x] `npx tsc --noEmit` e `npx tsc -p tsconfig.worker.json --noEmit` passam sem erros.
- [x] `npm run build && npm run build:worker && npm run test:transport` e `secret-scan.sh` passam limpos.

## Log de execucoes

- `RUN-20261121-141121-tck-0038` (`2026-11-21`): `5/5` arquivos direcionados (`58/58` testes), `33/33` arquivos Vitest (`467/467` testes), cobertura V8 `93.06% Stmts | 84.32% Branch | 94.55% Funcs | 93.75% Lines`, `tsc` + `tsc.worker` + `build` + `build:worker` + `test:transport` + `secret-scan.sh` verdes.

## Rollback

Caso qualquer regressão ocorra antes ou depois do merge:
1. Reverter o commit com `git revert <commit-sha>` (reversível, preservando histórico e `SAFETY.md`).
2. Reverter a transição do ticket para reabertura via `transition.py` se necessário antes de nova execução.
