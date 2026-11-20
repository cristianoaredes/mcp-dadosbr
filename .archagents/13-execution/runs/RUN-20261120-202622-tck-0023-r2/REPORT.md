---
status: completed
run_id: RUN-20261120-202622-tck-0023-r2
ticket: TCK-0023
design: DES-0026
start_time: 2026-11-20T20:26:22Z
end_time: 2026-11-20T20:32:00Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/core/tool-schemas.ts
  - lib/core/mcp-server.ts
  - lib/tools/government.ts
  - lib/tools/financial.ts
  - lib/tools/company.ts
  - lib/tools/legal.ts
  - lib/tools/health.ts
  - test/unit/performance-cache-pagination.test.ts
  - test/unit/legal-timeouts-intelligence.test.ts
  - .archagents/05-integrations.md
test_result:
  status: pass
  summary: "R2 fix for async-abort race (VER-20261120-202622-tck-0023): 27/27 targeted (3 files), 429/429 Vitest (29 files), V8 coverage 88.87% stmts / 81.96% branch / 87.23% funcs / 89.58% lines >= 80/75/80/80, tsc + tsc.worker + build + build:worker + test:transport PASS, criteria-check 4/4"
---
# RUN-20261120-202622-tck-0023-r2 - TCK-0023 R2 (`FND-0011`)

## Resumo executivo

Reexecução corretiva (R2) sobre o bloqueio `[High]` de `VER-20261120-202622-tck-0023`:
- **`lib/tools/legal.ts` (`executeProcurados`):** Substituído controle por `attemptedOffsets` pelo conjunto `succeededOffsets` (populado somente após `await resp.text()` e `!settled`), acrescido de `activeCtrls` limpos em `finally` junto a `totalCtrl.cleanup()`, cálculo exaustivo de `pagesFailed` sobre todo offset ausente em `succeededOffsets` (garantindo `pagesChecked + pagesFailed.length === totalPages`), e escrita em `PROCURADOS_CACHE_KEY` estritamente condicionada a `cache && pagesFailed.length === 0 && pagesChecked === totalPages`.
- **`lib/tools/government.ts` (`executeIBGE`):** Chave `cacheKey` normalizada em `ibge:${url.toLowerCase()}` para evitar fragmentação por maiúsculas/minúsculas em `uf` preservando `source.url`.
- **`test/unit/performance-cache-pagination.test.ts`:** Adicionado teste de regressão exato do PoC de aborto assíncrono (`INCONCLUSIVE`, `partial: true`, `pages_checked + pages_failed === 13`, `cache.get(PROCURADOS_CACHE_KEY) === null`, `0` timers após drain) e cobertura explícita de não-cacheamento de fallbacks (`oab`, `bnmp`, `lista_suja`, `cnes`, `consumidor`, `domain_whois`, `ceis_cnep` sem chave).

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/performance-cache-pagination.test.ts test/unit/ibge-app.test.ts test/unit/legal-timeouts-intelligence.test.ts` | `passed` | **3/3** arquivos, **27/27** testes | PASS |
| `npm run test:coverage` | `passed` | **29/29** (`429/429`), `88.87%` stmts / `81.96%` branches / `87.23%` funcs / `89.58%` lines >= `80/75/80/80` | PASS |
| `npm test` | `passed` | **29/29** arquivos, **429/429** testes | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport` | Exit `0` + `PASS` | `TYPECHECK_OK` + `BUILD_OK` + `PASS: both transports expose the expected catalogue` | PASS |
| `criteria-check.py --root "$WT" --ticket TCK-0023 --json` | `verdict: pass` | **4/4** critérios `pass` | PASS |
