---
id: DES-0013-playbook
created_at: 2026-11-20T16:07:20Z
status: approved
design: DES-0013
ticket: TCK-0013
approved_at: 2026-11-20T16:07:20Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: bugfix/
branch_name: bugfix/TCK-0013-worker-auth-oauth-cors
commit_per_step: false
commit_message_format: "[TCK-0013] passo N/4: <titulo>"
---
# Playbook - DES-0013

**Ticket:** TCK-0013
**Objetivo:** Autenticacao obrigatoria em /mcp e /sse, OAuth fail-closed e CORS restritivo no Worker

## Pre-requisitos

- [x] Worktree isolado `bugfix/TCK-0013-worker-auth-oauth-cors` criado a partir de `4199d0a` preservando `main` intacta.

## Modo dry-run

`/ops-execute DES-0013 --dry-run`

## Passos

1. **Passo 1 — Endurecer CORS e Env no adapter Cloudflare (`lib/adapters/cloudflare.ts`):**
   - Adicionar `MCP_ALLOWED_ORIGINS?: string` em `Env`, implementar `parseAllowedOrigins`, `getCorsHeaders`, `withCorsHeaders`, atualizar `handleCORS` (403 em origem não permitida no `OPTIONS`), atualizar `corsHeaders` base (incluindo `Authorization`, `X-API-Key`, `X-Content-Type-Options: nosniff`, sem `*`) e atualizar `handleHealthCheck`.
2. **Passo 2 — Fechar bypass de auth (`lib/workers/auth.ts`) e desabilitar OAuth (`lib/workers/oauth.ts`):**
   - Definir `PUBLIC_PATHS` e `isPublicPath` excluindo `/mcp`, `/sse` e `/oauth/*` do bypass; implementar `constantTimeEqual`; logar falhas `401` sem expor credenciais; substituir handlers OAuth por respostas `501 Not Implemented` (`oauth_not_supported`) com `Cache-Control: no-store`.
3. **Passo 3 — Integrar CORS/rotas no Worker (`lib/workers/worker.ts`), atualizar OpenAPI (`lib/workers/openapi.ts`) e doc AS-IS (`.archagents/07-security-compliance.md`):**
   - Aplicar `isPublicPath` e `withCorsHeaders` em todas as respostas do `fetch()` do Worker, remover `oauth` de `GET /`, remover `OAuth2` e exigir `ApiKeyAuth`/`BearerAuth` em `/mcp` e `/sse` no `openapi.ts`, e documentar o controle em `07-security-compliance.md`.
4. **Passo 4 — Testes unitários/negativos (`test/unit/worker-auth-oauth-cors.test.ts`) e verificação completa:**
   - Cobrir `constantTimeEqual`, `/mcp` e `/sse` autenticados e não autenticados, modo demo sem `MCP_API_KEY`, OAuth `501` / Open Redirect fechado, CORS por allowlist / wildcard / headers defensivos e `generateOpenAPISchema`; rodar `vitest`, `npm test`, `tsc` (Node e Worker), `build`, `build:worker`, `git diff --check` e `secret-scan.sh`.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket (`worker-auth-oauth-cors.test.ts`, `npm test`, `tsc --noEmit && tsc -p tsconfig.worker.json --noEmit`) passa.
- [ ] `npm run build && npm run build:worker`, `git diff --check` e `secret-scan.sh` passam sem erros.

## Log de execucoes

- *(aguardando registro do RUN)*
