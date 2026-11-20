---
id: DES-0023-playbook
created_at: 2026-11-20T19:22:27Z
status: approved
design: DES-0023
ticket: TCK-0027
approved_at: 2026-11-20T19:22:27Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: ops/
branch_name: chore/TCK-0027-coverage-v8-config-fake-timers
commit_per_step: false
commit_message_format: "[TCK-0027] passo N/4: <titulo>"
---
# Playbook - DES-0023

**Ticket:** TCK-0027
**Objetivo:** Habilitar `@vitest/coverage-v8`, incluir `lib/workers/` e `lib/adapters/cloudflare.ts` na cobertura com ratchet honesto e migrar `circuit-breaker.test.ts` para fake timers.

## Pre-requisitos

- [x] `$WT/node_modules` é diretório real isolado (não symlink para `$MAIN`).
- [x] Sub-tickets `TCK-0027`, `TCK-0028`, `TCK-0029` criados e vinculados em `TCK-0026`.

## Modo dry-run

`/ops-execute DES-0023 --dry-run`

## Passos

1. **Passo 1/4 — `@vitest/coverage-v8`:** Declarar `"@vitest/coverage-v8": "^4.1.12"` em `package.json`, rodar `npm install && npm ci` em `$WT` e confirmar `0` vulnerabilidades em `npm audit`.
2. **Passo 2/4 — Fake timers em `test/unit/circuit-breaker.test.ts`:** Usar `vi.useFakeTimers()`, `vi.advanceTimersByTime(1100)`, `vi.advanceTimersByTimeAsync(10)` e `afterEach` com `vi.restoreAllMocks()` antes de `vi.useRealTimers()`.
3. **Passo 3/4 — `vitest.config.ts`, ratchet e docs:** Definir `include: ['lib/**/*.ts']`, incluir `lib/workers/` e `lib/adapters/cloudflare.ts`, medir baseline real sem threshold, fixar ratchet `Math.floor(observado - 2)`, adicionar testes em `test/unit/dependency-hygiene.test.ts` e documentar em `.archagents/08-conventions.md`.
4. **Passo 4/4 — Verificação e Review:** Executar `npm run test:coverage`, `npm test`, `tsc`, `tsc.worker`, `build`, `build:worker`, `npm run test:transport`, `criteria-check.py` e verificador `self` independente.

## Criterios de sucesso do playbook

- [x] `npm run test:coverage` passa com saída `0` medindo `lib/**/*.ts` (incluindo Workers).
- [x] `circuit-breaker.test.ts` roda com fake timers (`18ms` tests / `186ms` total) sem sleeps reais.

## Log de execucoes

- `2026-11-20T19:25:16Z` — `RUN-20261120-192307-tck-0027` (`live`): 4/4 passos concluídos, `npm run test:coverage` PASS (`75.76%` stmts / `69.56%` branch / `74.53%` funcs / `77.47%` lines >= ratchet `73/67/72/75`), `403/403` Vitest em `1.87s`, `npm ci` + `npm audit` (`0` vulns), `tsc` + `tsc.worker` + `build` + `build:worker` + `test:transport` + `criteria-check.py` (`4/4`) aprovados.
