---
status: completed
run_id: RUN-20261120-174045-tck-0019
ticket: TCK-0019
design: DES-0018
start_time: 2026-11-20T17:40:45Z
end_time: 2026-11-20T17:44:36Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/shared/utils/timeout.ts
  - lib/core/search-providers.ts
  - lib/core/intelligence.ts
  - lib/tools/legal.ts
  - test/unit/legal-timeouts-intelligence.test.ts
  - .archagents/05-integrations.md
test_result:
  status: pass
  summary: "14/14 novos testes (legal-timeouts-intelligence.test.ts), 85/85 (legal-timeouts + search + intelligence), 371/371 Vitest (23 arquivos), tsc + tsc.worker TYPECHECK_OK, build + build:worker BUILD_OK, npm run test:transport PASS (101 stdio calls + HTTP/SSE), criteria-check 3/3 pass"
---
# RUN-20261120-174045-tck-0019 - TCK-0019

## Resumo executivo

- Criado utilitário folha `lib/shared/utils/timeout.ts` (`isAbortOrTimeoutError`, `createTimeoutController`, `raceWithTimeoutAndSignal`) compatível com Node e Cloudflare Workers, garantindo `clearTimeout`, remoção de listeners `abort` em `finally` e proteção contra `UnhandledPromiseRejection`.
- Endurecido `lib/core/search-providers.ts`: adicionado `SearchOptions { signal?, timeoutMs? }` em `SearchProvider`, `TavilyProvider`, `PerplexityProvider` e `searchWithFallback`, impondo `TIMEOUTS.SEARCH_REQUEST_MS` (`10s` default) e abortamento prévio/em voo sem vazar timers.
- Endurecido `lib/core/intelligence.ts`: `executeIntelligence` limpa seu timer de `25s` em `finally`, captura `TimeoutError` retornando `{ ok: false, error }` com CNPJ mascarado nos logs, e propaga `AbortController.signal` para interromper o scheduler concorrente (`executeWithConcurrencyLimit`) e as buscas em voo nos providers.
- Endurecido `lib/tools/legal.ts`: `executeDatajud` e `executeBnmp` passam `signal` com `TIMEOUTS.HTTP_REQUEST_MS` (`timed_out: true` no fallback de BNMP); `executeProcurados` aplica timeout por página e deadline agregado (`Math.max(HTTP_REQUEST_MS, INTELLIGENCE_TOTAL_MS)`) e elimina o falso negativo silencioso (`ok: false` se todas as 13 páginas falharem; `status: "INCONCLUSIVE"` com `partial: true` se houver falhas parciais sem match; `status: "NOT_FOUND"` somente com `pages_failed === 0`).
- Adicionada suíte `test/unit/legal-timeouts-intelligence.test.ts` (14 testes) e atualizada `.archagents/05-integrations.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/legal-timeouts-intelligence.test.ts test/unit/search.test.ts test/unit/intelligence.test.ts` | `passed` | 3 arquivos, **85/85** passed (`14` novos) | PASS |
| `npm test` | `passed` | **23/23** arquivos, **371/371** passed (`3.56s`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `npm run test:transport` | `PASS: both transports expose the expected catalogue` | 23 tools em `stdio` + HTTP/SSE (`101` chamadas `stdio`) | PASS |
| `criteria-check.py --ticket TCK-0019 --json` | `verdict: pass` | 3/3 critérios pass | PASS |
