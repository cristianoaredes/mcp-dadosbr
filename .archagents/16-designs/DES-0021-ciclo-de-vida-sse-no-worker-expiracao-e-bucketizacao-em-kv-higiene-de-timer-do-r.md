---
id: DES-0021
slug: ciclo-de-vida-sse-no-worker-expiracao-e-bucketizacao-em-kv-higiene-de-timer-do-r
title: "Ciclo de vida SSE no Worker, expiracao e bucketizacao em KV, higiene de timer do RateLimiter e graceful shutdown no CLI"
created_at: 2026-11-20T18:47:22Z
status: approved
ticket: TCK-0020
type: design
scope_files_new:
  - test/unit/worker-sse-kv-shutdown.test.ts
scope_files_modified:
  - lib/workers/sse.ts
  - lib/workers/worker.ts
  - lib/workers/rate-limit.ts
  - lib/adapters/cloudflare.ts
  - lib/core/cache.ts
  - lib/infrastructure/rate-limiter.ts
  - lib/adapters/cli-http.ts
  - lib/adapters/cli.ts
  - wrangler.toml
  - .archagents/02-architecture.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0021-playbook.md
acceptance_delta: unchanged
---
# DES-0021 - Ciclo de vida SSE no Worker, expiracao e bucketizacao em KV, higiene de timer do RateLimiter e graceful shutdown no CLI

## Problema

A inspeção da base (`FND-0008`) identificou quatro falhas de confiabilidade nos transportes e persistência em memória/KV:
1. Em `lib/workers/sse.ts:L60-L199`, o IIFE assíncrono agenda `pingInterval` (`L103`) e `timeoutHandle` (`L154`) sem bloqueio e cai imediatamente no `finally` (`L188-L198`), cancelando ambos os timers na abertura do stream e deixando o `writer` órfão sem escutar `request.signal` / `writer.closed`.
2. Em `lib/adapters/cli.ts:L112-L137`, `app.listen(...)` descarta o `http.Server`, registra dois listeners em `SIGTERM`, nunca drena SSE em `SIGINT`, e executa `process.exit(0)` imediato sem aguardar `server.close()`. Adicionalmente (`lib/adapters/cli-http.ts:L211`), `express.json({ limit: "1mb" })` roda antes dos middlewares de headers defensivos e `Host`/`Origin` (`TCK-0015` Nota 1).
3. Em `lib/infrastructure/rate-limiter.ts`, apesar de `.unref?.()` e `destroy()` existirem desde `TCK-0017`, falta o alias `dispose()` citado em `FND-0008` e testes unitários dedicados de ciclo de vida.
4. Em `lib/core/cache.ts:L128-L147` e `lib/workers/rate-limit.ts:L9,L36-L104`, `KVCache.set` e `checkRateLimit` gravam em Cloudflare KV sem `expirationTtl`, `checkRateLimit` congela `TIMEOUTS.RATE_LIMIT_WINDOW_MS` no boot e aceita `X-Forwarded-For` forjável por padrão, e `wrangler.toml` aponta `MCP_CACHE` e `MCP_KV` para o mesmo namespace ID sem documentação operacional dos limites de consistência eventual.

## Threat & Reliability Model

| ID | Risco / Ameaça | Vetor | Contramedida | Risco Residual |
|---|---|---|---|---|
| R1 | Stream SSE sem heartbeat/timeout ou com timer vazado | `finally` do IIFE limpa timers na abertura ou cliente fecha sem abort | `ReadableStream<Uint8Array>` (`highWaterMark: 16`) com `cleanup()` síncrono/idempotente em `timeout`, `request.signal` abort, `cancel()` ou erro, e `finally { resolveDone(); }` em `ctx.waitUntil(donePromise)` | Comportamento real de Workers em edge (*a confirmar* em deploy) |
| R2 | Cliente lento / backpressure bloqueando timeout SSE | `TransformStream` + `writer.abort()` trava esperando drenagem do consumidor | `ReadableStreamDefaultController` síncrono (`close`/`error`) sem await em consumidor + `dropOnBackpressure` descarta heartbeats com `desiredSize <= 0` | — |
| R3 | Queda abrupta em `SIGTERM`/`SIGINT` no CLI HTTP+SSE | `process.exit(0)` imediato sem drenar `http.Server`/SSE/MCP | `createGracefulShutdown` idempotente: `httpContext.closeAll()` → `server.close()` + `closeIdleConnections?.()` → `mcpServer.close()` → `cache.clear()`, com force-timeout 5s `.unref?.()` | Conexões HTTP presas além de 5s sofrem exit com código `1` |
| R4 | Bypass/DoS por `X-Forwarded-For` forjado e chaves KV eternas | Falta de `CF-Connecting-IP` ou `put()` sem `expirationTtl` | Ignora `X-Forwarded-For` salvo `MCP_TRUST_X_FORWARDED_FOR === "true"`; valida formato do identificador; fixa `expirationTtl >= 60` (`MIN_KV_EXPIRATION_TTL_SECONDS`) e chaves por janela fixa `rate_limit:<ip>:<bucket>` | KV é eventualmente consistente (não atômico para bursts concorrentes entre POPs; documentado uso futuro de Rate Limiting binding / Durable Objects) |
| R5 | Payload JSON malformado antes de `Host`/`Origin` ou quebrando parse KV | `express.json()` antes da checagem de segurança; `JSON.parse` sem `try/catch` em `KVCache.get` / `checkRateLimit` | `express.json` movido após headers defensivos + `Host`/`Origin` com error handler JSON `400`/`413`; `try/catch` defensivo em KV | — |
| R6 | Evento loop preso por timer órfão no `RateLimiter` | `setInterval` sem `.unref()` / cleanup | `.unref?.()` + `destroy()` + alias `dispose()` testados | — |

## Solucao

- **`lib/adapters/cloudflare.ts`**: estender `KVNamespace.put` com opções (`expiration`, `expirationTtl`, `metadata`) compatíveis com `@cloudflare/workers-types`; adicionar `MCP_TRUST_X_FORWARDED_FOR?: string` em `Env`.
- **`lib/core/cache.ts`**: exportar `MIN_KV_EXPIRATION_TTL_SECONDS = 60` e `KVPutOptions`; passar `{ expirationTtl: Math.max(60, Math.ceil(this.ttl / 1000)) }` em `KVCache.set` e proteger `JSON.parse` em `KVCache.get`.
- **`lib/infrastructure/rate-limiter.ts`**: adicionar alias `dispose(): void { this.destroy(); }`.
- **`lib/workers/rate-limit.ts`**: ler `TIMEOUTS.RATE_LIMIT_WINDOW_MS` dinamicamente por chamada; exportar `extractClientIdentifier(request, env)` (prioriza `CF-Connecting-IP`, só aceita `X-Forwarded-For` se `MCP_TRUST_X_FORWARDED_FOR === "true"`, valida formato); usar chave em janela fixa `rate_limit:${clientIP}:${windowBucket}` com `expirationTtl = Math.max(60, Math.ceil(windowMs / 1000) * 2)`; proteger `JSON.parse` e documentar trade-off de consistência eventual do KV em JSDoc.
- **`lib/workers/sse.ts` e `lib/workers/worker.ts`**: propagar `ctx?: ExecutionContext` de `fetch` → `routeRequest` → `handleSSEEndpoint`; substituir `TransformStream` por `ReadableStream<Uint8Array>` (`highWaterMark: 16`) com `cleanup(reason)` síncrono e `finally { resolveDone(); }` acoplado a `ctx.waitUntil(donePromise)`, `cancel()`, `request.signal` abort, descarte de heartbeat sob backpressure (`dropOnBackpressure`), pings em `TIMEOUTS.PING_INTERVAL_MS` e timeout em `TIMEOUTS.SSE_CONNECTION_MS` sem `finally` prematuro.
- **`lib/adapters/cli-http.ts` e `lib/adapters/cli.ts`**: reordenar `express.json` para depois dos headers defensivos e `Host`/`Origin` com handler JSON `400`/`413`; tornar `closeAll()` idempotente; exportar `createGracefulShutdown`; capturar `http.Server` em `cli.ts`, remover `SIGTERM` duplicado e unificar `SIGINT`/`SIGTERM` mantendo intacta a linha `started on HTTP+SSE transport (port ${port})` em `stderr`.
- **`wrangler.toml` e `.archagents/02-architecture.md`**: documentar separação por prefixo, TTL mínimo `>= 60s`, consistência eventual do KV, lifecycle SSE e graceful shutdown (marcando comportamento runtime em produção como *a confirmar*).

## Mudancas

- `lib/adapters/cloudflare.ts`
- `lib/core/cache.ts`
- `lib/infrastructure/rate-limiter.ts`
- `lib/workers/rate-limit.ts`
- `lib/workers/sse.ts`
- `lib/workers/worker.ts`
- `lib/adapters/cli-http.ts`
- `lib/adapters/cli.ts`
- `wrangler.toml` (somente comentários operacionais; zero mudança de IDs/bindings)
- `.archagents/02-architecture.md`
- `test/unit/worker-sse-kv-shutdown.test.ts` (novo)

## Criterios de sucesso

- [ ] `npx vitest run test/unit/worker-sse-kv-shutdown.test.ts test/unit/rate-limiter.test.ts test/unit/cache.test.ts test/unit/cli-http-security.test.ts test/unit/worker-auth-oauth-cors.test.ts`
- [ ] `npm test` (0 falhas)
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit`
- [ ] `npm run build && npm run build:worker`
- [ ] `npm run test:transport` (`PASS` em `stdio` e `HTTP+SSE`)
