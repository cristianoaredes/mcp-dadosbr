---
id: TCK-0025
slug: conectar-logger-estruturado-em-stderr-com-correlation-id-corrigir-metricas-de-ca
title: "Conectar logger estruturado em stderr com correlation ID, corrigir metricas de cache/SSE e adicionar audit log em auth"
source: audit
created_at: 2026-11-20T15:16:22Z
created_by: ops
updated_at: 2026-11-20T15:16:22Z
status: raw
severity: medium
category: observability
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0013
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/10-runbooks.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance: []
---
# TCK-0025 - Conectar logger estruturado em stderr com correlation ID, corrigir metricas de cache/SSE e adicionar audit log em auth

## Contexto

Originado por **FND-0013** (`observability` / `medium`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/infrastructure/logger.ts:L68`, `lib/infrastructure/logger.ts:L74`, `lib/infrastructure/tracing.ts:L16`, `lib/core/tools.ts:L36`, `lib/core/tools.ts:L68`, `lib/core/tools.ts:L80-L88`, `lib/core/mcp-server.ts:L75`, `lib/adapters/cli.ts:L190`, `lib/workers/auth.ts:L18-L72`, `lib/adapters/cloudflare.ts:L50-L66`, saída `audit-measure.py` (`cobertura-do-reflect`).
- **Problema:** `logger.ts`/`tracing.ts` são código morto (e `Logger.debug`/`info` escrevem em `console.log`/stdout, quebrando `stdio`, e `generateRequestId` usa `Math.random()`); `recordMetrics` sempre marca `fromCache=false`, `resetMetrics()` não zera `lastMetricsLog` e é chamado a cada nova conexão SSE; faltam correlation ID, métricas RED por tool, audit log de 401 e health check real de KV.
- **Mitigação:** Direcionar `Logger` para `stderr` em Node, usar `crypto.randomUUID()`, propagar `RequestContext` por requisição, corrigir `recordMetrics`/`resetMetrics` (sem resetar métricas globais por conexão SSE), adicionar audit log 401 e checagem de KV em `/health`.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

## Log de transicoes

- 2026-11-20T15:16:22Z - **raw** - criado via scripts/ops/ticket/create.py.
