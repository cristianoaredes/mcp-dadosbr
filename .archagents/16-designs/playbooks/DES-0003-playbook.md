---
id: DES-0003-playbook
created_at: 2026-11-17T23:32:25Z
status: approved
design: DES-0003
ticket: TCK-0003
approved_at: 2026-11-17T23:32:25Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 3
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: feature/
branch_name: feature/TCK-0003-bacen-mcp-app
commit_per_step: false
commit_message_format: "[TCK-0003] passo N/3: <titulo>"
---
# Playbook - DES-0003

**Ticket:** TCK-0003
**Objetivo:** Painel SGS com séries e períodos explícitos

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0003 --dry-run`

## Passos

1. Confirmar catálogo SGS e endpoints de período.
2. Implementar painel e preservar o contrato de texto.
3. Exercitar AppBridge visível, revisão independente e CI dedicado do PR.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- *(sem execucoes ainda)*
