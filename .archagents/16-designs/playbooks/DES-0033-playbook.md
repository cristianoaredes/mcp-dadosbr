---
id: DES-0033-playbook
created_at: 2026-11-21T14:10:00Z
status: approved
design: DES-0033
ticket: TCK-0035
approved_at: 2026-11-21T14:10:00Z
approved_by: ops
executed_at: 2026-11-21T14:14:30Z
executed_runs:
  - RUN-20261121-141008-tck-0035
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 20min
branch_prefix: fix/
branch_name: fix/TCK-0035-worker-rest-json-400-defensive-headers
commit_per_step: false
commit_message_format: "[TCK-0035] passo N/4: <titulo>"
---
# Playbook - DES-0033

**Ticket:** TCK-0035 (`FND-0020`, `security`, `low`)
**Objetivo:** Retornar HTTP `400` padronizado para JSON malformado nos endpoints REST POST do Worker, sanitizar respostas `500` (logando com `maskSensitiveText` em `stderr` sem expor `error.message` ao cliente) e alinhar headers defensivos + `Cache-Control: no-store` no adaptador Cloudflare.

## Pre-requisitos

- [x] Worktree isolada criada em `fix/TCK-0035-worker-rest-json-400-defensive-headers` a partir de `7984a3d`.

## Threat Model Note

- JSON malformado nos endpoints `POST /search`, `POST /intelligence` e `POST /thinking` não deve disparar `500` nem expor mensagens do parser JSON (`SyntaxError`), respondendo `400` com payload estático `{ error: 'Bad Request', message: 'Invalid JSON payload' }`.
- Exceções inesperadas nos 4 handlers REST retornam apenas `{ error: 'Internal server error' }` (`500`) enquanto registram o erro mascarado via `restLogger.error` + `maskSensitiveText`.
- Todas as respostas do Cloudflare Worker herdam `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store` via `BASE_CORS_HEADERS`.

## Passos

1. [x] **Passo 1/4 — Hardening de `lib/workers/rest.ts`:** Importar `createLogger` e `maskSensitiveText`, instanciar `restLogger`, adicionar `parseJsonBody<T>` retornando `400 Invalid JSON payload`, aplicar nos 3 endpoints POST e sanitizar todos os 4 `catch` `500` com log mascarado interno e payload público sem `error.message`.
2. [x] **Passo 2/4 — Headers defensivos em `lib/adapters/cloudflare.ts`:** Adicionar `"X-Frame-Options": "DENY"`, `"Referrer-Policy": "no-referrer"` e `"Cache-Control": "no-store"` a `BASE_CORS_HEADERS`, mantendo `MCP_MAX_TOOL_OUTPUT_CHARS` e `serializeBoundedToolOutput` intactos.
3. [x] **Passo 3/4 — Testes unitários:** Criar `test/unit/worker-security-headers.test.ts` e atualizar as 3 expectativas de JSON malformado (`500` -> `400`) em `test/unit/worker-rest-cloudflare.test.ts`.
4. [x] **Passo 4/4 — Verificação completa:** Executar `npm run test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit`, `npm run build && npm run build:worker && npm run test:transport`, `secret-scan.sh`, preencher `REPORT.md` / `run.json` e transicionar `TCK-0035` para `verifying`.

## Rollback

- Reverter o commit da branch `fix/TCK-0035-worker-rest-json-400-defensive-headers` via `git revert <commit-sha>` na worktree isolada.

## Criterios de sucesso do playbook

- [x] `npx vitest run test/unit/worker-security-headers.test.ts test/unit/worker-rest-cloudflare.test.ts` passa integralmente.
- [x] `npm run test` passa sem regressões.
- [x] `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit` e `npm run build && npm run build:worker && npm run test:transport` passam (exit `0`).
- [x] `secret-scan.sh` passa sem achados.

## Log de execucoes

- `RUN-20261121-141008-tck-0035` (`2026-11-21`): `6/6` em `test/unit/worker-security-headers.test.ts`, `15/15` com `worker-rest-cloudflare.test.ts`, `470/470` Vitest (`34` arquivos), `tsc` + `tsc.worker` exit `0`, `build` + `build:worker` + `test:transport` PASS, `secret-scan.sh` clean.
