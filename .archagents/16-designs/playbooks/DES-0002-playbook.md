---
id: DES-0002-playbook
created_at: 2026-11-17T22:48:44Z
status: approved
design: DES-0002
ticket: TCK-0002
approved_at: 2026-11-17T22:48:44Z
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
branch_name: feature/TCK-0002-querido-diario-mcp-app
commit_per_step: false
commit_message_format: "[TCK-0002] passo N/3: <titulo>"
---
# Playbook - DES-0002

**Ticket:** TCK-0002
**Objetivo:** Busca do Querido Diário com contexto municipal

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0002 --dry-run`

## Passos

1. Registrar o recurso no servidor Node e conferir o contrato público da API.
2. Conectar o painel compartilhado ao município selecionado, preservando código e filtros em cada página.
3. Exercitar ambos os transportes, empacotamento, navegador visível e runner efêmero da VPS.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- *(sem execucoes ainda)*
