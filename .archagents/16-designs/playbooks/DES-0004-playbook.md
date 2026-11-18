---
id: DES-0004-playbook
created_at: 2026-11-17T23:59:45Z
status: approved
design: DES-0004
ticket: TCK-0004
approved_at: 2026-11-17T23:59:45Z
approved_by: codex
executed_at: "2026-11-18T00:08:32+00:00"
executed_runs: [RUN-20261117-235945-pncp]
dry_run_supported: true
total_steps: 3
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: feature/
branch_name: feature/TCK-0004-pncp-mcp-app
commit_per_step: false
commit_message_format: "[TCK-0004] passo N/3: <titulo>"
---
# Playbook - DES-0004

**Ticket:** TCK-0004
**Objetivo:** Consulta oficial de publicações do PNCP com filtros e links permanentes

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0004 --dry-run`

## Passos

1. Confirmar contrato oficial, modalidades, 204 e link permanente.
2. Implementar a consulta filtrada, painel e compatibilidade.
3. Exercitar AppBridge, verificação independente e CI dedicado do PR.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- 2026-11-18T00:08:32+00:00 · RUN-20261117-235945-pncp · consulta oficial e checagens locais aprovadas.
