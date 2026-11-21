---
id: DES-0020-playbook
created_at: 2026-11-20T18:31:24Z
status: approved
design: DES-0020
ticket: TCK-0015
approved_at: 2026-11-20T18:31:24Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: ops/
branch_name: ops/TCK-0015-endurecimento-do-transporte-http-sse-local-do-cli-e-permissoes-de-cloudflare-dep
commit_per_step: false
commit_message_format: "[TCK-0015] passo N/4: <titulo>"
---
# Playbook - DES-0020

**Ticket:** TCK-0015
**Objetivo:** Endurecimento do transporte HTTP/SSE local do CLI e permissoes de cloudflare-deploy.yml

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0020 --dry-run`

## Passos

1. Implementar `httpHost` em `lib/types/index.ts` e `lib/config/index.ts`, criar `lib/adapters/cli-http.ts`, refatorar `lib/adapters/cli.ts` e endurecer `.github/workflows/cloudflare-deploy.yml`.
2. Criar suíte `test/unit/cli-http-security.test.ts` cobrindo bind default, headers defensivos, anti-DNS-rebinding `Host`, anti-CSRF `Origin`/CORS, validação/`Map`/cap de `sessionId` e permissões de `cloudflare-deploy.yml`.
3. Atualizar `.archagents/06-infra-devops.md` e `.archagents/07-security-compliance.md`.
4. Executar `vitest`, `npm test`, `tsc` + `tsc.worker`, `build` + `build:worker`, `test:transport` e `criteria-check.py`.

## Rollback

- Reverter commit da branch `bugfix/TCK-0015-cli-http-hardening-cf-workflow-perms` via `git revert` na worktree isolada.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- *(sem execucoes ainda)*
