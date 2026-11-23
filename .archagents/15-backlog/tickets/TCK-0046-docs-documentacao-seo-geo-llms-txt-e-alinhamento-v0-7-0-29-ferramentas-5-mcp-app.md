---
id: TCK-0046
slug: docs-documentacao-seo-geo-llms-txt-e-alinhamento-v0-7-0-29-ferramentas-5-mcp-app
title: "docs: documentação SEO/GEO, llms.txt e alinhamento v0.7.0 (29 ferramentas, 5 MCP Apps)"
source: operator
created_at: 2026-11-23T13:32:25Z
created_by: ops
updated_at: 2026-11-23T13:53:50Z
status: done
severity: low
category: docs
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0042
linked_runs:
  - RUN-20261123-133318-seo-geo-docs
linked_verifications:
  - VER-20261123-135246-tck-0046
linked_docs: []
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npm test"
  - check: "npm run build && npm run build:worker"
  - check: "npm run test:transport"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-23T13:32:57Z
---
# TCK-0046 - docs: documentação SEO/GEO, llms.txt e alinhamento v0.7.0 (29 ferramentas, 5 MCP Apps)

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=operator.

## Falsificador

Antes do fix na `main` (`62a8f2d`): `docs/README.md:88-100` listava apenas 4 ferramentas (`cnpj_lookup`, `cep_lookup`, `cnpj_search`, `sequentialthinking`), `~60%` de cobertura e `88/88` testes; `docs/pt-br/desenvolvimento/metricas.md:7-8,34-37,158,212` reportava `88/88` testes, `~60%` e TTL `60s`; `CHANGELOG.md` não possuía entrada para `[0.7.0]` (PR #27 e PR #28); `llms.txt` inexistia na raiz; `README.md:157` citava `package.json#L110` e `README.md:174,406` não distinguiam explicitamente `0.6.0` (npm `latest`) de `0.7.0` (`main` via build); `package.json` mencionava apenas CNPJ/CEP e busca web na descrição; e a homepage do repositório GitHub estava vazia (`""`).

## Log de transicoes

- 2026-11-23T13:32:25Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-23T13:32:57Z - **triaged** - SEO/GEO docs: alinhar v0.7.0 (29 tools, 5 MCP Apps), aviso npm latest=0.6.0, limites runtime, CHANGELOG [0.7.0], llms.txt, metricas stale e metadados package.json/GitHub [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-23T13:33:17Z - **designed** - DES-0042 com scope_files completo para SEO/GEO, llms.txt e v0.7.0
- 2026-11-23T13:33:18Z - **executing** - Branch docs/TCK-0046-seo-geo-docs solicitada pelo plano aprovado (em vez do prefixo chore/ do playbook) [contrato do handoff forçado: branch: 'docs/TCK-0046-seo-geo-docs' fora dos prefixos git-flow ('feature/', 'bugfix/', 'chore/', 'hotfix/') (DES-0192)]
- 2026-11-23T13:53:50Z - **verifying** - Independent P10 Round 2 verification be1e1120 PASS/APPROVED + VER-20261123-135246-tck-0046
- 2026-11-23T13:53:50Z - **done** - Docs SEO/GEO, llms.txt, CHANGELOG [0.7.0], metricas/README v0.7.0 vs npm 0.6.0 e metadados GitHub verified
