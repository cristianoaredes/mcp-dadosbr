---
id: TCK-0038
slug: propagar-requestcontext-em-rest-cli-mcp-e-unificar-logger-estruturado-em-rate-li
title: "Propagar requestContext em REST/CLI-MCP e unificar Logger estruturado em rate-limit/search/intelligence"
source: audit
created_at: 2026-11-21T13:09:45Z
created_by: ops
updated_at: 2026-11-21T14:20:53Z
status: verifying
severity: medium
category: observability
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0023
linked_designs:
  - DES-0034
linked_runs:
  - RUN-20261121-141121-tck-0038
linked_verifications: []
linked_docs:
  - .archagents/10-runbooks.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/observability.test.ts test/unit/legal-timeouts-intelligence.test.ts test/unit/session-thinking-redaction-ratelimit.test.ts test/unit/worker-rest-cloudflare.test.ts test/unit/worker-sse-kv-shutdown.test.ts && echo OBS_TESTS_OK"
    expect: OBS_TESTS_OK
  - check: "npm run test && echo ALL_TESTS_OK"
    expect: ALL_TESTS_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
  - check: "npm run build && npm run build:worker && npm run test:transport && echo TRANSPORT_OK"
    expect: TRANSPORT_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-21T14:09:00Z
---
# TCK-0038 - Propagar requestContext em REST/CLI-MCP e unificar Logger estruturado em rate-limit/search/intelligence

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0023`** (`observability`, `medium`).

**Problema:** O `requestContext` (correlation/request ID) não é propagado de `worker.ts` -> `rest.ts` -> `handleMCPRequest` nem do endpoint `POST /messages` em `cli-http.ts` -> `mcp-server.ts`; além disso, `rate-limit.ts`, `search.ts`, `intelligence.ts` e `tools.ts` ainda possuem pontos sem `createLogger` estruturado unificado nem evento `tool.executed` em nível `INFO` (sem PII).

**Evidências (`a3a2e12`):**
- `lib/workers/worker.ts:L139,L144,L148,L152`
- `lib/workers/rest.ts:L33,L107,L171,L224`
- `lib/adapters/cli-http.ts:L450-L454,L489` vs `lib/core/mcp-server.ts:L144`
- `lib/workers/rate-limit.ts:L146`
- `lib/core/search.ts:L34,L49,L76,L89`
- `lib/core/intelligence.ts:L195,L224-L450`
- `lib/core/tools.ts:L138`

**Mitigação sugerida:**
- Propagar `requestContext` de `worker.ts` -> `rest.ts` -> `handleMCPRequest` e no fluxo CLI `POST /messages` -> `mcp-server.ts`.
- Migrar `rate-limit.ts`, `search.ts`, `intelligence.ts` e `tools.ts` para `createLogger`.
- Registrar `tool.executed` em nível `INFO` sem expor PII.

## Falsificador

Antes do fix, `lib/workers/worker.ts:L139,L144,L148,L152`, `lib/workers/rest.ts:L33,L107,L171,L224` e `lib/adapters/cli-http.ts:L450-L454,L489` vs `lib/core/mcp-server.ts:L144` não propagam o mesmo `requestId` ponta a ponta, enquanto `lib/workers/rate-limit.ts:L146`, `lib/core/search.ts:L34,L49,L76,L89`, `lib/core/intelligence.ts:L195,L224-L450` e `lib/core/tools.ts:L138` operam fora do `createLogger` unificado / evento `tool.executed` em `INFO`.

## Log de transicoes

- 2026-11-21T13:09:45Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T14:09:00Z - **triaged** - triaged in wave 2 parallel remediation [aceite reescrito: 4 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-21T14:11:21Z - **designed** - DES-0034 created
- 2026-11-21T14:11:21Z - **executing** - executing TCK-0038
- 2026-11-21T14:11:49Z - **executing** - executing TCK-0038 with RUN-20261121-141121-tck-0038
- 2026-11-21T14:20:53Z - **verifying** - TCK-0038 implemented and verified in wave 2 (RUN-20261121-141121-tck-0038)
