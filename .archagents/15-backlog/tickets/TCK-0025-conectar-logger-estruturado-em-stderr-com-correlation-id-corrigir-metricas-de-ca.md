---
id: TCK-0025
slug: conectar-logger-estruturado-em-stderr-com-correlation-id-corrigir-metricas-de-ca
title: "Conectar logger estruturado em stderr com correlation ID, corrigir metricas de cache/SSE e adicionar audit log em auth"
source: audit
created_at: 2026-11-20T15:16:22Z
created_by: ops
updated_at: 2026-11-20T21:17:58Z
status: done
severity: medium
category: observability
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0013
linked_designs:
  - DES-0028
linked_runs:
  - RUN-20261120-210540-tck-0025
linked_verifications:
  - VER-20261120-211659-tck-0025
linked_docs:
  - .archagents/10-runbooks.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/observability.test.ts test/unit/tools-company-health-osint-legal.test.ts test/unit/worker-auth-oauth-cors.test.ts test/unit/worker-rest-cloudflare.test.ts test/unit/worker-sse-kv-shutdown.test.ts && echo OBS_TESTS_OK"
    expect: OBS_TESTS_OK
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
  classified_at: 2026-11-20T21:05:02Z
---
# TCK-0025 - Conectar logger estruturado em stderr com correlation ID, corrigir metricas de cache/SSE e adicionar audit log em auth

## Contexto

Originado por **FND-0013** (`observability` / `medium`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/infrastructure/logger.ts:L68`, `lib/infrastructure/logger.ts:L74`, `lib/infrastructure/tracing.ts:L16`, `lib/core/tools.ts:L36`, `lib/core/tools.ts:L68`, `lib/core/tools.ts:L80-L88`, `lib/core/mcp-server.ts:L75`, `lib/adapters/cli.ts:L190`, `lib/workers/auth.ts:L18-L72`, `lib/adapters/cloudflare.ts:L50-L66`, saída `audit-measure.py` (`cobertura-do-reflect`).
- **Problema:** `logger.ts`/`tracing.ts` são código morto (e `Logger.debug`/`info` escrevem em `console.log`/stdout, quebrando `stdio`, e `generateRequestId` usa `Math.random()`); `recordMetrics` sempre marca `fromCache=false`, `resetMetrics()` não zera `lastMetricsLog` e é chamado a cada nova conexão SSE; faltam correlation ID, métricas RED por tool, audit log de 401 e health check real de KV.
- **Mitigação:** Direcionar `Logger` para `stderr` em Node, usar `crypto.randomUUID()`, propagar `RequestContext` por requisição, corrigir `recordMetrics`/`resetMetrics` (sem resetar métricas globais por conexão SSE), adicionar audit log 401 e checagem de KV em `/health`.

## Falsificador

Evidências verificáveis no repositório antes do fix (`786d7ed`):
- `lib/infrastructure/logger.ts:L68,L74`: `Logger.debug` e `Logger.info` chamam `console.log(...)` (escrevendo em `stdout` e quebrando transporte `stdio` JSON-RPC se conectados); `0` importadores em `lib/`.
- `lib/infrastructure/tracing.ts:L16`: `generateRequestId()` utiliza `Math.random().toString(36)` em vez de Web Crypto CSPRNG; `0` importadores em `lib/`.
- `lib/core/tools.ts:L37,L70,L73,L82-L90`: `executeTool()` passa sempre `false` em `recordMetrics(..., false, ...)` (mantendo `cacheHits` sempre `0`), `resetMetrics()` não zera `lastMetricsLog` (parando logs periódicos após um reset), e não há contagem RED por tool (`getToolMetrics()`).
- `lib/core/mcp-server.ts:L88`: `createMCPServer()` invoca `resetMetrics()` a cada nova conexão SSE em `lib/adapters/cli-http.ts:L389`, zerando métricas globais do processo.
- `lib/workers/auth.ts:L66`: 401 emite apenas `console.error(\`[Auth] Unauthorized request to ${url.pathname}\`)` sem JSON estruturado, `requestId` ou motivo.
- `lib/adapters/cloudflare.ts:L159-L178`: `handleHealthCheck()` retorna JSON estático `{ status: "healthy" }` síncrono sem sondar binding KV (`MCP_CACHE`/`MCP_KV`).
- `lib/workers/sse.ts:L147`: `console.log("SSE connection timeout reached, closing gracefully")` escreve em `stdout`.
- Comando de inspeção estática antes do fix: `rg -n "console\.log" lib/infrastructure/logger.ts lib/workers/sse.ts` retorna 3 ocorrências (`logger.ts:68,74`, `sse.ts:147`), e `npx vitest run test/unit/observability.test.ts` falha (suíte ausente).

## Log de transicoes

- 2026-11-20T15:16:22Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T21:05:02Z - **triaged** - Triagem FND-0013 (observability/medium): logger em stderr, tracing Web Crypto requestId, metricas RED e cacheHits, audit log 401 e health probe KV [aceite reescrito: 4 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T21:05:40Z - **designed** - Design DES-0028 e playbook aprovados
- 2026-11-20T21:05:54Z - **executing** - Iniciando execucao DES-0028 em RUN-20261120-210540-tck-0025
- 2026-11-20T21:13:22Z - **verifying** - Implementacao DES-0028 concluida em RUN-20261120-210540-tck-0025; criteria-check 4/4, 442/442 testes e V8 91.32/83.57/93.25/92.09 >= 85/80/85/85
- 2026-11-20T21:17:58Z - **done** - Verificado de forma independente (7d38a097) e re-testado pos ajuste de runbook; 442/442 testes, V8 91.32/83.57/93.25/92.09 >= 85/80/85/85, criteria-check 4/4 pass
