---
id: DES-0021-playbook
created_at: 2026-11-20T18:47:22Z
status: approved
design: DES-0021
ticket: TCK-0020
approved_at: 2026-11-20T18:47:22Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 6
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: ops/
branch_name: bugfix/TCK-0020-sse-lifecycle-kv-ttl-graceful-shutdown
commit_per_step: false
commit_message_format: "[TCK-0020] passo N/6: <titulo>"
---
# Playbook - DES-0021

**Ticket:** TCK-0020
**Objetivo:** Corrigir ciclo de vida SSE no Worker, expiracao e bucketizacao em KV, higiene de timer do RateLimiter e graceful shutdown no CLI.

## Pre-requisitos

- [x] Branch isolado `bugfix/TCK-0020-sse-lifecycle-kv-ttl-graceful-shutdown` na worktree `.worktrees/audit-remediation`.
- [x] Worktree `$MAIN` intacta e fora de qualquer escrita.

## Modo dry-run

`/ops-execute DES-0021 --dry-run`

## Passos

1. **Passo 1/6 — Tipos Cloudflare, `KVCache` e `RateLimiter`:** Atualizar `KVNamespace.put` e `Env.MCP_TRUST_X_FORWARDED_FOR` em `lib/adapters/cloudflare.ts`; adicionar `{ expirationTtl }` (`>= 60s`) e `try/catch` de `JSON.parse` em `lib/core/cache.ts`; adicionar alias `dispose()` em `lib/infrastructure/rate-limiter.ts`.
2. **Passo 2/6 — Rate limit KV no Worker (`lib/workers/rate-limit.ts`):** Tornar `TIMEOUTS.RATE_LIMIT_WINDOW_MS` dinâmico, exportar `extractClientIdentifier` ignorando `X-Forwarded-For` por padrão, adotar janela fixa `rate_limit:<ip>:<bucket>` com `{ expirationTtl }` `>= 60` e documentar limites de consistência eventual.
3. **Passo 3/6 — Ciclo de vida SSE no Worker (`lib/workers/sse.ts`, `lib/workers/worker.ts`):** Propagar `ctx`, substituir `TransformStream` por `ReadableStream<Uint8Array>` (`highWaterMark: 16`) com `cleanup()` síncrono + `finally { resolveDone(); }` em `timeout`/`abort`/`cancel()`/erro, descarte de ping sob backpressure (`desiredSize <= 0`) e `ctx.waitUntil(donePromise)`.
4. **Passo 4/6 — Graceful shutdown e ordem de middlewares HTTP no CLI (`lib/adapters/cli-http.ts`, `lib/adapters/cli.ts`):** Reordenar `express.json` pós-segurança + handler JSON `400`/`413`, tornar `closeAll()` idempotente, exportar `createGracefulShutdown` e unificar `SIGINT`/`SIGTERM` capturando `http.Server` em `cli.ts`.
5. **Passo 5/6 — Documentação operacional (`wrangler.toml`, `.archagents/02-architecture.md`) e suíte unitária (`test/unit/worker-sse-kv-shutdown.test.ts`):** Cobrir SSE heartbeat/timeout/abort/cancel, `KVCache` TTL/corrupção, `checkRateLimit` spoofing/janela fixa, `RateLimiter` `.unref()`/`dispose()`, `createGracefulShutdown` e ordem `Host`/`Origin` vs JSON.
6. **Passo 6/6 — Verificação completa e review adversarial:** Executar `vitest`, `npm test`, `tsc` (Node + Worker), `build` + `build:worker`, `npm run test:transport`, `criteria-check.py`, `verify-run.py`, revisor `self` independente e `pipeline-judge.py`.

## Criterios de sucesso do playbook

- [x] Acceptance do ticket passa integralmente (`criteria-check.py` 5/5).
- [x] Typecheck Node + Worker, builds e `npm run test:transport` passam sem regressão.

## Log de execucoes

- `2026-11-20T18:52:40Z` — `RUN-20261120-184805-tck-0020` (`live`): 6/6 passos; **rejected** em `VER-20261120-190038-tck-0020` (deadlock de `TransformStream`/`writer.abort()` sob backpressure).
- `2026-11-20T19:02:37Z` — `RUN-20261120-190100-tck-0020-r2` (`live`, iteração 2): migrado `lib/workers/sse.ts` para `ReadableStream<Uint8Array>` + `dropOnBackpressure` + `NaN` TTL guard em `lib/core/cache.ts`; **91/91** alvo, **398/398** Vitest, `tsc` + `tsc.worker` + `build` + `build:worker` + `test:transport` + `criteria-check.py` (`5/5`) aprovados.
