---
status: completed
run_id: RUN-20261120-210540-tck-0025
ticket: TCK-0025
design: DES-0028
start_time: 2026-11-20T21:05:40Z
end_time: 2026-11-20T21:13:00Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
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
  - test/unit/observability.test.ts
  - test/unit/worker-rest-cloudflare.test.ts
  - test/unit/architecture-hygiene.test.ts
  - test/unit/worker-sse-kv-shutdown.test.ts
  - vitest.config.ts
  - .archagents/10-runbooks.md
test_result:
  status: pass
  summary: "59/59 targeted (5 files), 442/442 Vitest (31 files), V8 coverage 91.32% stmts / 83.57% branch / 93.25% funcs / 92.09% lines >= 85/80/85/85 ratchet, tsc + tsc.worker + build + build:worker + test:transport PASS (23 tools stdio & HTTP/SSE), criteria-check 4/4"
---
# RUN-20261120-210540-tck-0025 - TCK-0025 (`FND-0013`)

## Resumo executivo

Execução completa da remediação de observabilidade (`FND-0013` / `DES-0028`):

1. **`lib/infrastructure/logger.ts`**: todos os níveis (`debug`, `info`, `warn`, `error`) direcionados para `console.error` (`stderr`, zero escrita em `stdout`), proteção `typeof process !== "undefined"` para Cloudflare Workers, resolução dinâmica de `LOG_LEVEL` (`INFO` por padrão, `DEBUG` em `development`), `setLevel`/`getLevel` e fallback seguro em `JSON.stringify` para objetos circulares/`BigInt`.
2. **`lib/infrastructure/tracing.ts`**: `generateRequestId()` via Web Crypto (`globalThis.crypto.randomUUID()` / `getRandomValues()`, zero `Math.random()`, zero `node:crypto`), export `REQUEST_ID_HEADER = "X-Request-Id"`, e `extractRequestId` suportando `Headers` e `Record` com validação estrita `/^[A-Za-z0-9._:-]{1,128}$/`.
3. **Métricas RED e `cacheHits` (`lib/types/index.ts`, `lib/core/registry.ts`, `lib/core/tools.ts`, `lib/core/mcp-server.ts`)**: `executeTool` agora usa proxy `observedCache` para contar `cacheHits` reais sem engolir rejeições, agrega `ToolMetrics` por ferramenta (`getToolMetrics()`), `resetMetrics()` zera `lastMetricsLog` e `toolMetrics`, `createMCPServer()` não limpa mais métricas globais por sessão SSE e propaga `RequestContext`/`requestId`.
4. **Correlação HTTP/Worker, Audit Log 401, Health KV & SSE (`cli-http.ts`, `auth.ts`, `cloudflare.ts`, `worker.ts`, `sse.ts`)**: propagação de `X-Request-Id` em CLI HTTP/SSE e Cloudflare Worker (`fetch`), audit log estruturado `auth.unauthorized` sem vazamento de credenciais/query string, sonda KV com timeout limitado (`1000ms`, `200 ok`/`unconfigured` vs `503 degraded`) em `handleHealthCheck()`, e substituição de `console.log`/`console.error` ad-hoc em `sse.ts` por `sseLogger`.
5. **Testes, Ratchet & Runbook**: criada `test/unit/observability.test.ts`, atualizados `worker-rest-cloudflare.test.ts`, `architecture-hygiene.test.ts` e `worker-sse-kv-shutdown.test.ts`, thresholds elevados para `85/85/80/85` em `vitest.config.ts`, e `.archagents/10-runbooks.md` atualizado.

## Evidências

- `commands.log`: `59/59` testes direcionados (`5` arquivos), `442/442` testes totais (`31` arquivos), V8 `91.32% Stmts | 83.57% Branch | 93.25% Funcs | 92.09% Lines`, `tsc` + `tsc.worker` exit `0`, `build` + `build:worker` + `test:transport` exit `0`, `criteria-check.py` `4/4 pass`.
- `diff.txt`: 1752 linhas.
