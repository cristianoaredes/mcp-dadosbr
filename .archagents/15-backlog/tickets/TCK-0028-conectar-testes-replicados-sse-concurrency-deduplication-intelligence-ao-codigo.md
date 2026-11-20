---
id: TCK-0028
slug: conectar-testes-replicados-sse-concurrency-deduplication-intelligence-ao-codigo
title: "Conectar testes replicados (sse, concurrency, deduplication, intelligence) ao codigo real em lib/ com fake timers (TCK-0026b)"
source: audit
created_at: 2026-11-20T19:21:47Z
created_by: ops
updated_at: 2026-11-20T19:21:47Z
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
  - TCK-0027
related: []
acceptance:
  - check: "npx vitest run test/unit/sse.test.ts test/unit/concurrency.test.ts test/unit/deduplication.test.ts test/unit/intelligence.test.ts"
    expect: passed
---
# TCK-0028 - Conectar testes replicados (sse, concurrency, deduplication, intelligence) ao codigo real em lib/ com fake timers (TCK-0026b)

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=audit.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

## Log de transicoes

- 2026-11-20T19:21:47Z - **raw** - criado via scripts/ops/ticket/create.py.
