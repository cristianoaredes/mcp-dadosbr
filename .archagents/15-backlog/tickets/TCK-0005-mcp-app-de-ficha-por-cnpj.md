---
id: TCK-0005
slug: mcp-app-de-ficha-por-cnpj
title: "MCP App de ficha por CNPJ"
source: user
created_at: 2026-11-18T02:01:50Z
created_by: ops
updated_at: 2026-11-18T02:01:51Z
status: executing
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0005
linked_runs:
  - RUN-20261118-020150-cnpj
linked_verifications: []
linked_docs: []
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npm run build && npm test && npm run test:transport"
  - check: "npm run build:worker"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-18T02:01:50Z
---
# TCK-0005 - MCP App de ficha por CNPJ

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=user.

## Falsificador

test/integration/transports.mjs:57 ainda não registra recurso de cnpj_lookup. A entrega reprova se o provedor, a situação, os CNAEs ou o endereço forem atribuídos incorretamente ou o JSON legado mudar.

## Log de transicoes

- 2026-11-18T02:01:50Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-18T02:01:50Z - **noted** - body:falsifier (replace): Registrar critérios conferíveis antes de implementar
- 2026-11-18T02:01:50Z - **triaged** - Ficha cadastral e compatibilidade de provedores [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-18T02:01:51Z - **designed** - Projeção de dados do lookup e interface MCP
- 2026-11-18T02:01:51Z - **executing** - Implementar ficha e cobertura de compatibilidade
