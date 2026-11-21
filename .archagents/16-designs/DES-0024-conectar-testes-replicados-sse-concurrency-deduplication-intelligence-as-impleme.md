---
id: DES-0024
slug: conectar-testes-replicados-sse-concurrency-deduplication-intelligence-as-impleme
title: "Conectar testes replicados (sse, concurrency, deduplication, intelligence) as implementacoes reais em lib/ com fake timers"
created_at: 2026-11-20T19:32:27Z
status: approved
ticket: TCK-0028
type: design
scope_files_new: []
scope_files_modified:
  - lib/core/intelligence.ts
  - lib/tools/core.ts
  - test/unit/intelligence.test.ts
  - test/unit/concurrency.test.ts
  - test/unit/deduplication.test.ts
  - test/unit/sse.test.ts
  - test/unit/dependency-hygiene.test.ts
  - vitest.config.ts
  - .archagents/08-conventions.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0024-playbook.md
acceptance_delta: unchanged
---
# DES-0024 - Conectar testes replicados (sse, concurrency, deduplication, intelligence) as implementacoes reais em lib/ com fake timers

## Problema

Em `FND-0014` (`TCK-0026b`), quatro arquivos de teste unitário (`test/unit/sse.test.ts`, `test/unit/concurrency.test.ts`, `test/unit/deduplication.test.ts`, `test/unit/intelligence.test.ts`) duplicam ou simulam implementações localmente em vez de importar e exercitar as funções reais em `lib/` (`handleSSEEndpoint`, `createCliHttpApp`, `executeWithConcurrencyLimit`, `normalizeCnpj`, `containsCnpj`, `filterResultsByCnpj`, `deduplicate`, `lookup`), além de `concurrency.test.ts` e `deduplication.test.ts` ainda recorrerem a timers reais.

## Design & Riscos

| ID | Risco / Lacuna | Contramedida |
|---|---|---|
| R1 | Réplicas locais mascarando regressões reais | Exportar as funções reais de `lib/core/intelligence.ts` e `lib/tools/core.ts` sem quebrar contratos e reescrever os 4 arquivos de teste importando diretamente `../../lib/...`, removendo helpers duplicados |
| R2 | Corrida de evicção tardia em `deduplicate()` (`lib/tools/core.ts`) | Usar `TIMEOUTS.DEDUP_TIMEOUT_MS` e comparar `pendingRequests.get(key)?.promise === promise` antes de deletar no timeout ou `finally`, com `.unref?.()` no timer e `ReturnType<typeof setTimeout>` |
| R3 | Sleeps reais / flakiness em `concurrency.test.ts`, `deduplication.test.ts` e `sse.test.ts` | Usar `vi.useFakeTimers()` + `vi.setSystemTime(...)`, `vi.advanceTimersByTimeAsync(...)`, `afterEach` chamando `ctx.closeAll()` / `vi.restoreAllMocks()` **antes** de `vi.useRealTimers()` |
| R4 | Reintrodução futura de réplicas locais nos testes | Adicionar guarda estática em `test/unit/dependency-hygiene.test.ts` e elevar thresholds de `vitest.config.ts` conforme nova medição real |

## Mudancas

- `lib/core/intelligence.ts`: exportar `executeWithConcurrencyLimit`, `normalizeCnpj`, `containsCnpj`, `filterResultsByCnpj`.
- `lib/tools/core.ts`: usar `TIMEOUTS.DEDUP_TIMEOUT_MS`, `ReturnType<typeof setTimeout>`, `.unref?.()`, guarda `pendingRequests.get(key)?.promise === promise`, exportar `deduplicate`, `getPendingRequestCount` e `lookup`.
- `test/unit/intelligence.test.ts`, `test/unit/concurrency.test.ts`, `test/unit/deduplication.test.ts`, `test/unit/sse.test.ts`: conectar aos módulos reais + cobertura de `filterResultsByCnpj`, `AbortSignal`, `lookup`, `handleSSEEndpoint` e `createCliHttpApp` session monitor com fake timers.
- `test/unit/dependency-hygiene.test.ts`, `vitest.config.ts` (ratchet atualizado), `.archagents/08-conventions.md` (`L1-L46` e política `TCK-0028`).

## Criterios de sucesso

- [ ] `npx vitest run test/unit/sse.test.ts test/unit/concurrency.test.ts test/unit/deduplication.test.ts test/unit/intelligence.test.ts test/unit/dependency-hygiene.test.ts`
- [ ] `npm run test:coverage`
- [ ] `npm test`
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport && echo FULL_OK`
