---
status: completed
run_id: RUN-20261120-195035-tck-0029
ticket: TCK-0029
design: DES-0025
start_time: 2026-11-20T19:50:35Z
end_time: 2026-11-20T19:56:00Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/tools/core.ts
  - test/unit/worker-rest-cloudflare.test.ts
  - test/unit/tools-company-health-osint-legal.test.ts
  - vitest.config.ts
  - .archagents/08-conventions.md
test_result:
  status: pass
  summary: "19/19 in new suites, npm run test:coverage PASS (87.91% stmts / 80.27% branches / 86.89% funcs / 88.64% lines >= ratchet 80/75/80/80), 420/420 Vitest (28 files, 744ms), tsc + tsc.worker + build + build:worker + test:transport PASS, criteria-check 4/4"
---
# RUN-20261120-195035-tck-0029 - TCK-0029 (`TCK-0026c`)

## Resumo executivo

- **`lib/tools/core.ts` (`L21-L50`):** Tipado `PendingRequest.promise` como `Promise<unknown>` e adicionado `clearTimeout(existing.timeoutId)` ao sobrescrever entrada expirada por timestamp em `deduplicate()` (pendência não-bloqueante de `VER-20261120-194215-tck-0028`).
- **`test/unit/worker-rest-cloudflare.test.ts` (8 testes):** Cobertura direta e offline de `lib/workers/tokens.ts` (`100%`), `lib/workers/rest.ts` (`100%` stmts/lines/funcs, `81.48%` branches), `lib/adapters/cloudflare.ts` (`100%` stmts/lines/funcs, `96.36%` branches) e `lib/workers/worker.ts` (`100%`), com mock in-memory de `KVNamespace` e `globalThis.fetch`.
- **`test/unit/tools-company-health-osint-legal.test.ts` (11 testes):** Cobertura via `executeTool` + `deduplicate` de `lib/core/tools.ts` (`95.83%` stmts / `100%` lines/funcs), `lib/tools/core.ts` (`100%` stmts/lines/funcs), `lib/tools/company.ts` (`97.67%` stmts / `98.5%` lines / `100%` funcs), `lib/tools/health.ts` (`100%`), `lib/tools/osint.ts` (`88.88%` / `100%` funcs), `lib/tools/legal.ts` (`100%` stmts/lines/funcs) e `lib/tools/government.ts` (`76.87%` stmts / `83.33%` lines / `100%` funcs).
- **Ratchet & Documentação (`vitest.config.ts`, `.archagents/08-conventions.md`):** Thresholds elevados para `80% lines / 80% functions / 75% branches / 80% statements`, com medição global V8 em `87.91% Stmts / 80.27% Branch / 86.89% Funcs / 88.64% Lines` (`28` arquivos / `420` testes).

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/worker-rest-cloudflare.test.ts test/unit/tools-company-health-osint-legal.test.ts` | `passed` | **2/2** arquivos, **19/19** testes | PASS |
| `npm run test:coverage` | `passed` | **28/28** (`420/420`), `87.91%` stmts / `80.27%` branches / `86.89%` funcs / `88.64%` lines >= ratchet `80/75/80/80` | PASS |
| `npm test` | `passed` | **28/28** arquivos, **420/420** testes (`744ms`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport` | Exit `0` + `PASS` | `TYPECHECK_OK` + `BUILD_OK` + `PASS: both transports expose the expected catalogue` | PASS |
| `criteria-check.py --root "$WT" --ticket TCK-0029 --json` | `verdict: pass` | **4/4** critérios `pass` | PASS |
