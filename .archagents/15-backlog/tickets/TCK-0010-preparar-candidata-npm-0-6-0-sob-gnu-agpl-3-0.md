---
id: TCK-0010
slug: preparar-candidata-npm-0-6-0-sob-gnu-agpl-3-0
title: "Preparar candidata npm 0.6.0 sob GNU AGPL-3.0"
source: user
created_at: 2026-11-19T06:14:29Z
created_by: ops
updated_at: 2026-11-19T06:23:30Z
status: done
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0010
linked_runs:
  - RUN-20261119-061512-release-0-6-0-agpl3
linked_verifications:
  - VER-20261119-062258-tck-0010
linked_docs:
  - package.json
  - CHANGELOG.md
  - smithery.yaml
  - README.md
  - NOTICE.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "node -e \"const fs=require(\\\"node:fs\\\"),p=JSON.parse(fs.readFileSync(\\\"package.json\\\",\\\"utf8\\\")),l=JSON.parse(fs.readFileSync(\\\"package-lock.json\\\",\\\"utf8\\\")); if(p.version!==\\\"0.6.0\\\"||p.license!==\\\"AGPL-3.0-only\\\"||l.version!==\\\"0.6.0\\\"||l.packages[\\\"\\\"].version!==\\\"0.6.0\\\"||l.packages[\\\"\\\"].license!==\\\"AGPL-3.0-only\\\") process.exit(1)\" && grep -q 'version: \"0.6.0\"' smithery.yaml && grep -q \"^## \\[0\\.6\\.0\\]\" CHANGELOG.md && head -n 2 LICENSE | grep -q \"GNU AFFERO GENERAL PUBLIC LICENSE\""
  - check: "git diff --check && npm run build && npm test && npm run test:transport && npm run build:worker"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-19T06:14:30Z
---
# TCK-0010 - Preparar candidata npm 0.6.0 sob GNU AGPL-3.0

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=user.

## Falsificador

`package.json:3` e `package-lock.json:3,9` ainda declaram `0.5.0` (versão já publicada no npm sob MIT) e `smithery.yaml:5` ainda declara `0.3.1`; `CHANGELOG.md` não possui entrada `0.6.0`. A candidata reprova se qualquer manifesto divergir de `0.6.0` / `AGPL-3.0-only`, se o tarball instalado em diretório limpo falhar no `test:transport` ou omitir `LICENSE`/`NOTICE.md`/5 MCP Apps, ou se o README afirmar que `0.6.0` já está publicado no npm.

## Log de transicoes

- 2026-11-19T06:14:29Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-19T06:14:29Z - **noted** - body:falsifier (replace): Fixar critério falsificável da candidata 0.6.0 AGPL-3.0
- 2026-11-19T06:14:30Z - **triaged** - Bump SemVer minor para 0.6.0 (mudança de licença MIT -> AGPL-3.0-only evita auto-upgrade silencioso em ^0.5.0) [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-19T06:15:12Z - **linked** - links updated
- 2026-11-19T06:15:12Z - **designed** - DES-0010 aprovado: bump minor 0.6.0 AGPL-3.0-only, changelog e smoke de tarball limpo
- 2026-11-19T06:15:12Z - **linked** - links updated
- 2026-11-19T06:15:12Z - **executing** - Iniciar preparo da candidata 0.6.0 na branch chore/TCK-0010-release-0-6-0-agpl3
- 2026-11-19T06:17:52Z - **verifying** - Candidata 0.6.0 empacotada, instalada em diretório limpo e validada; encaminhando para verificação independente
- 2026-11-19T06:23:29Z - **linked** - links updated
- 2026-11-19T06:23:30Z - **done** - Candidata 0.6.0 AGPL-3.0-only validada por tarball limpo, criteria-check 2/2 e verificação independente VER-20261119-062258-tck-0010; publicação depende do CI verde em main
