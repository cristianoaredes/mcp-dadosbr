---
status: completed
run_id: RUN-20261120-184805-tck-0020
ticket: TCK-0020
design: DES-0021
start_time: 2026-11-20T18:48:05Z
end_time: 2026-11-20T18:52:40Z
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
  summary: "12/12 worker-sse-kv-shutdown.test.ts (87/87 em 5 arquivos alvo), 394/394 Vitest (26 arquivos), tsc + tsc.worker TYPECHECK_OK, build + build:worker BUILD_OK, npm run test:transport PASS, criteria-check 5/5 pass"
---
# RUN-20261120-184805-tck-0020 - TCK-0020

## Resumo executivo

- **`lib/adapters/cloudflare.ts` e `lib/core/cache.ts`**: Estendida `KVNamespace.put` com `options?: KVPutOptions`; exportado `MIN_KV_EXPIRATION_TTL_SECONDS = 60` e aplicado `{ expirationTtl: Math.max(60, Math.ceil(this.ttl / 1000)) }` em `KVCache.set`, com proteção `try/catch` para payloads inválidos em `KVCache.get` e opt-in `MCP_TRUST_X_FORWARDED_FOR` em `Env`.
- **`lib/infrastructure/rate-limiter.ts`**: Mantido `.unref?.()` e `destroy()` de `TCK-0017` e adicionado alias `dispose(): void`.
- **`lib/workers/rate-limit.ts`**: Removido `RATE_LIMIT_WINDOW` congelado no módulo (`TIMEOUTS.RATE_LIMIT_WINDOW_MS` lido dinamicamente), exportado `extractClientIdentifier` (prioriza `CF-Connecting-IP`, ignora `X-Forwarded-For` salvo opt-in explícito, valida formato), adotadas chaves em janela fixa `rate_limit:<ip>:<bucket>` com `{ expirationTtl }` `>= 60` e proteção de `JSON.parse` + documentação sobre consistência eventual do KV.
- **`lib/workers/sse.ts` e `lib/workers/worker.ts`**: Propagado `ctx?: ExecutionContext` de `fetch` → `routeRequest` → `handleSSEEndpoint`; eliminada a limpeza prematura de `pingInterval`/`timeoutHandle` no `finally`; implementada máquina idempotente `cleanup(reason)` acionada em timeout (usando `writer.abort` sob backpressure), `request.signal` abort, `writer.closed` e erro de escrita com `.unref?.()` e `ctx.waitUntil(donePromise)`.
- **`lib/adapters/cli-http.ts` e `lib/adapters/cli.ts`**: Reordenado `express.json({ limit: "1mb" })` para rodar após headers defensivos e validação `Host`/`Origin` com error handler JSON `400`/`413` (`TCK-0015` Nota 1); tornado `closeAll()` idempotente; exportado `createGracefulShutdown` e unificado `SIGINT`/`SIGTERM` em `cli.ts` drenando `http.Server`, sessões SSE, MCP server e cache preservando log de inicialização para `test:transport`.
- **Documentação e Testes**: Adicionados comentários operacionais de KV em `wrangler.toml` (sem alterar IDs/bindings), documentação em `.archagents/02-architecture.md` (marcando edge KV runtime como *a confirmar*) e suíte unitária `test/unit/worker-sse-kv-shutdown.test.ts` (`12` testes).

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/worker-sse-kv-shutdown.test.ts test/unit/rate-limiter.test.ts test/unit/cache.test.ts test/unit/cli-http-security.test.ts test/unit/worker-auth-oauth-cors.test.ts` | `passed` | **5/5** arquivos, **87/87** testes (`351ms`) | PASS |
| `npm test` | `passed` | **26/26** arquivos, **394/394** testes (`3.53s`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `npm run test:transport` | `PASS: both transports expose the expected catalogue` | `stdio` (`101` chamadas) + `HTTP/SSE` | PASS |
| `criteria-check.py --root "$WT" --ticket TCK-0020 --json` | `verdict: pass` | **5/5** critérios `pass` | PASS |
