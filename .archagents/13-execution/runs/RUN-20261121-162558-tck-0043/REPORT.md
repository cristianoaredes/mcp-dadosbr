---
status: completed
run_id: RUN-20261121-162558-tck-0043
ticket: TCK-0043
design: DES-0039
start_time: 2026-11-21T16:25:58Z
end_time: 2026-11-21T16:48:00Z
environment: dev
mode: live
operator: ops
commits:
  - 263a953
files_modified:
  - lib/shared/olinda-ibge-schemas.ts
  - lib/tools/olinda.ts
  - lib/tools/ibge-indicadores.ts
  - test/unit/olinda-ibge-indicadores-v070.test.ts
test_result:
  status: pass
  summary: "16/16 targeted (95.28% stmts), 536/536 full Vitest (39 files), tsc + tsc.worker + secret-scan PASS"
  details: "bcb_olinda (PTAX window + Focus) and ibge_indicadores (Pop 6579 + PIB 5938 + per capita) preserving bacen_taxas and ibge_localidades."
---
# RUN-20261121-162558-tck-0043 - TCK-0043

## Resumo executivo

Execução completa do `TCK-0043` (`DES-0039`, `SPC-0001` Unit 3) em worktree isolada (`feat/TCK-0043-bcb-olinda-ibge-indicadores`, commit `263a953`, mergeada em `feature/SPC-0001-v0.7.0-transversal-sources`):

1. `lib/shared/olinda-ibge-schemas.ts`: schemas `.strict()` com validação de data calendário ISO real, enums estritos anti-OData injection (`OLINDA_CURRENCIES`, `FOCUS_INDICATORS`) e `codigo_ibge` UF/Município.
2. `lib/tools/olinda.ts`: `bcb_olinda` com PTAX histórica (`USD` via `CotacaoDolarPeriodo` e demais moedas via `CotacaoMoedaPeriodo` em janela de 7 dias com flag `exact_date_match`) e Boletim Focus (`ExpectativasMercadoAnuais`), sanitização e `registerOlindaTool()`.
3. `lib/tools/ibge-indicadores.ts`: `ibge_indicadores` para `N3` (UF) e `N6` (município) consultando População (`6579/9324`) e PIB (`5938/37`) via IBGE `v3`, cálculo explícito de `pib_per_capita_estimado_reais` com anos de referência e `registerIbgeIndicadoresTool()`.
4. `test/unit/olinda-ibge-indicadores-v070.test.ts`: 16 testes cobrindo isolamento Wave 1, PTAX útil/feriado/EUR, Focus, IBGE N3/N6/per capita, cache e erros.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| Testes direcionados (`olinda-ibge-indicadores-v070.test.ts`) | Pass 100% | `1 passed (1)`, `16 passed (16)` | PASS |
| Suíte completa pós-merge (`vitest run`) | Pass 100% | `39 passed (39)`, `536 passed (536)` | PASS |
| Typecheck Node + Worker | Exit `0` | Exit `0` | PASS |
| Exports `registerOlindaTool` & `registerIbgeIndicadoresTool` | Exit `0` | Exit `0` | PASS |
| Secret scan (`secret-scan.sh`) | Exit `0` | `No secrets detected` | PASS |
