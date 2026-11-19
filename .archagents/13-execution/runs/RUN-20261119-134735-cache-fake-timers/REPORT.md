---
status: completed
run_id: RUN-20261119-134735-cache-fake-timers
ticket: TCK-0011
design: DES-0011
start_time: 2026-11-19T13:47:35Z
end_time: 2026-11-19T13:49:21Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - test/unit/cache.test.ts
test_result:
  status: pass
  summary: "37/37 testes em test/unit/cache.test.ts em 7ms com vi.useFakeTimers() e 0 setTimeout real; 286/286 na suíte completa e criteria-check 2/2 PASS"
---
# RUN-20261119-134735-cache-fake-timers - TCK-0011

## Resumo executivo

- Ativados `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))` no `beforeEach` e `vi.useRealTimers()` no `afterEach` dos blocos `MemoryCache` e `KVCache` em `test/unit/cache.test.ts`.
- Todas as 14 esperas `await new Promise(resolve => setTimeout(resolve, ms))` distribuídas nos 10 testes de TTL foram substituídas 1:1 por `vi.advanceTimersByTime(ms)`, preservando exatamente as janelas e asserções originais de TTL.
- Tempo de execução de `test/unit/cache.test.ts` caiu de ~1.120 ms para **7 ms** (37/37 testes aprovados), eliminando o flake sob contenção de CPU observado em `44517012490/job/135535524524`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| Ausência de `setTimeout` + uso de `useFakeTimers` | 0 ocorrências de `setTimeout` e `useFakeTimers` presente em `test/unit/cache.test.ts` | Verificado via `criteria-check.py` (check 1/2) | PASS |
| `npx vitest run test/unit/cache.test.ts` | 37/37 testes aprovados | 37/37 em 7 ms | PASS |
| `git diff --check && npm test` | 286/286 testes aprovados sem erro de diff | Verificado via `criteria-check.py` (check 2/2) | PASS |
