---
id: TCK-0003
slug: mcp-app-para-indicadores-do-banco-central
title: "MCP App para indicadores do Banco Central"
source: user
created_at: 2026-11-17T23:32:11Z
created_by: ops
updated_at: 2026-11-17T23:33:00Z
status: executing
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0003
linked_runs:
  - RUN-20261117-233225-bacen
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
  classified_at: 2026-11-17T23:32:24Z
---
# TCK-0003 - MCP App para indicadores do Banco Central

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=user.

## Falsificador

test/integration/transports.mjs:57 só admite os recursos IBGE e Querido Diário. A entrega reprova se faltar o recurso de bacen_taxas, se o gráfico misturar unidades ou exibir referências futuras como último dado publicado, ou se as chamadas sem período mudarem de envelope.

## Log de transicoes

- 2026-11-17T23:32:11Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-17T23:32:24Z - **noted** - body:falsifier (replace): Registrar condições de reprovação e evidência antes da implementação
- 2026-11-17T23:32:24Z - **triaged** - App de séries oficiais, compatibilidade textual e CI na VPS [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-17T23:33:00Z - **designed** - Séries independentes com unidade, gráficos históricos e janela oficial
- 2026-11-17T23:33:00Z - **executing** - Construir UI e contrato opcional de período
