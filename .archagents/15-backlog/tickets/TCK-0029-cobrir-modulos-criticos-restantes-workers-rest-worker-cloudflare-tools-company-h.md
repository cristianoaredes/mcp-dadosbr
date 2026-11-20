---
id: TCK-0029
slug: cobrir-modulos-criticos-restantes-workers-rest-worker-cloudflare-tools-company-h
title: "Cobrir modulos criticos restantes (workers/rest, worker, cloudflare, tools company/health/osint/legal) e elevar ratchet de cobertura (TCK-0026c)"
source: audit
created_at: 2026-11-20T19:21:49Z
created_by: ops
updated_at: 2026-11-20T19:21:49Z
status: raw
severity: high
category: test-coverage
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0014
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/08-conventions.md
external_refs: []
external_sync: []
blocks: []
blocked_by:
  - TCK-0028
related: []
acceptance:
  - check: "npm run test:coverage"
    expect: passed
---
# TCK-0029 - Cobrir modulos criticos restantes (workers/rest, worker, cloudflare, tools company/health/osint/legal) e elevar ratchet de cobertura (TCK-0026c)

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=audit.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

## Log de transicoes

- 2026-11-20T19:21:49Z - **raw** - criado via scripts/ops/ticket/create.py.
