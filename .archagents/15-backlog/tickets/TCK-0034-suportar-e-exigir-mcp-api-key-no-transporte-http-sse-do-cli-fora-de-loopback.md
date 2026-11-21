---
id: TCK-0034
slug: suportar-e-exigir-mcp-api-key-no-transporte-http-sse-do-cli-fora-de-loopback
title: "Suportar e exigir MCP_API_KEY no transporte HTTP/SSE do CLI fora de loopback"
source: audit
created_at: 2026-11-21T13:09:42Z
created_by: ops
updated_at: 2026-11-21T13:09:42Z
status: raw
severity: medium
category: security
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0019
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance: []
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
