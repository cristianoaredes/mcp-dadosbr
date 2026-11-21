---
id: TCK-0035
slug: tratar-json-invalido-como-400-e-alinhar-headers-defensivos-cache-control-no-work
title: "Tratar JSON invalido como 400 e alinhar headers defensivos/Cache-Control no Worker REST"
source: audit
created_at: 2026-11-21T13:09:43Z
created_by: ops
updated_at: 2026-11-21T13:09:43Z
status: raw
severity: low
category: security
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0020
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
# TCK-0035 - Tratar JSON invalido como 400 e alinhar headers defensivos/Cache-Control no Worker REST

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0020`** (`security`, `low`).

**Problema:** Rotas POST da API REST do Worker tratam erro de parsing JSON junto com erros internos `500` (inclusive expondo `error.message`), e o adaptador Cloudflare ainda não alinha headers defensivos `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store`.

**Evidências (`a3a2e12`):**
- `lib/workers/rest.ts:L59-L73,L84,L126-L137,L148,L190-L201,L212,L243-L254`
- `lib/adapters/cloudflare.ts:L67-L75`
- `lib/adapters/cli-http.ts:L231-L236`

**Mitigação sugerida:**
- Retornar `400 Invalid JSON payload` para corpos JSON inválidos em `lib/workers/rest.ts`.
- Sanitizar/ocultar `error.message` interno nas respostas HTTP `500` em `lib/workers/rest.ts`.
- Adicionar `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store` em `lib/adapters/cloudflare.ts`.

## Falsificador

Antes do fix, `lib/workers/rest.ts:L59-L73,L84,L126-L137,L148,L190-L201,L212,L243-L254` responde `500` com `error.message` ao receber JSON malformado, e `lib/adapters/cloudflare.ts:L67-L75` omite `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store`.

## Log de transicoes

- 2026-11-21T13:09:43Z - **raw** - criado via scripts/ops/ticket/create.py.
