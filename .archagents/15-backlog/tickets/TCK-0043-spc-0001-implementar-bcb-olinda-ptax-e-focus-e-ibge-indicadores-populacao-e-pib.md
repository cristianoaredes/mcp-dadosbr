---
id: TCK-0043
slug: spc-0001-implementar-bcb-olinda-ptax-e-focus-e-ibge-indicadores-populacao-e-pib
title: "[SPC-0001] Implementar bcb_olinda (PTAX e Focus) e ibge_indicadores (Populacao e PIB)"
source: spec
created_at: 2026-11-21T16:23:37Z
created_by: ops
updated_at: 2026-11-21T16:50:36Z
status: verifying
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0039
linked_runs:
  - RUN-20261121-162558-tck-0043
linked_verifications: []
linked_docs:
  - .archagents/12-inception/specs/SPC-0001-pacote-fontes-transversais-v070.md
external_refs: []
external_sync: []
blocks:
  - TCK-0044
blocked_by: []
related:
  - TCK-0040
acceptance:
  - check: "npx vitest run test/unit/olinda-ibge-indicadores-v070.test.ts"
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit"
  - check: "rg -q 'export function registerOlindaTool' lib/tools/olinda.ts && rg -q 'export function registerIbgeIndicadoresTool' lib/tools/ibge-indicadores.ts"
linked_spec: SPC-0001
security_sensitive: true
---
# TCK-0043 - [SPC-0001] Implementar bcb_olinda (PTAX e Focus) e ibge_indicadores (Populacao e PIB)

## Contexto

Unit 3 de `SPC-0001` (filho de `TCK-0040`). Implementa `lib/shared/olinda-ibge-schemas.ts`, `lib/tools/olinda.ts` (`bcb_olinda`: PTAX por data com janela de dias não-úteis + Expectativas Focus via OData BCB) e `lib/tools/ibge-indicadores.ts` (`ibge_indicadores`: População `6579` e PIB `5938` via IBGE Agregados `v3`), preservando `bacen_taxas`, `ibge_localidades` e seus MCP Apps.

## Falsificador

Antes da entrega, `lib/shared/olinda-ibge-schemas.ts`, `lib/tools/olinda.ts`, `lib/tools/ibge-indicadores.ts` e `test/unit/olinda-ibge-indicadores-v070.test.ts` não existem.

## Log de transicoes

- 2026-11-21T16:23:37Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T16:24:37Z - **triaged** - Compiled from SPC-0001 (DoR 100/100)
- 2026-11-21T16:25:55Z - **designed** - DES-0039 approved
- 2026-11-21T16:27:21Z - **executing** - Wave 1 parallel execution (RUN-20261121-162558-tck-0043)
- 2026-11-21T16:50:36Z - **verifying** - Wave 1 merged and 536/536 tests green
