---
id: DES-0005-playbook
created_at: 2026-11-18T02:01:50Z
status: approved
design: DES-0005
ticket: TCK-0005
approved_at: 2026-11-18T02:01:50Z
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
branch_name: feature/TCK-0005-cnpj-mcp-app
commit_per_step: false
commit_message_format: "[TCK-0005] passo N/3: <titulo>"
---
# Playbook - DES-0005

**Ticket:** TCK-0005
**Objetivo:** Ficha cadastral e proveniência do provedor de CNPJ

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0005 --dry-run`

## Passos

1. Confirmar contratos dos provedores.
2. Implementar projeção e ficha sem mudar o JSON.
3. Validar navegador, P10 e CI na VPS.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- *(sem execucoes ainda)*
