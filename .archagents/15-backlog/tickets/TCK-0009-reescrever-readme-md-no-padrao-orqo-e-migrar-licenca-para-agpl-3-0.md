---
id: TCK-0009
slug: reescrever-readme-md-no-padrao-orqo-e-migrar-licenca-para-agpl-3-0
title: "Reescrever README.md no padrão Orqo e migrar licença para AGPL-3.0"
source: user
created_at: 2026-11-19T05:23:26Z
created_by: ops
updated_at: 2026-11-19T05:42:10Z
status: done
severity: medium
category: docs
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0009
linked_runs:
  - RUN-20261119-052343-readme-orqo-agpl3
linked_verifications:
  - VER-20261119-054107-tck-0009
linked_docs:
  - README.md
  - LICENSE
  - package.json
  - smithery.yaml
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "node -e \"const fs=require(\\\"node:fs\\\"),p=JSON.parse(fs.readFileSync(\\\"package.json\\\",\\\"utf8\\\")),l=JSON.parse(fs.readFileSync(\\\"package-lock.json\\\",\\\"utf8\\\")); if(p.license!==\\\"AGPL-3.0-only\\\"||l.packages[\\\"\\\"].license!==\\\"AGPL-3.0-only\\\"||!p.files.includes(\\\"NOTICE.md\\\")) process.exit(1)\" && head -n 2 LICENSE | grep -q \"GNU AFFERO GENERAL PUBLIC LICENSE\" && grep -q 'license: \"AGPL-3.0-only\"' smithery.yaml && test -f NOTICE.md"
  - check: "git diff --check && npm run build && npm test && npm run test:transport"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-19T05:23:43Z
---
# TCK-0009 - Reescrever README.md no padrão Orqo e migrar licença para AGPL-3.0

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=user.

## Falsificador

`LICENSE`, `package.json:72`, `package-lock.json:11`, `smithery.yaml:8` e `README.md:86` ainda declaram MIT; `README.md` ainda trata `0.5.0` como publicação futura e não cobre o catálogo completo das 23 ferramentas, perímetro de execução e limites no padrão `orqo.pro`. A entrega reprova se qualquer manifesto permanecer em MIT, se `LICENSE` não for o texto oficial GNU AGPL-3.0, se atribuições de terceiros se perderem ou se links locais, build, testes unitários ou testes de transporte falharem.

## Log de transicoes

- 2026-11-19T05:23:26Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-19T05:23:43Z - **noted** - body:falsifier (replace): Registrar limite verificável de README e migração AGPL-3.0
- 2026-11-19T05:23:43Z - **triaged** - Documentação pública e relicenciamento para AGPL-3.0-only com escopo claro e critérios executáveis [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-19T05:24:29Z - **linked** - links updated
- 2026-11-19T05:24:29Z - **designed** - Design DES-0009 aprovado com escopo e playbook de 3 passos
- 2026-11-19T05:24:52Z - **executing** - Branch chore/TCK-0009-readme-orqo-agpl3 criada; iniciar passos 1-3 do DES-0009
- 2026-11-19T05:31:04Z - **verifying** - Execução e acceptance 2/2 concluídos; encaminhando para verificação independente em contexto limpo
- 2026-11-19T05:41:45Z - **linked** - links updated
- 2026-11-19T05:42:10Z - **done** - README.md no padrão orqo.pro e migração AGPL-3.0-only validados por acceptance 2/2 e verificação independente VER-20261119-054107-tck-0009
