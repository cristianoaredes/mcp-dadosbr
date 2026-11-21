---
id: TCK-0038
slug: propagar-requestcontext-em-rest-cli-mcp-e-unificar-logger-estruturado-em-rate-li
title: "Propagar requestContext em REST/CLI-MCP e unificar Logger estruturado em rate-limit/search/intelligence"
source: audit
created_at: 2026-11-21T13:09:45Z
created_by: ops
updated_at: 2026-11-21T13:09:45Z
status: raw
severity: medium
category: observability
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0023
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/10-runbooks.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance: []
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
