---
id: DES-0028
slug: conectar-logger-stderr-tracing-web-crypto-x-request-id-metricas-red-cachehits-au
title: "Conectar logger stderr, tracing Web Crypto X-Request-Id, metricas RED/cacheHits, audit log 401 e health KV"
created_at: 2026-11-20T21:05:02Z
status: approved
ticket: TCK-0025
type: design
scope_files_new:
  - test/unit/observability.test.ts
scope_files_modified:
  - lib/infrastructure/logger.ts
  - lib/infrastructure/tracing.ts
  - lib/types/index.ts
  - lib/core/registry.ts
  - lib/core/tools.ts
  - lib/core/mcp-server.ts
  - lib/adapters/cli-http.ts
  - lib/workers/auth.ts
  - lib/adapters/cloudflare.ts
  - lib/workers/worker.ts
  - lib/workers/sse.ts
  - test/unit/worker-rest-cloudflare.test.ts
  - test/unit/worker-sse-kv-shutdown.test.ts
  - test/unit/architecture-hygiene.test.ts
  - vitest.config.ts
  - .archagents/10-runbooks.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0028-playbook.md
acceptance_delta: unchanged
---
# DES-0028 - Conectar logger stderr, tracing Web Crypto X-Request-Id, metricas RED/cacheHits, audit log 401 e health KV

## Problema

`FND-0013` / `TCK-0025`: `lib/infrastructure/logger.ts` (`console.log` em `debug`/`info`) e `lib/infrastructure/tracing.ts` (`Math.random()`) eram módulos mortos com risco `stdout` em `stdio`; `executeTool` nunca contabilizava `cacheHits`, `resetMetrics()` não resetava `lastMetricsLog` e `createMCPServer()` zerava métricas globais por sessão SSE; faltavam métricas RED por tool, audit log estruturado 401 em `lib/workers/auth.ts`, `console.log` em `lib/workers/sse.ts:L147` e sonda KV com timeout em `handleHealthCheck()`.

## Solucao

1. **Logger `stderr` + Worker-safe (`lib/infrastructure/logger.ts`):** direcionar todos os níveis (`debug`, `info`, `warn`, `error`) para `console.error`, proteger `process.env` para Cloudflare Workers, default `INFO` exceto `NODE_ENV=development` (respeitando `LOG_LEVEL`), adicionar `setLevel`/`getLevel`, e proteger `JSON.stringify` contra objetos circulares/`BigInt`.
2. **Tracing Web Crypto + Sanitização (`lib/infrastructure/tracing.ts`):** gerar `requestId` com `globalThis.crypto.randomUUID()` (fallback `getRandomValues`, zero `Math.random()`, sem `node:crypto`), exportar `REQUEST_ID_HEADER = "X-Request-Id"`, e validar `extractRequestId` para Fetch `Headers` e `Record` com regex `/^[A-Za-z0-9._:-]{1,128}$/`.
3. **Métricas RED + `cacheHits` reais (`lib/types/index.ts`, `lib/core/registry.ts`, `lib/core/tools.ts`, `lib/core/mcp-server.ts`):** interceptar `cache.get()` via proxy leve transparente para registrar `cacheHits` reais sem engolir erros, rastrear `ToolMetrics` por tool (`getToolMetrics()`), zerar `lastMetricsLog` e `toolMetrics` em `resetMetrics()`, remover `resetMetrics()` de `createMCPServer()`, e propagar `RequestContext`/`requestId` em chamadas MCP e logs estruturados em `stderr` (preservando `[metrics] ...` a cada 100 requests).
4. **Propagação `X-Request-Id`, Audit Log 401 e Health Probe KV (`cli-http.ts`, `auth.ts`, `cloudflare.ts`, `worker.ts`, `sse.ts`):** propagar `RequestContext` e header `X-Request-Id` no Worker (`fetch`, `auth`, `cloudflare`, `/health`, `/mcp`) e CLI HTTP/SSE; emitir JSON audit log de 401 em `auth.ts` sem segredos/query; sondar KV com timeout limitado (`1000ms`, cleanup em `finally`, `503 degraded` em falha/timeout, `200 ok`/`unconfigured`) em `handleHealthCheck()`; migrar `sse.ts:L147` para logger `stderr`.
5. **Testes, Coverage Ratchet & Runbook:** criar `test/unit/observability.test.ts`, atualizar 2 callers `await handleHealthCheck(...)`, elevar `vitest.config.ts` para `85/85/80/85`, atualizar `.archagents/10-runbooks.md`.

## Mudancas

- `lib/infrastructure/{logger,tracing}.ts`
- `lib/types/index.ts`, `lib/core/{registry,tools,mcp-server}.ts`
- `lib/adapters/{cli-http,cloudflare}.ts`, `lib/workers/{auth,worker,sse}.ts`
- `test/unit/{observability,worker-rest-cloudflare,architecture-hygiene}.test.ts`, `vitest.config.ts`
- `.archagents/10-runbooks.md`

## Criterios de sucesso

- [ ] Todos os 4 critérios de `TCK-0025` passam em `criteria-check.py` (`4/4`).
- [ ] Nenhum `console.log` em `logger.ts`/`sse.ts` nem `Math.random()`/`node:crypto` em `tracing.ts`.
- [ ] `npm run test:coverage` passa thresholds ratcheted (`85/85/80/85`) + `npm run test:transport` 100% verde.
