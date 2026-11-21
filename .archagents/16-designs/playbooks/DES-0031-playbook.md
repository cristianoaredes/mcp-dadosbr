---
id: DES-0031-playbook
created_at: 2026-11-21T13:45:00Z
status: approved
design: DES-0031
ticket: TCK-0036
approved_at: 2026-11-21T13:45:00Z
approved_by: ops
executed_at: 2026-11-21T13:50:30Z
executed_runs:
  - RUN-20261121-134527-tck-0036
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 15min-45min
branch_prefix: feat/
branch_name: feat/TCK-0036-agentic-prompt-boundaries-output-cap
commit_per_step: false
commit_message_format: "fix(agentic-security): TCK-0036 <titulo>"
---
# Playbook - DES-0031

**Ticket:** TCK-0036 (`FND-0021`)
**Objetivo:** Delimitar outputs externos e contexto de usuário contra prompt injection, impor teto uniforme de payload MCP e alinhar allowlist.

## Pre-requisitos

- [x] Worktree isolado em `feat/TCK-0036-agentic-prompt-boundaries-output-cap` a partir de `8bf9673` (`feature/audit-remediation-wave2`).
- [x] `TCK-0036` triado com critérios de aceite verificáveis.

## Modo dry-run

`/ops-execute DES-0031 --dry-run`

## Passos

1. **Passo 1/4 — Utilitário Web-standard `lib/shared/agentic-guard.ts`:** Criar módulo sem dependências `node:*` contendo `DEFAULT_MAX_TOOL_OUTPUT_CHARS`, `resolveMaxToolOutputChars`, `UNTRUSTED_EXTERNAL_DATA_NOTICE`, `sanitizeUntrustedText`, `wrapUntrustedContext` e `serializeBoundedToolOutput`.
2. **Passo 2/4 — Delimitadores e sanitização (`osint.ts`, `search-providers.ts`, `legal.ts`):** Encapsular `context` em `<untrusted_user_context>` com aviso explícito em `strategic_osint_prompt`; sanitizar `title`/`snippet` e marcar `untrusted_source: true` em `TavilyProvider`/`PerplexityProvider`; sanitizar `name`/`state` em `parseProcuradosHtml`.
3. **Passo 3/4 — Teto de payload MCP e Allowlist (`mcp-server.ts`, `cloudflare.ts`, `mcp-tool-allowlist.json`):** Substituir `JSON.stringify(result.data, null, 2)` por `serializeBoundedToolOutput(result.data)` mantendo `BASE_CORS_HEADERS` intocado, e alinhar `cnpj_intelligence` para `20 queries` em `.archagents/mcp-tool-allowlist.json`.
4. **Passo 4/4 — Testes e verificação (`agentic-security.test.ts`, `search.test.ts`):** Adicionar `test/unit/agentic-security.test.ts`, ajustar expectativas estritas em `test/unit/search.test.ts` para `untrusted_source: true`, e rodar `npm run test`, `tsc --noEmit`, `tsc -p tsconfig.worker.json --noEmit` e `secret-scan.sh`.

## Criterios de aceite

- [x] `test/unit/agentic-security.test.ts`, `search.test.ts`, `legal-timeouts-intelligence.test.ts`, `tools-company-health-osint-legal.test.ts`, `tool-validation-allowlist.test.ts` e `worker-rest-cloudflare.test.ts` passam (`87/87`).
- [x] `npm run test` completo passa sem regressões (`453/453` em `32` arquivos; V8 coverage `91.44% stmts / 83.47% branch / 93.31% funcs / 92.19% lines`).
- [x] `npx tsc --noEmit` e `npx tsc -p tsconfig.worker.json --noEmit` passam sem erros.
- [x] `.archagents/mcp-tool-allowlist.json` alinhado a `"bounded to 20 queries"` para `cnpj_intelligence`.
- [x] `git ls-files lib apps scripts infra .github | xargs bash "$CBOPS/secret-scan.sh"` passa limpo (`No secrets detected`).

## Rollback

Caso haja regressão em clientes MCP ou provedores de busca:
1. Reverter o commit da branch `feat/TCK-0036-agentic-prompt-boundaries-output-cap` via `git revert <commit-sha>` (ou descartar a branch antes de merge em `feature/audit-remediation-wave2`).
2. Como alternativa de runtime para payloads maiores sem rollback de código, ajustar a variável de ambiente `MCP_MAX_TOOL_OUTPUT_CHARS` para valor inteiro >= `1024` adequado ao cliente.

## Log de execucoes

- `RUN-20261121-134527-tck-0036` (`2026-11-21`): `87/87` direcionados (`6` arquivos), `453/453` Vitest (`32` arquivos), V8 `91.44% Stmts | 83.47% Branch | 93.31% Funcs | 92.19% Lines >= 85/80/85/85`, `tsc` + `tsc.worker` + `secret-scan.sh` verdes.
