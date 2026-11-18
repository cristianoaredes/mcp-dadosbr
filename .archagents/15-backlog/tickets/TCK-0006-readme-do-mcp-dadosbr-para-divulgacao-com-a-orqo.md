---
id: TCK-0006
slug: readme-do-mcp-dadosbr-para-divulgacao-com-a-orqo
title: "README do MCP DadosBR para divulgação com a Orqo"
source: user
created_at: 2026-11-18T02:59:32Z
created_by: ops
updated_at: 2026-11-18T03:08:24Z
status: done
severity: low
category: docs
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0006
linked_runs:
  - RUN-20261118-030006-readme-orqo
linked_verifications:
  - VER-20261118-030814-tck-0006
linked_docs:
  - README.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "git diff --check"
  - check: "npm run build && npm run test:transport"
depth_decision:
  workflow: inline
  design: skip
  verify: lightweight
  source: routing-classifier
  classified_at: 2026-11-18T02:59:43Z
---
# TCK-0006 - README do MCP DadosBR para divulgação com a Orqo

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=user.

## Falsificador

README.md:27 recomenda o npm como início rápido. A versão pública 0.4.1 não contém os cinco recursos HTML que o texto descreve. A revisão reprova se não oferecer configuração reproduzível desde o código-fonte ou confundir provedor cadastral, fonte oficial e disponibilidade de release.

## Log de transicoes

- 2026-11-18T02:59:32Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-18T02:59:43Z - **noted** - body:falsifier (replace): Registrar critérios verificáveis da documentação
- 2026-11-18T02:59:43Z - **triaged** - Revisão documental de escopo S e risco baixo [depth_decision do routing-classifier: workflow inline, design skip, verify lightweight]
- 2026-11-18T02:59:44Z - **linked** - links updated
- 2026-11-18T03:00:06Z - **designed** - Página de projeto, guia reproduzível e histórico de governança
- 2026-11-18T03:00:06Z - **executing** - Reescrever a entrada pública do projeto
- 2026-11-18T03:05:16Z - **verifying** - Evidências do README, do build local e dos dois transportes disponíveis
- 2026-11-18T03:08:24Z - **done** - README validado localmente e confirmado por verificador independente; publicação futura
