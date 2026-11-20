---
status: completed
run_id: RUN-20261120-190100-tck-0020-r2
ticket: TCK-0020
design: DES-0021
start_time: 2026-11-20T19:01:00Z
end_time: 2026-11-20T19:02:37Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/adapters/cloudflare.ts
  - lib/core/cache.ts
  - lib/infrastructure/rate-limiter.ts
  - lib/workers/rate-limit.ts
  - lib/workers/sse.ts
  - lib/workers/worker.ts
  - lib/adapters/cli-http.ts
  - lib/adapters/cli.ts
  - wrangler.toml
  - .archagents/02-architecture.md
  - test/unit/worker-sse-kv-shutdown.test.ts
test_result:
  status: pass
  summary: "16/16 worker-sse-kv-shutdown.test.ts (91/91 em 5 arquivos alvo), 398/398 Vitest (26 arquivos), tsc + tsc.worker TYPECHECK_OK, build + build:worker BUILD_OK, npm run test:transport PASS, criteria-check 5/5 pass"
---
# RUN-20261120-190100-tck-0020-r2 - TCK-0020 (Iteracao 2 — Verify-Fix Loop)

## Resumo executivo

- **Correção do defeito bloqueante de R1 (`VER-20261120-190038-tck-0020`, verificador `104583b7`):**
  - **`lib/workers/sse.ts`**: Substituído `TransformStream` + `writer.abort(...)` por `new ReadableStream<Uint8Array>({ start, cancel }, { highWaterMark: 16 })`, com `cleanup(reason)` síncrono encapsulado em `try { ... } finally { resolveDone(); }` para que `ctx.waitUntil(donePromise)` e os timers sempre encerrem imediatamente mesmo sob backpressure total (`0` leituras). Adicionado `dropOnBackpressure: true` nos heartbeats (`desiredSize <= 0`) eliminando empilhamento e spam de `SSE write error`.
  - **`lib/core/cache.ts`**: Guardado `effectiveTtlMs` contra `this.ttl` `NaN`/inválido em `KVCache.set` (mantendo `expirationTtl = 60` e timestamp numérico válido em `expires`).
  - **Documentação e Testes**: Atualizados `DES-0021`, `DES-0021-playbook.md` e `.archagents/02-architecture.md`; adicionados 4 testes de backpressure/pré-abort em `handleSSEEndpoint` (`0` leituras + timeout, `1` leitura + estouro de pings + timeout sem `console.error`, `0` leituras + `request.signal` abort, sinal pré-abortado) e teste de `KVCache` com `NaN` TTL em `test/unit/worker-sse-kv-shutdown.test.ts` (`16` testes totais no arquivo).
- **Demais controles de R1 preservados integralmente:** `lib/adapters/cloudflare.ts`, `lib/infrastructure/rate-limiter.ts`, `lib/workers/rate-limit.ts`, `lib/workers/worker.ts`, `lib/adapters/cli-http.ts`, `lib/adapters/cli.ts` e `wrangler.toml`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/worker-sse-kv-shutdown.test.ts test/unit/rate-limiter.test.ts test/unit/cache.test.ts test/unit/cli-http-security.test.ts test/unit/worker-auth-oauth-cors.test.ts` | `passed` | **5/5** arquivos, **91/91** testes (`434ms`) | PASS |
| `npm test` | `passed` | **26/26** arquivos, **398/398** testes (`3.61s`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `npm run test:transport` | `PASS: both transports expose the expected catalogue` | `stdio` (`101` chamadas) + `HTTP/SSE` | PASS |
| `criteria-check.py --root "$WT" --ticket TCK-0020 --json` | `verdict: pass` | **5/5** critérios `pass` | PASS |
