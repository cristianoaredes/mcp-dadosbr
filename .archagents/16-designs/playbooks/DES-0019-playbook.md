---
id: DES-0019-playbook
created_at: 2026-11-20T17:54:57Z
status: approved
design: DES-0019
ticket: TCK-0021
approved_at: 2026-11-20T17:54:57Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 5
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: ops/
branch_name: ops/TCK-0021-remover-dependencias-mortas-em-runtime-atualizar-zod-express-e-adicionar-npm-aud
commit_per_step: false
commit_message_format: "[TCK-0021] passo N/5: <titulo>"
---
# Playbook - DES-0019

**Ticket:** TCK-0021
**Objetivo:** Remover dependencias mortas em runtime, atualizar zod/express e adicionar npm audit prod no CI

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0019 --dry-run`

## Passos

1. Remover `lib/workers/mcp-agent.ts`, remover dependências mortas (`agents`, `@smithery/sdk`, `workers-mcp`, `async-mutex`) de `package.json`, atualizar `zod` (`^4.6.7`) e `express` (`^5.3.0`), e adaptar compatibilidade Zod v4 em `smithery.ts`, `registry.ts` e `tool-schemas.ts`.
2. Remover o symlink `$WT/node_modules` e executar `npm install` + eventual `npm audit fix --omit=dev` (sem `--force`) + `npm ci` exclusivamente em `$WT`.
3. Adicionar step `npm audit --omit=dev --audit-level=high` no job `lint` do `.github/workflows/ci.yml` e criar `test/unit/dependency-hygiene.test.ts`.
4. Atualizar `.archagents/06-infra-devops.md` e `.archagents/07-security-compliance.md` (removendo referência obsoleta a `lib/workers/mcp-agent.ts`).
5. Limpar `build/`, executar `npm audit --omit=dev --audit-level=high`, `npm test`, `tsc`, `tsc.worker`, `build`, `build:worker`, `test:transport`, `npm pack --dry-run --json` e `criteria-check.py`.

## Rollback

- Reverter commit da branch `bugfix/TCK-0021-remove-dead-deps-prod-audit-ci` via `git revert` e restaurar `npm ci` na worktree.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- *(sem execucoes ainda)*
