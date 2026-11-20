---
id: TCK-0013
slug: corrigir-bypass-de-autenticacao-em-mcp-e-sse-oauth-inseguro-e-cors-permissivo-no
title: "Corrigir bypass de autenticacao em /mcp e /sse, OAuth inseguro e CORS permissivo no Worker"
source: audit
created_at: 2026-11-20T15:16:11Z
created_by: ops
updated_at: 2026-11-20T16:25:33Z
status: done
severity: high
category: security
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0001
linked_designs:
  - DES-0013
linked_runs:
  - RUN-20261120-160813-worker-auth-oauth-cors
linked_verifications:
  - VER-20261120-161649-tck-0013
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/worker-auth-oauth-cors.test.ts"
    expect: passed
  - check: "npm test"
    expect: passed
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T16:07:07Z
---
# TCK-0013 - Corrigir bypass de autenticacao em /mcp e /sse, OAuth inseguro e CORS permissivo no Worker

## Contexto

Originado por **FND-0001** (`security` / `high`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/workers/auth.ts:L24-L33`, `lib/workers/auth.ts:L49`, `lib/workers/oauth.ts:L12-L51`, `lib/workers/oauth.ts:L69-L106`, `lib/workers/oauth.ts:L171-L218`, `lib/workers/oauth.ts:L237`, `lib/adapters/cloudflare.ts:L33-L38`.
- **Problema:** `/mcp` e `/sse` ignoram `MCP_API_KEY` quando configurada, `authenticateRequest` compara chave sem constant-time, `handleOAuthAuthorize` permite Open Redirect via `redirect_uri` arbitrário, `handleOAuthToken` aceita qualquer `code` sem verificação/PKCE e emite `id_token` fictício, e `corsHeaders` aplica `*` globalmente sem expor `Authorization`/`X-API-Key`.
- **Mitigação:** Exigir autenticação (comparação constant-time ou OAuth validado) em `/mcp` e `/sse`, validar `redirect_uri` contra allowlist (400 em URL inválida), validar/remover fluxo OAuth fictício e restringir CORS em rotas protegidas.

## Falsificador

Evidências verificáveis no commit base `4199d0a` (`HEAD` antes do fix):
- `lib/workers/auth.ts:L24-L33`: `authenticateRequest` retorna `{ authenticated: true }` incondicionalmente para `/mcp`, `/sse` e `/oauth/*`, mesmo com `env.MCP_API_KEY` configurada; e `lib/workers/auth.ts:L49` usa comparação direta `providedKey !== expectedApiKey` (não constant-time).
- `lib/workers/oauth.ts:L37-L50`: `handleOAuthAuthorize` redireciona (`302 Location`) para qualquer `redirect_uri` arbitrário (Open Redirect).
- `lib/workers/oauth.ts:L69-L106`: `handleOAuthToken` aceita qualquer `code` não vazio sem validação/PKCE e retorna `access_token` + `id_token` fictícios (`200`).
- `lib/adapters/cloudflare.ts:L33-L45`: `corsHeaders` aplica `Access-Control-Allow-Origin: *` globalmente sem expor `Authorization`/`X-API-Key` e aprova qualquer `Origin` em `OPTIONS`.
- **Comando falsificador:** `npx vitest run test/unit/worker-auth-oauth-cors.test.ts` (os 16 testes de segurança em `test/unit/worker-auth-oauth-cors.test.ts` reprovam o comportamento anterior e exigem 401 sem credencial, constant-time, 501 fail-closed em `/oauth/*` e CORS restritivo).

## Log de transicoes

- 2026-11-20T15:16:11Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T16:07:07Z - **triaged** - Triagem TCK-0013 (FND-0001): fechar bypass auth /mcp e /sse, desabilitar OAuth ficticio/Open Redirect e endurecer CORS no Worker [aceite reescrito: 3 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T16:08:13Z - **designed** - DES-0013 (com Threat Model T1-T5) e playbook de 4 passos criados e aprovados em L3
- 2026-11-20T16:08:14Z - **executing** - Iniciando implementacao de DES-0013 em branch bugfix/TCK-0013-worker-auth-oauth-cors ()
- 2026-11-20T16:08:50Z - **linked** - links updated
- 2026-11-20T16:12:17Z - **verifying** - Implementacao, testes unitarios/negativos e builds concluidos; iniciando verify adversarial independente
- 2026-11-20T16:25:33Z - **done** - Verify adversarial independente aprovado (VER-20261120-161649-tck-0013) e judge verdict aprovado
