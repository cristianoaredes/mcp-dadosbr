---
id: TCK-0002
slug: mcp-app-querido-diario-a-partir-de-municipio-do-ibge
title: "MCP App Querido Diário a partir de município do IBGE"
source: user
created_at: 2026-11-17T22:48:22Z
created_by: ops
updated_at: 2026-11-17T22:49:22Z
status: executing
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0002
linked_runs:
  - RUN-20261117-224844-querido-diario
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
  classified_at: 2026-11-17T22:48:22Z
---
# TCK-0002 - MCP App Querido Diário a partir de município do IBGE

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=user.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

## Log de transicoes

- 2026-11-17T22:48:22Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-17T22:48:22Z - **triaged** - M: extensão do servidor Node e busca municipal com compatibilidade textual [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-17T22:49:22Z - **designed** - Painel compartilhado, cidade selecionada e fallback negociado
- 2026-11-17T22:49:22Z - **executing** - Construir painel, contrato e validação do manifesto
