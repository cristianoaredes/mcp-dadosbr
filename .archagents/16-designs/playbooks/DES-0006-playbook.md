---
id: DES-0006-playbook
created_at: 2026-11-18T02:59:43Z
status: approved
design: DES-0006
ticket: TCK-0006
approved_at: 2026-11-18T02:59:43Z
approved_by: codex
executed_at: "2026-11-18T03:06:16+00:00"
executed_runs: [RUN-20261118-030006-readme-orqo]
dry_run_supported: true
total_steps: 2
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: chore/
branch_name: chore/TCK-0006-readme-orqo
commit_per_step: false
commit_message_format: "[TCK-0006] passo N/2: <titulo>"
---
# Playbook - DES-0006

**Ticket:** TCK-0006
**Objetivo:** Apresentação pública do MCP DadosBR e vínculo com a Orqo

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0006 --dry-run`

## Passos

1. Reescrever o README a partir dos fluxos e fontes conferidos.
2. Conferir configuração, links, pacote e transportes. Solicitar verificação independente.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- 2026-11-18T03:06:16+00:00 · RUN-20261118-030006-readme-orqo · Documento atualizado e checks locais aprovados.
