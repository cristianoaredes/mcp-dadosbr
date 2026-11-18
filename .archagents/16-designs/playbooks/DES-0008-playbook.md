---
id: DES-0008-playbook
created_at: 2026-11-18T03:19:07Z
status: approved
design: DES-0008
ticket: TCK-0008
approved_at: 2026-11-18T03:19:07Z
approved_by: codex
executed_at: "2026-11-18T03:30:11+00:00"
executed_runs: [RUN-20261118-031907-npm-release]
dry_run_supported: true
total_steps: 2
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: chore/
branch_name: chore/TCK-0008-release-0-5-0
commit_per_step: false
commit_message_format: "[TCK-0008] passo N/2: <titulo>"
---
# Playbook - DES-0008

**Ticket:** TCK-0008
**Objetivo:** Publicação npm por SHA validado e runner por execução

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0008 --dry-run`

## Passos

1. Preparar 0.5.0, documentação e workflows isolados.
2. Verificar pacote instalado, Actionlint e CI.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- 2026-11-18T03:30:11+00:00 · RUN-20261118-031907-npm-release · Candidata verificada localmente.
