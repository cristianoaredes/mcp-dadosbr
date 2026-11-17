---
id: DES-0001-playbook
created_at: 2026-11-17T22:10:09Z
status: approved
design: DES-0001
ticket: TCK-0001
approved_at: 2026-11-17T22:10:09Z
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
branch_name: feature/TCK-0001-ibge-mcp-app
commit_per_step: false
commit_message_format: "[TCK-0001] passo N/3: <titulo>"
---
# Playbook IBGE

1. Empacotar UI e expor recurso e fallback no CLI.
2. Verificar protocolo, pacote e navegação em host.
3. Executar CI no runner dedicado para o SHA de produto.
