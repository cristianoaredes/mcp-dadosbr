---
id: TCK-0012
slug: configurar-supervisor-efemero-docker-de-runners-github-actions-para-ci-yml-e-rel
title: "Configurar supervisor efêmero Docker de runners GitHub Actions para ci.yml e release.yml"
source: request
created_at: 2026-11-19T17:45:55Z
created_by: ops
updated_at: 2026-11-19T18:12:45Z
status: done
severity: medium
category: infra
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0012
linked_runs:
  - RUN-20261119-174741-ephemeral-runner-supervisor
linked_verifications:
  - VER-20261119-181158-tck-0012
linked_docs: []
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "python3 -B -m unittest discover -s infra/runner -p \"test_*.py\" -v"
    expect: OK
  - check: "bash -n infra/runner/setup-network-isolation.sh && ! grep -rnE \"(ghp_|github_pat_|BEGIN .*PRIVATE KEY)\" infra/runner/"
    expect: ""
  - check: "git diff --check && npm test"
    expect: "286 passed"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-19T17:45:55Z
---
# TCK-0012 - Configurar supervisor efêmero Docker de runners GitHub Actions para ci.yml e release.yml

## Contexto

Os workflows `.github/workflows/ci.yml` e `.github/workflows/release.yml` exigem runners `self-hosted` efêmeros com labels dinâmicos por execução (`dadosbr-ci-<run_id>`, `dadosbr-pr-<run_id>`, `dadosbr-release-<run_id>`), mas o repositório não possuía supervisor permanente automatizado na VPS, exigindo disparo manual via SSH a cada PR/push/release.

Como `cristianoaredes/mcp-dadosbr` é repositório público (`visibility: public`), a arquitetura escolhida pelo operador é um **supervisor efêmero Docker por polling** (`systemd`), sem portas públicas de entrada, restrito a `ci.yml` e `release.yml`, com isolamento estrito de rede e container efêmero descartado após cada job.

## Falsificador

Antes deste ticket, `infra/runner/` não existia no repositório, não havia serviço `dadosbr-runner-supervisor.service` na VPS Linux de build, e novos runs de `.github/workflows/ci.yml` ou `.github/workflows/release.yml` permaneciam indefinidamente em `queued` sem execução manual externa.

## Log de transicoes

- 2026-11-19T17:45:55Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-19T17:45:55Z - **triaged** - Triagem concluída: infra de runner efêmero Docker por polling para ci.yml e release.yml (repositório público; security_sensitive) [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-19T17:47:14Z - **linked** - links updated
- 2026-11-19T17:47:14Z - **designed** - DES-0012 e playbook aprovados pelo operador com Threat Model completo
- 2026-11-19T17:47:53Z - **linked** - links updated
- 2026-11-19T17:47:53Z - **executing** - Iniciando implementacao do supervisor efemero Docker e instalacao na VPS (RUN-20261119-174741-ephemeral-runner-supervisor)
- 2026-11-19T17:55:13Z - **verifying** - Implementacao, testes unitarios/negativos, instalacao na VPS e sonda live de contencao concluidos; iniciando verificacao adversarial independente
- 2026-11-19T18:12:45Z - **linked** - links updated
- 2026-11-19T18:12:45Z - **done** - Pass 2 da verificacao adversarial independente aprovado (VER-20261119-181158-tck-0012); 23/23 testes Python, 286/286 Vitest, sonda live IPv4+IPv6 aprovada na VPS
