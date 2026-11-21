---
status: completed
run_id: RUN-20261120-193311-tck-0028
ticket: TCK-0028
design: DES-0024
start_time: 2026-11-20T19:33:11Z
end_time: 2026-11-20T19:37:50Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/core/intelligence.ts
  - lib/tools/core.ts
  - test/unit/intelligence.test.ts
  - test/unit/concurrency.test.ts
  - test/unit/deduplication.test.ts
  - test/unit/sse.test.ts
  - test/unit/dependency-hygiene.test.ts
  - vitest.config.ts
  - .archagents/08-conventions.md
test_result:
  status: pass
  summary: "68/68 targeted (5 files, 734ms), npm run test:coverage PASS (76.62% stmts, 70.17% branches, 75.66% funcs, 78.26% lines vs ratchet 74/68/73/76), 401/401 Vitest (26 files, 1.73s), tsc + tsc.worker + build + build:worker + test:transport PASS, criteria-check 4/4"
---
# RUN-20261120-193311-tck-0028 - TCK-0028 (`TCK-0026b`)

## Resumo executivo

- **`lib/core/intelligence.ts` e `lib/tools/core.ts`:** Exportadas as funções reais (`executeWithConcurrencyLimit`, `normalizeCnpj`, `containsCnpj`, `filterResultsByCnpj` e `deduplicate`, `getPendingRequestCount`, `lookup`). Em `lib/tools/core.ts`, `deduplicate` passou a usar `TIMEOUTS.DEDUP_TIMEOUT_MS`, `ReturnType<typeof setTimeout>`, `.unref?.()` e comparação `pendingRequests.get(key)?.promise === promise` para evitar corrida em expiração tardia.
- **Refatoração dos 4 arquivos de teste unitário (`test/unit/{intelligence,concurrency,deduplication,sse}.test.ts`):** Removidas todas as implementações duplicadas locais; cada suíte agora importa e exercita os módulos reais de `lib/` (`lib/core/intelligence.ts`, `lib/tools/core.ts`, `lib/workers/sse.ts`, `lib/adapters/cli-http.ts`), utilizando `vi.useFakeTimers()` (`vi.restoreAllMocks()` antes de `vi.useRealTimers()` no `afterEach`), e adicionando testes para `filterResultsByCnpj`, `AbortSignal` em `executeWithConcurrencyLimit`, `lookup` com `MemoryCache` + deduplicação de `fetch`, `handleSSEEndpoint` e monitor real de sessões de `createCliHttpApp`.
- **Guarda, Ratchet e Documentação (`test/unit/dependency-hygiene.test.ts`, `vitest.config.ts`, `.archagents/08-conventions.md`):** Adicionado teste estático anti-duplicação, elevado o ratchet de cobertura para `76% lines / 73% functions / 68% branches / 74% statements` com medição real `78.26% / 75.66% / 70.17% / 76.62%`, e corrigida a referência `vitest.config.ts:L1-L46` em `08-conventions.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/sse.test.ts test/unit/concurrency.test.ts test/unit/deduplication.test.ts test/unit/intelligence.test.ts test/unit/dependency-hygiene.test.ts` | `passed` | **5/5** arquivos, **68/68** testes (`734ms`) | PASS |
| `npm run test:coverage` | `passed` | **26/26** (`401/401`), `76.62%` stmts / `70.17%` branches / `75.66%` funcs / `78.26%` lines >= ratchet `74/68/73/76` (`1.93s`) | PASS |
| `npm test` | `passed` | **26/26** arquivos, **401/401** testes (`1.73s`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport` | Exit `0` + `PASS` | `TYPECHECK_OK` + `BUILD_OK` + `PASS: both transports expose the expected catalogue` | PASS |
| `criteria-check.py --root "$WT" --ticket TCK-0028 --json` | `verdict: pass` | **4/4** critérios `pass` | PASS |
