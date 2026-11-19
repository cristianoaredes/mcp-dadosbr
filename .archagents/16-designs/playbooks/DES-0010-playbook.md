---
id: DES-0010-playbook
created_at: 2026-11-19T06:14:30Z
status: approved
design: DES-0010
ticket: TCK-0010
approved_at: 2026-11-19T06:14:30Z
approved_by: operator
executed_at: "2026-11-19T06:17:04Z"
executed_runs:
  - RUN-20261119-061512-release-0-6-0-agpl3
dry_run_supported: true
total_steps: 3
destructive_steps: 0
environments:
  - dev
estimated_duration: 15min-30min
branch_prefix: chore/
branch_name: chore/TCK-0010-release-0-6-0-agpl3
commit_per_step: false
commit_message_format: "chore(TCK-0010): passo N/3: <titulo>"
---
# Playbook - DES-0010

**Ticket:** TCK-0010
**Objetivo:** Candidata npm 0.6.0 sob GNU AGPL-3.0-only

## Pré-requisitos

- [x] `main` @ `9e74ba5` já contém `LICENSE` (AGPL-3.0 verbatim), `NOTICE.md` e `README.md` no padrão Orqo (`PR #21`).
- [x] Operador aprovou bump para `0.6.0` (evitando auto-upgrade silencioso em `^0.5.0`).

## Modo dry-run

`/ops-execute DES-0010 --dry-run`

## Passos

1. **Passo 1/3 — Versão `0.6.0` e changelog:** atualizar `package.json`, `package-lock.json` e `smithery.yaml` para `0.6.0` e adicionar `## [0.6.0] - 2026-11-19` em `CHANGELOG.md`.
2. **Passo 2/3 — Notas de transição e AS-IS:** alinhar menções `0.5.0` (MIT) → `0.6.0` (`AGPL-3.0-only`) em `NOTICE.md` e `README.md` (sem antecipar publicação npm) e atualizar `.archagents/00-overview.md` + `_meta.json`.
3. **Passo 3/3 — Validação e instalação limpa do tarball:** executar `npm ci`, `npm run build`, `npm test`, `npm run test:transport`, `npm run build:worker`, teste de instalação limpa do tarball `0.6.0` em diretório temporário, `criteria-check.py` e verificação independente (`VER-*`).

## Critérios de sucesso do playbook

- [x] `criteria-check.py --ticket TCK-0010` passa 2/2.
- [x] Tarball `0.6.0` instalado em diretório limpo passa `test:transport` e contém `LICENSE`, `NOTICE.md`, `README.md` e os 5 MCP Apps.
- [x] Verificação independente aprova.

## Log de execuções

- `RUN-20261119-061512-release-0-6-0-agpl3` (completed — `approved-with-notes`)
