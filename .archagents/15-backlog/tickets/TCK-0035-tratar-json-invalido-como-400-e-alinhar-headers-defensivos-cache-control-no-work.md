---
id: TCK-0035
slug: tratar-json-invalido-como-400-e-alinhar-headers-defensivos-cache-control-no-work
title: "Tratar JSON invalido como 400 e alinhar headers defensivos/Cache-Control no Worker REST"
source: audit
created_at: 2026-11-21T13:09:43Z
created_by: ops
updated_at: 2026-11-21T14:29:02Z
status: done
severity: low
category: security
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0020
linked_designs:
  - DES-0033
linked_runs:
  - RUN-20261121-141008-tck-0035
linked_verifications:
  - VER-20261121-142719-tck-0035
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/worker-security-headers.test.ts test/unit/worker-rest-cloudflare.test.ts && echo WORKER_SECURITY_HEADERS_OK"
    expect: WORKER_SECURITY_HEADERS_OK
  - check: "npm run test && echo FULL_UNIT_TESTS_OK"
    expect: FULL_UNIT_TESTS_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
depth_decision:
  workflow: inline
  design: skip
  verify: lightweight
  source: routing-classifier
  classified_at: 2026-11-21T14:09:30Z
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
- 2026-11-21T14:09:30Z - **triaged** - triaged in wave 2 parallel remediation [depth_decision do routing-classifier: workflow inline, design skip, verify lightweight]
- 2026-11-21T14:10:08Z - **designed** - DES-0033 created
- 2026-11-21T14:10:15Z - **executing** - executing TCK-0035
- 2026-11-21T14:17:20Z - **verifying** - implementation verified locally, ready for P10 verify
- 2026-11-21T14:29:02Z - **done** - P10 verify approved-with-notes (9a9153c5) + judge pass
