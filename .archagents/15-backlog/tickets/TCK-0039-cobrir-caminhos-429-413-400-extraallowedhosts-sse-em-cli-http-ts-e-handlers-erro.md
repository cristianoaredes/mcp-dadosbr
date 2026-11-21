---
id: TCK-0039
slug: cobrir-caminhos-429-413-400-extraallowedhosts-sse-em-cli-http-ts-e-handlers-erro
title: "Cobrir caminhos 429/413/400/extraAllowedHosts/SSE em cli-http.ts e handlers/erro em mcp-server.ts"
source: audit
created_at: 2026-11-21T13:09:45Z
created_by: ops
updated_at: 2026-11-21T14:18:35Z
status: verifying
severity: medium
category: test-coverage
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0024
linked_designs:
  - DES-0035
linked_runs:
  - RUN-20261121-140937-tck-0039
linked_verifications: []
linked_docs:
  - .archagents/02-architecture.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/cli-http-runtime-coverage.test.ts test/unit/mcp-server-handlers.test.ts && echo TCK_0039_UNIT_TESTS_OK"
    expect: TCK_0039_UNIT_TESTS_OK
  - check: "npm run test:coverage && echo COVERAGE_OK"
    expect: COVERAGE_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
depth_decision:
  workflow: inline
  design: skip
  verify: lightweight
  source: routing-classifier
  classified_at: 2026-11-21T14:09:09Z
---
# TCK-0039 - Cobrir caminhos 429/413/400/extraAllowedHosts/SSE em cli-http.ts e handlers/erro em mcp-server.ts

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0024`** (`test-coverage`, `medium`).

**Problema:** Embora a cobertura global esteja acima do ratchet (`91.32% Stmts | 83.57% Branch | 93.25% Funcs | 92.09% Lines`), módulos críticos ainda possuem ramos descobertos relevantes: `lib/adapters/cli-http.ts` (`77.3%` stmts, `70.28%` branch) em fluxos `429`, `413`, `400`, `extraAllowedHosts`, `GET /mcp` + `POST /messages` SSE e shutdown timeout; e `lib/core/mcp-server.ts` (`78.68%` stmts, `36.36%` funcs) nos handlers `ListTools`/`ListResources`/`ReadResource` e `catch` de erro inesperado.

**Evidências (`a3a2e12`):**
- `lib/adapters/cli-http.ts:L49-L55,L134-L143,L292-L335,L406-L498,L590-L593` (`77.3%` stmts, `70.28%` branch)
- `lib/core/mcp-server.ts:L116-L139,L239-L256` (`78.68%` stmts, `36.36%` funcs)

**Mitigação sugerida:**
- Adicionar testes unitários em Vitest cobrindo `429`, `413`, `400`, `extraAllowedHosts`, fluxo SSE (`GET /mcp` + `POST /messages`) e shutdown timeout em `lib/adapters/cli-http.ts`.
- Cobrir `ListTools`, `ListResources`, `ReadResource` e `catch` de erro inesperado em `lib/core/mcp-server.ts`.

## Falsificador

Antes do fix, o relatório de cobertura V8 (`npm run test:coverage`) em `a3a2e12` registra `lib/adapters/cli-http.ts` em `77.3%` stmts / `70.28%` branch e `lib/core/mcp-server.ts` em `78.68%` stmts / `36.36%` funcs nas linhas citadas (`L49-L55,L134-L143,L292-L335,L406-L498,L590-L593` e `L116-L139,L239-L256`).

## Log de transicoes

- 2026-11-21T13:09:45Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T14:09:09Z - **triaged** - triaged in wave 2 parallel remediation [depth_decision do routing-classifier: workflow inline, design skip, verify lightweight]
- 2026-11-21T14:09:37Z - **designed** - DES-0035 created
- 2026-11-21T14:09:44Z - **executing** - executing TCK-0039
- 2026-11-21T14:18:35Z - **verifying** - TCK-0039 tests and coverage verified in live run RUN-20261121-140937-tck-0039
