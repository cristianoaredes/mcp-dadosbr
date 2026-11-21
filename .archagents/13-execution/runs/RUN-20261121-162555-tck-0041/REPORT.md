---
status: completed
run_id: RUN-20261121-162555-tck-0041
ticket: TCK-0041
design: DES-0037
start_time: 2026-11-21T16:25:55Z
end_time: 2026-11-21T16:48:00Z
environment: dev
mode: live
operator: ops
commits:
  - 62c6472
files_modified:
  - lib/shared/mte-lista-suja.ts
  - lib/shared/tcu-schema.ts
  - lib/tools/tcu.ts
  - lib/tools/legal.ts
  - lib/tools/company.ts
  - test/unit/tcu-mte-v070.test.ts
  - test/unit/tools-company-health-osint-legal.test.ts
  - test/unit/performance-cache-pagination.test.ts
test_result:
  status: pass
  summary: "34/34 targeted (3 files), 536/536 full Vitest (39 files), tsc + tsc.worker + secret-scan PASS"
  details: "MTE Lista Suja CSV parser/matcher, zero-fetch Consumidor fallback, TCU Certidões with deep profile integration."
---
# RUN-20261121-162555-tck-0041 - TCK-0041

## Resumo executivo

Execução completa do `TCK-0041` (`DES-0037`, `SPC-0001` Unit 1) em worktree isolada (`feat/TCK-0041-lista-suja-consumidor-tcu`, commit `62c6472`, mergeada em `feature/SPC-0001-v0.7.0-transversal-sources`):

1. `lib/shared/mte-lista-suja.ts`: decodificador UTF-8 com fallback ISO-8859-1, parser `;` com suporte a aspas/BOM e validação de colunas obrigatórias, sanitização `sanitizeUntrustedText`, e matcher por dígitos (`>=8`) ou tokens NFD normalizados com teto de 50 registros.
2. `lib/tools/legal.ts`: `executeListaSuja` atualizado para consumir e cachear (`LISTA_SUJA_CACHE_KEY`) o CSV oficial `cadastro_de_empregadores.csv` do MTE, anexando `UNTRUSTED_EXTERNAL_DATA_NOTICE` e `attachLgpdNotice`, com fallback explícito sem cachear erro.
3. `lib/tools/company.ts`: removida requisição HTTP contra o challenge anti-bot de `consumidor.gov.br/pages/indicador/empresa/listar`; `executeDeepProfile` passou a acionar `executeTcuCertidoes` em paralelo quando `include_government === true`.
4. `lib/shared/tcu-schema.ts` & `lib/tools/tcu.ts`: schema CNPJ mod-11 `.strict()` e conector `certidoes-apf.apps.tcu.gov.br` (`10s` timeout, cache por CNPJ, sanitização e `lgpd_notice`) exportando `registerTcuTool()` sem auto-registro top-level durante a Wave 1.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| Testes direcionados (`tcu-mte-v070`, `tools-company...`, `performance...`) | Pass 100% | `3 passed (3)`, `34 passed (34)` | PASS |
| Suíte completa pós-merge (`vitest run`) | Pass 100% | `39 passed (39)`, `536 passed (536)` | PASS |
| Typecheck Node + Worker | Exit `0` | Exit `0` | PASS |
| Evidência de código (`cadastro_de_empregadores.csv` e zero anti-bot URL) | Exit `0` | Exit `0` | PASS |
| Secret scan (`secret-scan.sh`) | Exit `0` | `No secrets detected` | PASS |
