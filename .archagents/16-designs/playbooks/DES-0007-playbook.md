---
id: DES-0007-playbook
created_at: 2026-11-18T03:13:26Z
status: approved
design: DES-0007
ticket: TCK-0007
approved_at: 2026-11-18T03:13:26Z
approved_by: codex
executed_at: "2026-11-18T03:19:47+00:00"
executed_runs: [RUN-20261118-031326-stdio-metrics]
dry_run_supported: true
total_steps: 2
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: bugfix/
branch_name: bugfix/TCK-0007-stdio-metrics
commit_per_step: false
commit_message_format: "[TCK-0007] passo N/2: <titulo>"
---
# Playbook - DES-0007

**Ticket:** TCK-0007
**Objetivo:** Métricas em stderr e regressão no protocolo stdio

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0007 --dry-run`

## Passos

1. Acrescentar a regressão e reproduzir o erro no stdio.
2. Mover a métrica para stderr e conferir transportes, unitários e Worker.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- 2026-11-18T03:19:47+00:00 · RUN-20261118-031326-stdio-metrics · Regra de transporte verificada.
