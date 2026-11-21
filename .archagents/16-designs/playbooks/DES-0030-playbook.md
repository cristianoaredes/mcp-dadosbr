---
id: DES-0030-playbook
created_at: 2026-11-21T13:46:00Z
status: approved
design: DES-0030
ticket: TCK-0034
approved_at: 2026-11-21T13:46:00Z
approved_by: ops
executed_at: 2026-11-21T13:50:50Z
executed_runs:
  - RUN-20261121-134623-tck-0034
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min
branch_prefix: fix/
branch_name: fix/TCK-0034-cli-http-api-key-fail-closed
commit_per_step: false
commit_message_format: "[TCK-0034] passo N/4: <titulo>"
---
# Playbook - DES-0030

**Ticket:** TCK-0034 (`FND-0019`, `security`, `medium`)
**Objetivo:** Implementar autenticação `MCP_API_KEY` (Bearer / `X-API-Key`, comparação constant-time via SHA-256 + `timingSafeEqual`) e guarda fail-closed fora de loopback no transporte HTTP/SSE do CLI.

## Pre-requisitos

- [x] Worktree isolada criada em `fix/TCK-0034-cli-http-api-key-fail-closed` a partir de `8bf9673`.

## Threat Model Note

- Sem `MCP_API_KEY`, qualquer bind fora de loopback (`0.0.0.0`, `::`, IP de rede) deve falhar fechado no startup tanto em `createCliHttpApp()` quanto no entrypoint `cli.ts`.
- Comparação de chaves usa SHA-256 + `timingSafeEqual` para eliminar vazamento por comprimento/tempo.
- Logs de `401` (`auth.unauthorized`) nunca registram token bruto nem IP bruto.

## Passos

1. [x] **Passo 1/4 — Hardening de `lib/adapters/cli-http.ts`:** Adicionar `isLoopbackHost`, `isValidApiKey`, `CliHttpOptions.apiKey`, guarda fail-closed no startup, header `X-API-Key` em `Access-Control-Allow-Headers` e middleware de autenticação após Host/Origin/`OPTIONS`.
2. [x] **Passo 2/4 — Entrypoint `lib/adapters/cli.ts` e documentação `README.md`:** Validar `MCP_API_KEY` antes de iniciar HTTP/SSE fora de loopback (`process.exit(1)`), logar estado da autenticação sem vazar segredos, repassar `apiKey` e documentar `MCP_API_KEY` no `README.md`.
3. [x] **Passo 3/4 — Suíte `test/unit/cli-http-security.test.ts`:** Adicionar testes unitários para `isLoopbackHost`, `isValidApiKey`, startup fail-closed, `401` + `WWW-Authenticate: Bearer`, não-vazamento em logs, Bearer/`X-API-Key` válidos e loopback com/sem `apiKey`.
4. [x] **Passo 4/4 — Verificação completa:** Executar `npm run test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit`, `secret-scan.sh`, preencher `REPORT.md` e transicionar `TCK-0034` para `verifying`.

## Rollback

- Reverter commit da branch `fix/TCK-0034-cli-http-api-key-fail-closed` via `git revert` na worktree isolada.

## Criterios de sucesso do playbook

- [x] `npx vitest run test/unit/cli-http-security.test.ts` passa (`12/12`).
- [x] `npm run test` passa sem regressões (`447/447` em `31` arquivos).
- [x] `npx tsc --noEmit` e `npx tsc -p tsconfig.worker.json --noEmit` passam (exit `0`).
- [x] `secret-scan.sh` passa sem achados.

## Log de execucoes

- `RUN-20261121-134623-tck-0034` (`2026-11-21`): `12/12` em `test/unit/cli-http-security.test.ts`, `447/447` Vitest (`31` arquivos), `tsc` + `tsc.worker` exit `0`, `build` + `build:worker` + `test:transport` PASS, `secret-scan.sh` clean, `criteria-check.py` `3/3 PASS`.
