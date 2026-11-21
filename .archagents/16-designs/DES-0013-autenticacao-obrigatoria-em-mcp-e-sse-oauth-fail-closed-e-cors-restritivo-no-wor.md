---
id: DES-0013
slug: autenticacao-obrigatoria-em-mcp-e-sse-oauth-fail-closed-e-cors-restritivo-no-wor
title: "Autenticacao obrigatoria em /mcp e /sse, OAuth fail-closed e CORS restritivo no Worker"
created_at: 2026-11-20T16:07:19Z
status: approved
ticket: TCK-0013
type: design
scope_files_new:
  - test/unit/worker-auth-oauth-cors.test.ts
scope_files_modified:
  - lib/adapters/cloudflare.ts
  - lib/workers/auth.ts
  - lib/workers/oauth.ts
  - lib/workers/openapi.ts
  - lib/workers/worker.ts
  - .archagents/07-security-compliance.md
scope_files_deleted: []
blast_radius: medium
security_sensitive: true
playbook: .archagents/16-designs/playbooks/DES-0013-playbook.md
acceptance_delta: unchanged
---
# DES-0013 - Autenticacao obrigatoria em /mcp e /sse, OAuth fail-closed e CORS restritivo no Worker

## Problema (`FND-0001`)

No Cloudflare Worker (`lib/workers/` e `lib/adapters/cloudflare.ts`), três falhas críticas de controle de acesso expõem a superfície de execução:
1. `authenticateRequest` (`lib/workers/auth.ts:L24-L33`) ignora `MCP_API_KEY` para `/mcp`, `/sse` e `/oauth/*`, permitindo execução remota não autenticada das 23 ferramentas MCP (incluindo chamadas pagas via `TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY` e `DATAJUD_API_KEY`), e compara chaves em rotas REST com `!==` não constant-time (`L49`).
2. O fluxo OAuth (`lib/workers/oauth.ts`) redireciona (`302 Location`) para qualquer `redirect_uri` em `/oauth/authorize` (Open Redirect, CWE-601, além de exceção não tratada em URL inválida), aceita qualquer `code` em `/oauth/token` sem verificação/PKCE retornando `id_token` fictício (`jwt_<hex>`) contradizendo `RS256` do discovery, e não valida nem persiste clientes em `/oauth/register`.
3. `corsHeaders` (`lib/adapters/cloudflare.ts:L33-L38`) fixa `Access-Control-Allow-Origin: *` globalmente inclusive sobre endpoints autenticados e omite `Authorization` e `X-API-Key` de `Access-Control-Allow-Headers`; `openapi.ts` declara `OAuth2` e `security: []` em `/mcp` e `/sse`.

## Decisões de Design

1. **Autenticação obrigatória e constant-time (`lib/workers/auth.ts`):**
   - Definir explicitamente `PUBLIC_PATHS = new Set(["/health", "/", "/openapi.json", "/.well-known/oauth-authorization-server", "/.well-known/openid_configuration", "/.well-known/jwks.json"])` com helper `isPublicPath(pathname)`.
   - Remover `/mcp`, `/sse` e `/oauth/*` do bypass de autenticação: sempre que `env.MCP_API_KEY` estiver definida, exigir `Authorization: Bearer <key>` ou `X-API-Key: <key>`.
   - Implementar `constantTimeEqual(a, b)` usando `TextEncoder` e acumulador XOR de comprimento/bytes sem early return.
   - Logar rejeições `401` apenas com o `pathname` (`[Auth] Unauthorized request to ...`), nunca expondo o valor da credencial.
2. **OAuth fail-closed (`lib/workers/oauth.ts`):**
   - Desabilitar os endpoints OAuth fictícios retornando HTTP `501 Not Implemented` (`oauth_not_supported`) com `Cache-Control: no-store`, sem nunca emitir `Location`, redirecionar (`302`), parsear `redirect_uri` como alvo de redirect ou gerar `access_token`/`id_token`/`client_secret`.
3. **CORS restritivo e headers defensivos (`lib/adapters/cloudflare.ts` e `lib/workers/worker.ts`):**
   - Adicionar `MCP_ALLOWED_ORIGINS?: string` em `Env` e `parseAllowedOrigins(raw)` ignorando entradas vazias, `"*"` e URLs inválidas/não HTTP(S).
   - Em `getCorsHeaders(request, env, { isPublic })`:
     - Se `MCP_ALLOWED_ORIGINS` tiver origens válidas: emitir `Vary: Origin` e refletir `Access-Control-Allow-Origin` somente se `Origin` estiver na allowlist.
     - Se `MCP_API_KEY` estiver configurada e a rota não for pública (`!isPublic`): emitir `Vary: Origin` e **omitir** `Access-Control-Allow-Origin` (nunca `*` em rotas autenticadas sem allowlist).
     - Caso contrário (modo demo sem `MCP_API_KEY` ou rota pública de metadados): permitir `"*"`.
   - Em `handleCORS`: em `OPTIONS`, retornar `403 Origin not allowed` quando houver `Origin` não autorizado em `getCorsHeaders`; aplicar `withCorsHeaders()` em todas as respostas retornadas por `worker.ts` (inclusive erros `401`/`429`/`404`/`405`), além de incluir `Authorization`, `X-API-Key` e `X-Content-Type-Options: nosniff`.
4. **Alinhamento de contratos (`lib/workers/openapi.ts`, `lib/workers/worker.ts`):**
   - Remover `OAuth2` do schema OpenAPI, declarar `ApiKeyAuth` (`X-API-Key`) e `BearerAuth` (`http/bearer`), e exigir segurança em `/mcp` e `/sse` (com resposta `401`). Remover `oauth` do índice de endpoints em `GET /`.

## Threat Model (`T1`–`T5`)

| ID | Ameaça | Vetor / Superfície | Controle / Mitigação | Verificação |
|---|---|---|---|---|
| `T1` | Bypass de autenticação em `/mcp` e `/sse` | Cliente chama `POST /mcp` (`tools/call`) ou `GET /sse` sem API key mesmo com `MCP_API_KEY` ativa | `PUBLIC_PATHS` contém apenas rotas de descoberta/health; `/mcp` e `/sse` exigem `Bearer` ou `X-API-Key` | Testes negativos `401` e positivos `200` em `worker-auth-oauth-cors.test.ts` |
| `T2` | Timing side-channel na comparação de `MCP_API_KEY` | Ataque estatístico sobre comparação `!==` byte a byte | `constantTimeEqual` via `TextEncoder` + acumulador XOR sobre `max(lenA, lenB)` | Testes unitários de `constantTimeEqual` (mesmo tamanho, tamanhos distintos, vazio, UTF-8) |
| `T3` | Open Redirect & falsificação OAuth | `/oauth/authorize?redirect_uri=https://evil.example` (`302`) ou `javascript:...` / `/oauth/token` com `code` forjado | Todos handlers OAuth retornam `501 oauth_not_supported` com `Cache-Control: no-store`, sem `Location` nem `new URL(redirectUri)` | Testes de regressão garantindo `501` (ou `401` se sem key), ausência de `Location` e de `access_token`/`id_token` |
| `T4` | CORS `*` em rotas autenticadas / preflight abusivo | Página maliciosa no browser usa credenciais/headers contra endpoints protegidos ou envia wildcard em `MCP_ALLOWED_ORIGINS` | `parseAllowedOrigins` ignora `*`; `getCorsHeaders` omite `Access-Control-Allow-Origin` em deploy autenticado sem allowlist; `OPTIONS` retorna `403` | Testes de CORS para `OPTIONS` e `POST` com e sem `MCP_API_KEY`, com allowlist, wildcard e origem não autorizada |
| `T5` | Divergência OpenAPI vs política real | Clientes/geradores inferem `security: []` em `/mcp`/`/sse` ou `OAuth2` ativo | `openapi.ts` declara `ApiKeyAuth`/`BearerAuth` e `401` em `/mcp` e `/sse`; remove `OAuth2` | Asserts sobre `generateOpenAPISchema()` |

## Plano de Verificação

- `npx vitest run test/unit/worker-auth-oauth-cors.test.ts`
- `npm test`
- `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit`
- `npm run build && npm run build:worker`
- `git diff --check` e `secret-scan.sh`
- Verificação adversarial independente em contexto fresco + `criteria-check.py --record-lock`
