---
id: DES-0011-playbook
created_at: 2026-11-19T13:47:45Z
status: approved
design: DES-0011
ticket: TCK-0011
approved_at: 2026-11-19T13:47:45Z
approved_by: operator
executed_at: 2026-11-19T13:49:21Z
executed_runs:
  - RUN-20261119-134735-cache-fake-timers
dry_run_supported: true
total_steps: 2
destructive_steps: 0
environments:
  - dev
estimated_duration: 10min
branch_prefix: bugfix/
branch_name: bugfix/TCK-0011-deterministic-cache-ttl-tests
commit_per_step: false
commit_message_format: "fix(TCK-0011): passo N/2: <titulo>"
---
# Playbook - DES-0011

**Ticket:** TCK-0011
**Objetivo:** Substituir `setTimeout` real por fake timers em `test/unit/cache.test.ts`

## Passos

1. **Passo 1/2:** Ativar `vi.useFakeTimers()` / `vi.setSystemTime(...)` e `vi.useRealTimers()` em `MemoryCache` e `KVCache` em `test/unit/cache.test.ts`, trocando todos os `setTimeout` por `vi.advanceTimersByTime(...)`.
2. **Passo 2/2:** Executar `criteria-check.py --ticket TCK-0011` (`npx vitest run test/unit/cache.test.ts && npm test`) e verificação independente (`VER-*`).

## Critérios de sucesso do playbook

- [x] `! grep -q "setTimeout" test/unit/cache.test.ts && grep -q "useFakeTimers" test/unit/cache.test.ts`
- [x] `npx vitest run test/unit/cache.test.ts` e `npm test` (286/286) passam.
