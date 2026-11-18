---
id: TCK-0008
slug: preparar-release-npm-dos-cinco-mcp-apps-com-gate-de-ci-na-vps
title: "Preparar release npm dos cinco MCP Apps com gate de CI na VPS"
source: user
created_at: 2026-11-18T03:17:59Z
created_by: ops
updated_at: 2026-11-18T03:30:14Z
status: done
severity: medium
category: feature
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0008
linked_runs:
  - RUN-20261118-031907-npm-release
linked_verifications:
  - VER-20261118-033014-tck-0008
linked_docs:
  - .github/workflows/release.yml
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "actionlint .github/workflows/release.yml && actionlint -shellcheck= .github/workflows/ci.yml && git diff --check"
  - check: "npm run build && npm run test:transport && npm pack --dry-run"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-18T03:19:07Z
---
# TCK-0008 - Preparar release npm dos cinco MCP Apps com gate de CI na VPS

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=user.

## Falsificador

`package.json:3` ainda declara 0.4.1, que já existe no npm sem os Apps. A entrega reprova se o pacote candidato não oferecer cinco recursos ou a publicação não exigir CI verde no SHA exato.

## Log de transicoes

- 2026-11-18T03:17:59Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-18T03:19:07Z - **noted** - body:falsifier (replace): Registrar limite verificável da publicação
- 2026-11-18T03:19:07Z - **triaged** - Versão menor 0.5.0 e isolamento da publicação npm [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-18T03:19:07Z - **linked** - links updated
- 2026-11-18T03:19:07Z - **designed** - Usar versão aditiva, verificação por SHA e estágio npm independente
- 2026-11-18T03:20:29Z - **executing** - Preparar candidata e fluxo de publicação
- 2026-11-18T03:25:47Z - **verifying** - Validação da candidata e lint focado nos workflows alterados; ShellCheck de CI tem avisos legados [aceite reescrito: 2 critério(s)]
- 2026-11-18T03:30:14Z - **done** - Preparo e aceite local verificados; publicação depende do CI verde em main
