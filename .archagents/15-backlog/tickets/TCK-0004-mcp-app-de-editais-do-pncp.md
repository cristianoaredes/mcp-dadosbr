---
id: TCK-0004
slug: mcp-app-de-editais-do-pncp
title: "MCP App de editais do PNCP"
source: user
created_at: 2026-11-17T23:59:44Z
created_by: ops
updated_at: 2026-11-18T00:09:02Z
status: done
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0004
linked_runs:
  - RUN-20261117-235945-pncp
linked_verifications:
  - VER-20261118-000832-tck-0004
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
  classified_at: 2026-11-17T23:59:44Z
---
# TCK-0004 - MCP App de editais do PNCP

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=user.

## Falsificador

Em test/integration/transports.mjs:57 ainda não há UI do PNCP. Reprova se órgão, período e modalidade não chegam à API, se HTTP 204 for tratado como falha, se o link canônico não puder ser verificado ou se o envelope textual existente mudar.

## Log de transicoes

- 2026-11-17T23:59:44Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-17T23:59:44Z - **noted** - body:falsifier (replace): Fixar critérios de reprovação antes da implementação
- 2026-11-17T23:59:44Z - **triaged** - Painel de publicações e preservação de chamadas existentes [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-18T00:00:20Z - **designed** - Modo filtrado documentado e fallback preservado
- 2026-11-18T00:00:21Z - **executing** - Implementar consulta oficial e painel
- 2026-11-18T00:08:32Z - **verifying** - Protocolo, empacotamento e AppBridge com API pública exercitados
- 2026-11-18T00:09:02Z - **done** - Critérios locais e P10 concluídos; CI remoto condiciona o merge
