---
id: TCK-0042
slug: spc-0001-implementar-cnae-ncm-lookup-sistema-financeiro-lookup-e-feriados-ddd-lo
title: "[SPC-0001] Implementar cnae_ncm_lookup, sistema_financeiro_lookup e feriados_ddd_lookup"
source: spec
created_at: 2026-11-21T16:23:36Z
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
  - DES-0038
linked_runs:
  - RUN-20261121-162556-tck-0042
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
  - check: "npx vitest run test/unit/fiscal-banking-v070.test.ts"
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit"
  - check: "rg -q 'export function registerFiscalBankingTools' lib/tools/fiscal-banking.ts"
linked_spec: SPC-0001
security_sensitive: true
---
# TCK-0042 - [SPC-0001] Implementar cnae_ncm_lookup, sistema_financeiro_lookup e feriados_ddd_lookup

## Contexto

Unit 2 de `SPC-0001` (filho de `TCK-0040`). Implementa `lib/shared/fiscal-banking-schemas.ts` e `lib/tools/fiscal-banking.ts` com `cnae_ncm_lookup` (IBGE CNAE `v2` + BrasilAPI NCM), `sistema_financeiro_lookup` (bancos, participantes Pix, corretoras CVM com filtro e paginação) e `feriados_ddd_lookup` (feriados nacionais e DDD/UF), exportando `registerFiscalBankingTools()`.

## Falsificador

Antes da entrega, `lib/shared/fiscal-banking-schemas.ts`, `lib/tools/fiscal-banking.ts` e `test/unit/fiscal-banking-v070.test.ts` não existem.

## Log de transicoes

- 2026-11-21T16:23:36Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T16:24:37Z - **triaged** - Compiled from SPC-0001 (DoR 100/100)
- 2026-11-21T16:25:55Z - **designed** - DES-0038 approved
- 2026-11-21T16:27:20Z - **executing** - Wave 1 parallel execution (RUN-20261121-162556-tck-0042)
- 2026-11-21T16:50:36Z - **verifying** - Wave 1 merged and 536/536 tests green
