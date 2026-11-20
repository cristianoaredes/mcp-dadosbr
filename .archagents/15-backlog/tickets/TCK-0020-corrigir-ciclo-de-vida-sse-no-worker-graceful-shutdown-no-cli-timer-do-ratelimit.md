---
id: TCK-0020
slug: corrigir-ciclo-de-vida-sse-no-worker-graceful-shutdown-no-cli-timer-do-ratelimit
title: "Corrigir ciclo de vida SSE no Worker, graceful shutdown no CLI, timer do RateLimiter e expiracao/atomicidade no KV"
source: audit
created_at: 2026-11-20T15:16:18Z
created_by: ops
updated_at: 2026-11-20T19:07:47Z
status: done
severity: medium
category: reliability
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0008
linked_designs:
  - DES-0021
linked_runs:
  - RUN-20261120-184805-tck-0020
  - RUN-20261120-190100-tck-0020-r2
linked_verifications:
  - VER-20261120-190038-tck-0020
  - VER-20261120-190716-tck-0020
linked_docs:
  - .archagents/02-architecture.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/worker-sse-kv-shutdown.test.ts test/unit/rate-limiter.test.ts test/unit/cache.test.ts test/unit/cli-http-security.test.ts test/unit/worker-auth-oauth-cors.test.ts"
    expect: passed
  - check: "npm test"
    expect: passed
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
  - check: "npm run build && npm run build:worker && echo BUILD_OK"
    expect: BUILD_OK
  - check: "npm run test:transport"
    expect: "PASS: both transports expose the expected catalogue"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T18:47:30Z
---
# TCK-0020 - Corrigir ciclo de vida SSE no Worker, graceful shutdown no CLI, timer do RateLimiter e expiracao/atomicidade no KV

## Contexto

Originado por **FND-0008** (`reliability` / `medium`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/workers/sse.ts:L60-L199`, `lib/adapters/cli.ts:L157-L163`, `lib/adapters/cli.ts:L235`, `lib/adapters/cli.ts:L249-L254`, `lib/infrastructure/rate-limiter.ts:L26`, `lib/workers/rate-limit.ts:L36-L39`, `lib/workers/rate-limit.ts:L50-L104`, `lib/core/cache.ts:L139-L147`, `wrangler.toml:L39-L45`, `wrangler.toml:L61-L68`.
- **Problema:** O bloco `finally` do IIFE em `handleSSEEndpoint` limpa `pingInterval` e `timeoutHandle` imediatamente após criá-los; `SIGTERM` no CLI chama `process.exit(0)` sem drenar `http.Server` nem SSE; `RateLimiter` vaza `setInterval` sem `.unref()`/`dispose()`; `checkRateLimit` faz `get`→`put` sem atomicidade/TTL usando fallback `X-Forwarded-For` e `KVCache.set` grava sem `expirationTtl`.
- **Mitigação:** Manter timers SSE até o fechamento real do stream, unificar graceful shutdown no CLI drenando `server.close()`/sessões, adicionar `.unref()`/`dispose()` no `RateLimiter` e definir `expirationTtl` e identificação confiável de cliente no KV.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

Evidências pré-fix verificadas na revisão de trabalho (`ddc867a`):

1. **`lib/workers/sse.ts:L60-L199`:** O IIFE assíncrono agenda `pingInterval = setInterval(...)` (`L103`) e `timeoutHandle = setTimeout(...)` (`L154`) de forma não bloqueante e entra imediatamente no `finally` (`L188-L198`), executando `clearInterval(pingInterval)` e `clearTimeout(timeoutHandle)` logo após o setup inicial. Nenhum heartbeat nem timeout chega a disparar, e não há limpeza via `request.signal` / `writer.closed` / `ctx.waitUntil`.
2. **`lib/adapters/cli.ts:L112-L122,L132-L137`:** `httpContext.app.listen(port, host, ...)` descarta o `http.Server` retornado (`L118`); há registro duplicado de `SIGTERM` (`L112` e `L137`); e `cleanup()` (`L132-L134`) chama `process.exit(0)` imediatamente sem drenar `server.close()`, sessões SSE (em `SIGINT`), servidor MCP ou cache. Adicionalmente (`lib/adapters/cli-http.ts:L211`), `express.json()` roda antes de `Host`/`Origin` e dos headers defensivos.
3. **`lib/infrastructure/rate-limiter.ts:L128-L135`:** Embora `.unref?.()` e `destroy()` tenham sido adicionados em `TCK-0017`, falta alias `dispose(): void` (citado em `FND-0008`) e cobertura dedicada do ciclo de vida do timer em testes unitários.
4. **`lib/core/cache.ts:L7-L11,L128-L147`:** `KVNamespace.put` não aceita `options`, `KVCache.set` chama `this.kv.put(key, JSON.stringify(...))` sem `{ expirationTtl }`, e `KVCache.get` não trata JSON corrompido em `JSON.parse`.
5. **`lib/workers/rate-limit.ts:L9,L36-L39,L46-L104`:** `RATE_LIMIT_WINDOW = TIMEOUTS.RATE_LIMIT_WINDOW_MS` congela o valor na carga do módulo (`L9`); `checkRateLimit` aceita `X-Forwarded-For` forjável sem opt-in quando `CF-Connecting-IP` está ausente (`L36-L39`); `env.MCP_KV.put` persiste entrada única mutável sem `expirationTtl` (`L98-L104`) e compartilha o mesmo KV ID de `MCP_CACHE` em `wrangler.toml:L25-L69`.

Comando falsificador pré-fix:
- `npx vitest run test/unit/worker-sse-kv-shutdown.test.ts` (suíte inexistente antes do fix / falha ao validar timers SSE ativos após abertura, `expirationTtl >= 60`, bloqueio de bypass via `X-Forwarded-For` e dreno em `createGracefulShutdown`).

## Log de transicoes

- 2026-11-20T15:16:18Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T18:47:30Z - **noted** - body:falsifier (append): Registrar falsificador FND-0008 na triagem
- 2026-11-20T18:47:30Z - **triaged** - Triagem FND-0008 com falsificador e criterios machine-verifiable [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T18:48:05Z - **designed** - Design DES-0021 e playbook aprovados
- 2026-11-20T18:48:05Z - **executing** - Executando DES-0021 / RUN-20261120-184805-tck-0020
- 2026-11-20T18:53:07Z - **verifying** - Execucao concluida em RUN-20261120-184805-tck-0020 com 5/5 criteria-check e 394/394 Vitest; abrindo verificacao adversarial independente
- 2026-11-20T19:01:00Z - **executing** - Loop verify->execute: corrigir deadlock WHATWG TransformStream em lib/workers/sse.ts sob backpressure (verificador 104583b7)
- 2026-11-20T19:03:40Z - **verifying** - Iteracao 2 (RUN-20261120-190100-tck-0020-r2): deadlock SSE sob backpressure corrigido com ReadableStream + dropOnBackpressure; 398/398 Vitest + 5/5 criteria-check; abrindo verificacao adversarial R2
- 2026-11-20T19:07:47Z - **done** - TCK-0020 aprovado na R2 por verificador independente (44f03cf9) e julgado pelo pipeline-judge
