---
id: TCK-0034
slug: suportar-e-exigir-mcp-api-key-no-transporte-http-sse-do-cli-fora-de-loopback
title: "Suportar e exigir MCP_API_KEY no transporte HTTP/SSE do CLI fora de loopback"
source: audit
created_at: 2026-11-21T13:09:42Z
created_by: ops
updated_at: 2026-11-21T14:02:28Z
status: done
severity: medium
category: security
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0019
linked_designs:
  - DES-0030
linked_runs:
  - RUN-20261121-134623-tck-0034
linked_verifications:
  - VER-20261121-135836-tck-0034
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/cli-http-security.test.ts && echo CLI_HTTP_AUTH_TESTS_OK"
    expect: CLI_HTTP_AUTH_TESTS_OK
  - check: "npm run test && echo FULL_UNIT_TESTS_OK"
    expect: FULL_UNIT_TESTS_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-21T13:45:53Z
---
# TCK-0034 - Suportar e exigir MCP_API_KEY no transporte HTTP/SSE do CLI fora de loopback

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0019`** (`security`, `medium`).

**Problema:** O transporte HTTP/SSE local do CLI (`createCliHttpApp`) não suporta autenticação por `MCP_API_KEY` (`Authorization: Bearer` / `X-API-Key`) nem falha de forma segura (fail-closed) quando iniciado com bind em endereço não-loopback.

**Evidências (`a3a2e12`):**
- `lib/adapters/cli.ts:L118-L148`
- `lib/adapters/cli-http.ts:L212-L275,L385-L502`
- `README.md:L135`

**Mitigação sugerida:**
- Suportar autenticação via `MCP_API_KEY` (Bearer e `X-API-Key` com comparação constant-time) em `createCliHttpApp`.
- Exigir configuração válida (fail-closed) quando o `host` configurado não for loopback.

## Falsificador

Antes do fix, `lib/adapters/cli.ts:L118-L148` e `lib/adapters/cli-http.ts:L212-L275,L385-L502` permitem subir `createCliHttpApp` em host não-loopback sem exigir `MCP_API_KEY` e aceitam requisições às rotas HTTP/SSE sem validar token Bearer/`X-API-Key`.

## Log de transicoes

- 2026-11-21T13:09:42Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T13:45:53Z - **triaged** - triaged in wave 1 parallel remediation [aceite reescrito: 3 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-21T13:46:23Z - **designed** - DES-0030 created
- 2026-11-21T13:46:24Z - **executing** - executing TCK-0034
- 2026-11-21T13:51:13Z - **verifying** - Implementation, unit tests, transport smoke check, tsc, worker tsc, and secret-scan complete; ready for independent verification
- 2026-11-21T14:02:28Z - **done** - P10 verify approved-with-notes (6e6a7b1f) + judge pass
