---
id: DES-0041-playbook
created_at: 2026-11-22T02:00:37Z
status: approved
design: DES-0041
ticket: TCK-0045
approved_at: 2026-11-22T02:00:37Z
approved_by: null
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 5
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: fix/
branch_name: fix/TCK-0045-live-e2e-contracts
commit_per_step: false
commit_message_format: "fix(TCK-0045): passo N/5 - <titulo>"
---
# Playbook - DES-0041

**Ticket:** TCK-0045
**Objetivo:** Reparo de contratos live pncp_licitacoes, cnes_saude, datajud_processos e errors

## Pre-requisitos

- [ ] Worktree revisada para evitar colisao com mudancas existentes.

## Modo dry-run

`/ops-execute DES-0041 --dry-run`

## Passos

1. Reparar `pncp_licitacoes` em `lib/tools/government.ts` (`/api/search/`) e atualizar `test/unit/pncp-app.test.ts`.
2. Reparar `cnes_saude` em `lib/tools/health.ts` (`UF_TO_IBGE_CODE`) e adicionar teste em `test/unit/tools-company-health-osint-legal.test.ts`.
3. Reparar `datajud_processos` em `lib/tools/legal.ts` e `TimeoutError`/`ResourceNotFoundError`/`categorizeError` em `lib/shared/errors.ts`, com testes em `test/unit/tools-company-health-osint-legal.test.ts` e `test/unit/errors.test.ts`.
4. Executar `npm run build`, `npm run build:worker`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit`, `npx vitest run` e `npm run test:transport`.
5. Executar teste live E2E via `StdioClientTransport` em `build/lib/bin/mcp-dadosbr.js` para `pncp_licitacoes` e `cnes_saude` e registrar evidências no RUN.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa.
- [ ] Suite relevante passa.

## Log de execucoes

- *(sem execucoes ainda)*
