---
id: TCK-0001
slug: explorador-de-localidades-do-ibge-com-mcp-apps
title: "Explorador de localidades do IBGE com MCP Apps"
source: user
created_at: 2026-11-17T22:10:09Z
created_by: ops
updated_at: 2026-11-17T22:25:24Z
status: done
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0001
linked_runs:
  - RUN-20261117-221052-ibge-mcp-app
linked_verifications:
  - VER-20261117-222512-tck-0001
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
  classified_at: 2026-11-17T22:10:09Z
---
# TCK-0001 - Explorador de localidades do IBGE com MCP Apps

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=user.

## Falsificador

O piloto reprova se ibge_localidades deixar de devolver o JSON textual original, se resource/read não entregar o HTML empacotado ou se regiões, UFs e municípios não puderem ser navegados no host. O smoke existente deve manter 23 ferramentas por transporte em test/integration/transports.mjs:16-54.

## Log de transicoes

- 2026-11-17T22:10:09Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-17T22:10:09Z - **triaged** - Piloto de UI para ibge_localidades com fallback textual e prova na VPS [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-17T22:10:09Z - **noted** - body:falsifier (replace): Delimitar os contratos verificáveis
- 2026-11-17T22:10:52Z - **designed** - Contrato textual preservado, UI via metadata e recurso isolado
- 2026-11-17T22:11:26Z - **executing** - Implementar piloto e critérios aprovados
- 2026-11-17T22:16:47Z - **verifying** - Provas locais e navegação no host aprovadas; validar na VPS
- 2026-11-17T22:25:24Z - **done** - Critérios, P10 independente, host visível e validação dedicada na VPS concluídos
