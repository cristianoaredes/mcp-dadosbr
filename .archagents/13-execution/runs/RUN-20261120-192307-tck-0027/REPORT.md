---
status: completed
run_id: RUN-20261120-192307-tck-0027
ticket: TCK-0027
design: DES-0023
start_time: 2026-11-20T19:23:08Z
end_time: 2026-11-20T19:25:16Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - package.json
  - package-lock.json
  - vitest.config.ts
  - test/unit/circuit-breaker.test.ts
  - test/unit/dependency-hygiene.test.ts
  - .archagents/08-conventions.md
test_result:
  status: pass
  summary: "npm run test:coverage PASS (75.76% stmts, 69.56% branches, 74.53% funcs, 77.47% lines vs ratchet 73/67/72/75), 17/17 circuit-breaker.test.ts (186ms / tests 18ms), 403/403 Vitest (26 arquivos, 1.87s), npm audit 0 vulns, npm ci OK, tsc + tsc.worker + build + test:transport PASS, criteria-check 4/4 pass"
---
# RUN-20261120-192307-tck-0027 - TCK-0027 (`TCK-0026a`)

## Resumo executivo

- **Decomposição registrada de `TCK-0026`:** Copiados os tickets brutos `TCK-0023`–`TCK-0026` de `$MAIN` para `$WT`, alocados `TCK-0027` (`26a`, `S`), `TCK-0028` (`26b`, `M`, bloqueado por `TCK-0027`) e `TCK-0029` (`26c`, `M`, bloqueado por `TCK-0028`), e vinculado `TCK-0026` como `blocked_by: [TCK-0027, TCK-0028, TCK-0029]`.
- **`@vitest/coverage-v8` (`^4.1.12`):** Adicionado em `package.json:L94`, instalado em `$WT/node_modules` isolado (`npm install && npm ci`), com **`0` vulnerabilidades** em `npm audit --omit=dev --audit-level=high` e `npm audit --audit-level=high`.
- **`vitest.config.ts`:** Definido `include: ['lib/**/*.ts']`, removidas exclusões de `lib/workers/` e `lib/adapters/cloudflare.ts` para medir Workers na cobertura real, e calibrado ratchet inicial `75% lines / 72% functions / 67% branches / 73% statements` a partir do baseline medido (`77.47% / 74.53% / 69.56% / 75.76%`), pronto para subir progressivamente em `TCK-0028` e `TCK-0029`.
- **`test/unit/circuit-breaker.test.ts`:** Substituídos os sleeps reais (`1100ms` x 2 + `10ms` x 10) por `vi.useFakeTimers()`, `vi.advanceTimersByTime(1100)`, `vi.advanceTimersByTimeAsync(10)` e `afterEach` com `vi.restoreAllMocks()` antes de `vi.useRealTimers()`, reduzindo o arquivo de `3323ms` para `18ms` (`186ms` totais) e a suíte `npm test` de `~3.58s` para `1.87s` (`26/26` arquivos, `403/403` testes).
- **`test/unit/dependency-hygiene.test.ts` e `.archagents/08-conventions.md`:** Adicionados testes de invariantes de cobertura/fake-timers e documentada a política de cobertura em `08-conventions.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npm ci` | Exit `0` | `added 508 packages, audited 509 packages, found 0 vulnerabilities` | PASS |
| `npm audit --omit=dev --audit-level=high && npm audit --audit-level=high` | Exit `0` (`AUDIT_OK`) | `found 0 vulnerabilities` (prod + dev) | PASS |
| `npx vitest run test/unit/circuit-breaker.test.ts` | `passed` | **17/17** passed (`186ms` total, `tests 18ms`) | PASS |
| `npm run test:coverage` | `passed` | **26/26** (`403/403`), `75.76%` stmts / `69.56%` branches / `74.53%` funcs / `77.47%` lines >= ratchet `73/67/72/75` | PASS |
| `npm test` | `passed` | **26/26** arquivos, **403/403** testes (`1.87s`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport` | Exit `0` + `PASS` | `TYPECHECK_OK` + `BUILD_OK` + `PASS: both transports expose the expected catalogue` | PASS |
| `criteria-check.py --root "$WT" --ticket TCK-0027 --json` | `verdict: pass` | **4/4** critérios `pass` | PASS |
