---
id: DES-0023
slug: habilitar-vitest-coverage-v8-incluir-workers-na-cobertura-com-ratchet-e-migrar-c
title: "Habilitar @vitest/coverage-v8, incluir Workers na cobertura com ratchet e migrar circuit-breaker.test.ts para fake timers"
created_at: 2026-11-20T19:22:25Z
status: approved
ticket: TCK-0027
type: design
scope_files_new: []
scope_files_modified:
  - package.json
  - package-lock.json
  - vitest.config.ts
  - test/unit/circuit-breaker.test.ts
  - test/unit/dependency-hygiene.test.ts
  - .archagents/08-conventions.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0023-playbook.md
acceptance_delta: unchanged
---
# DES-0023 - Habilitar @vitest/coverage-v8, incluir Workers na cobertura com ratchet e migrar circuit-breaker.test.ts para fake timers

## Problema

Em `FND-0014` (parte `26a` -> `TCK-0027`), o comando `npm run test:coverage` falha por ausência de `@vitest/coverage-v8`; `vitest.config.ts:L17-L34` não define `include` e exclui `lib/workers/` e `lib/adapters/cloudflare.ts` dos relatórios e thresholds de cobertura; e `test/unit/circuit-breaker.test.ts:L81,L100,L187` usa `setTimeout` reais (`~3.3s` de sono por rodada de testes).

## Design & Riscos

| ID | Risco / Lacuna | Mitigação |
|---|---|---|
| C1 | `@vitest/coverage-v8` incompatível com `vitest@4.1.12` ou introduzindo CVEs | Fixar `"@vitest/coverage-v8": "^4.1.12"` (match exato com `vitest`), validar com `npm install && npm ci` e `npm audit --audit-level=high` (`0` CVEs) |
| C2 | Cobertura cega em Workers/Cloudflare | Configurar `include: ['lib/**/*.ts']` e remover `lib/workers/` e `lib/adapters/cloudflare.ts` de `exclude`, mantendo exclusão apenas de pontos de entrada CLI/bin, tipos e diretórios externos |
| C3 | Thresholds irreais ou regressão silenciosa | Medir a cobertura real inicial em `lib/**/*.ts` (`All files`), registrar a medição exata em comentário e fixar ratchet inicial `Math.floor(observado - 2)` (com elevação planejada em `TCK-0028` / `TCK-0029`) |
| C4 | Flakiness/lentidão e vazamento de mocks/timers em `circuit-breaker.test.ts` | Adotar `vi.useFakeTimers()` + `vi.setSystemTime(...)` no `beforeEach`, `vi.advanceTimersByTime` / `advanceTimersByTimeAsync` e `vi.restoreAllMocks()` **antes** de `vi.useRealTimers()` no `afterEach` |

## Mudancas

- `package.json` e `package-lock.json` (`@vitest/coverage-v8@^4.1.12`)
- `vitest.config.ts` (`include: ['lib/**/*.ts']`, remoção de `lib/workers/` e `lib/adapters/cloudflare.ts` do `exclude`, ratchet realista)
- `test/unit/circuit-breaker.test.ts` (fake timers)
- `test/unit/dependency-hygiene.test.ts` (invariantes de `TCK-0027`)
- `.archagents/08-conventions.md` (documentação de `test:coverage`, ratchet e fake timers)

## Criterios de sucesso

- [ ] `npm audit --omit=dev --audit-level=high && npm audit --audit-level=high && echo AUDIT_OK`
- [ ] `npm run test:coverage`
- [ ] `npx vitest run test/unit/circuit-breaker.test.ts`
- [ ] `npm test && npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport && echo FULL_OK`
