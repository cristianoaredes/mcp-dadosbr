---
id: DES-0012-playbook
created_at: 2026-11-19T17:45:55Z
status: approved
design: DES-0012
ticket: TCK-0012
approved_at: 2026-11-19T17:45:55Z
approved_by: operator
executed_at: 2026-11-19T17:53:18Z
executed_runs:
  - RUN-20261119-174741-ephemeral-runner-supervisor
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
  - vps
estimated_duration: 30min-1h
branch_prefix: feat/
branch_name: feat/TCK-0012-ephemeral-runner-supervisor
commit_per_step: false
commit_message_format: "feat(TCK-0012): passo N/4: <titulo>"
---
# Playbook - DES-0012

**Ticket:** TCK-0012
**Objetivo:** Supervisor efêmero Docker com isolamento de rede para runners de `ci.yml` e `release.yml`

## Pre-requisitos

- [x] Worktree limpa em `feat/TCK-0012-ephemeral-runner-supervisor` sobre `origin/main` (`14d08e8`).
- [x] Pre-Execution Briefing aprovado pelo operador.

## Passos

1. **Passo 1/4:** Criar artefatos IaC/código em `infra/runner/` (`Dockerfile`, `supervisor.py`, `test_supervisor.py`, `setup-network-isolation.sh`, `dadosbr-runner-supervisor.service`, `env.example`, `README.md`) sem segredos nem hostnames privados.
2. **Passo 2/4:** Rodar suíte unitária/negativa (`python3 -m unittest`), `bash -n`, `npm test` e atualizar `.archagents/06-infra-devops.md` e `.archagents/10-runbooks.md`.
3. **Passo 3/4:** Instalar em `/opt/dadosbr-runner` na VPS dedicada, aplicar `setup-network-isolation.sh`, configurar `dadosbr-runner-supervisor.service` com `/etc/dadosbr-runner/env` (`0600`, aguardando Fine-Grained PAT do operador) e executar **testes negativos reais** de contenção no container isolado.
4. **Passo 4/4:** Executar `criteria-check.py --ticket TCK-0012`, verificação adversarial independente em contexto fresco (`VER-*`) e fechar o ticket.

## Criterios de sucesso do playbook

- [x] `python3 -m unittest discover -s infra/runner -p "test_*.py" -v` passa.
- [x] `bash -n infra/runner/setup-network-isolation.sh` e hygiene scan sem achados.
- [x] `git diff --check && npm test` (286/286) passam.
- [x] Testes negativos reais de rede/container aprovados na VPS.

## Log de execucoes

- `RUN-20261119-174741-ephemeral-runner-supervisor` — concluído (14/14 testes Python, 286/286 Vitest, sonda negativa live de contenção aprovada na VPS; aguardando Fine-Grained PAT do operador).
