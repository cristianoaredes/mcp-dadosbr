---
id: DES-0022-playbook
created_at: 2026-11-20T19:11:31Z
status: approved
design: DES-0022
ticket: TCK-0022
approved_at: 2026-11-20T19:11:31Z
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
branch_name: bugfix/TCK-0022-devdeps-cves-wrangler-ci-alignment
commit_per_step: false
commit_message_format: "[TCK-0022] passo N/4: <titulo>"
---
# Playbook - DES-0022

**Ticket:** TCK-0022
**Objetivo:** Atualizar devDependencies com CVEs criticos/high (`vitest`, `@vitest/ui`, `vite`, `wrangler`, `@cloudflare/workers-types`, transitivas) e alinhar `wranglerVersion` no CI.

## Pre-requisitos

- [x] `$WT/node_modules` é diretório real isolado (não symlink para `$MAIN`).
- [x] Branch `bugfix/TCK-0022-devdeps-cves-wrangler-ci-alignment` isolada em `$WT`.

## Modo dry-run

`/ops-execute DES-0022 --dry-run`

## Passos

1. **Passo 1/4 — Atualizar `package.json` (`devDependencies`) e lockfile:** Elevar `@cloudflare/workers-types@^5.20261120.1`, `@vitest/ui@^4.1.12`, `vite@^7.3.8`, `vitest@^4.1.12` e `wrangler@^4.166.0`; rodar `npm install && npm audit fix` e validar reprodutibilidade via `npm ci`.
2. **Passo 2/4 — Alinhar `wranglerVersion` no workflow Cloudflare:** Atualizar `.github/workflows/cloudflare-deploy.yml:L71` de `"3.95.0"` para `"4.166.0"`.
3. **Passo 3/4 — Testes de higiene e docs:** Adicionar invariantes em `test/unit/dependency-hygiene.test.ts` e registrar em `.archagents/06-infra-devops.md`.
4. **Passo 4/4 — Verificação e Review:** Executar `npm audit --audit-level=high`, `npm test`, `tsc`, `tsc.worker`, `build`, `build:worker`, `npm run test:transport`, `criteria-check.py` e verificador `self` independente.

## Criterios de sucesso do playbook

- [x] `npm audit --audit-level=high` (prod + dev) retorna exit `0` (`0 vulnerabilities`).
- [x] Suíte completa (`npm test`), typechecks Node + Worker, builds e `npm run test:transport` passam sem regressão.

## Log de execucoes

- `2026-11-20T19:13:48Z` — `RUN-20261120-191159-tck-0022` (`live`): 4/4 passos concluídos, `npm ci` + `npm audit` (`0` vulnerabilidades), `7/7` `dependency-hygiene.test.ts`, `npm test`, `tsc` + `tsc.worker`, `build` + `build:worker`, `test:transport` e `criteria-check.py` (`4/4`) aprovados.
