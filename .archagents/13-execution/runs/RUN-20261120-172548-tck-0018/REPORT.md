---
status: completed
run_id: RUN-20261120-172548-tck-0018
ticket: TCK-0018
design: DES-0017
start_time: 2026-11-20T17:25:48Z
end_time: 2026-11-20T17:30:58Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/core/http-client.ts
  - test/unit/http-client.test.ts
  - .archagents/05-integrations.md
test_result:
  status: pass
  summary: "31/31 novos testes (http-client.test.ts), 48/48 (http-client + circuit-breaker), 357/357 Vitest (22 arquivos), tsc + tsc.worker TYPECHECK_OK, build + build:worker BUILD_OK, npm run test:transport PASS (101 stdio calls + HTTP/SSE), criteria-check 3/3 pass"
---
# RUN-20261120-172548-tck-0018 - TCK-0018

## Resumo executivo

- Refatorado `lib/core/http-client.ts` para particionar instâncias de `CircuitBreaker` por origem (`getUpstreamKey`), com teto `MAX_CIRCUIT_BREAKERS = 100` e eviction LRU/FIFO priorizando `CLOSED`, além de helpers `getCircuitBreaker`, `getCircuitBreakerMetrics` e `resetCircuitBreakers`.
- Corrigido o circuit breaker inoperante sinalizando falhas transientes via `TransientHttpError` dentro de `breaker.execute(...)` (cobrindo `RETRY_STATUS_CODES` `[429, 500, 502, 503, 504]`, status `>= 500`, timeouts e erros de rede, e erros de parsing), preservando 4xx não-429 (`400`/`401`/`403`/`404`) sem abrir o disjuntor e sem retry.
- Garantida limpeza de timers em bloco `finally` (`clearTimeout(timeoutId)`), formatação dinâmica de erro de timeout (`formatTimeoutMessage`), Equal Jitter (`calculateBackoffDelayMs`) e short-circuit imediato de retries quando o disjuntor abre.
- Adicionada suíte em `test/unit/http-client.test.ts` (31 testes) e documentada a resiliência HTTP em `.archagents/05-integrations.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/http-client.test.ts test/unit/circuit-breaker.test.ts` | `passed` | 2 arquivos, 48/48 passed (`3.44s`) | PASS |
| `npm test` | `passed` | 22 arquivos, 357/357 passed (`3.55s`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `npm run test:transport` | `PASS: both transports expose the expected catalogue` | 23 tools em `stdio` + HTTP/SSE (`101` chamadas `stdio`) | PASS |
| `criteria-check.py --ticket TCK-0018 --json` | `verdict: pass` | 3/3 critérios pass | PASS |
