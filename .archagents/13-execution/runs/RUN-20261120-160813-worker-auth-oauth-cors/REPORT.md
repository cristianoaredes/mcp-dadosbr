---
status: completed
run_id: RUN-20261120-160813-worker-auth-oauth-cors
ticket: TCK-0013
design: DES-0013
start_time: 2026-11-20T16:08:13Z
end_time: 2026-11-20T16:11:55Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/adapters/cloudflare.ts
  - lib/workers/auth.ts
  - lib/workers/oauth.ts
  - lib/workers/openapi.ts
  - lib/workers/worker.ts
  - test/unit/worker-auth-oauth-cors.test.ts
  - .archagents/07-security-compliance.md
test_result:
  status: pass
  summary: "16/16 novos testes Worker (worker-auth-oauth-cors.test.ts), 302/302 Vitest, tsc + tsc.worker 0 erros, npm run build + build:worker OK, git diff --check e secret-scan.sh limpos"
---
# RUN-20261120-160813-worker-auth-oauth-cors - TCK-0013

## Resumo executivo

- Fechado o bypass de autenticação em `/mcp` e `/sse` (`lib/workers/auth.ts`): definida a allowlist explícita `PUBLIC_PATHS` (`/health`, `/`, `/openapi.json`, `/.well-known/*`), implementada comparação em tempo constante (`constantTimeEqual`) e registrado log de tentativas `401` sem expor credenciais.
- Desabilitado em modo fail-closed o fluxo OAuth fictício (`lib/workers/oauth.ts`): todos os endpoints (`/oauth/*`, `/.well-known/oauth-authorization-server`, `/.well-known/openid_configuration`, `/.well-known/jwks.json`) retornam `501 Not Implemented` (`oauth_not_supported`) com `Cache-Control: no-store`, eliminando o vetor de Open Redirect (`302 Location`) e a emissão de `access_token`/`id_token` sem verificação.
- Endurecida a política de CORS e headers defensivos (`lib/adapters/cloudflare.ts` e `lib/workers/worker.ts`): adicionado `MCP_ALLOWED_ORIGINS`, ignorado wildcard `*`, omitido `Access-Control-Allow-Origin` em rotas protegidas quando `MCP_API_KEY` está configurada sem allowlist, adicionado `Vary: Origin`, `X-Content-Type-Options: nosniff` e headers `Authorization`/`X-API-Key`, rejeição `403` em `OPTIONS` de origem não permitida, e aplicado `withCorsHeaders` a todas as respostas do Worker.
- Atualizado o contrato `lib/workers/openapi.ts` (removido `OAuth2`, declarado `ApiKeyAuth` + `BearerAuth`, segurança exigida em `/mcp` e `/sse` com resposta `401`) e documentado o controle em `.archagents/07-security-compliance.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/worker-auth-oauth-cors.test.ts` | 16/16 passed | 16/16 passed (263 ms) | PASS |
| `npm test` | All tests pass | 18 arquivos, 302/302 passed (3.55 s) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `git diff --check && bash secret-scan.sh .` | Exit 0, zero segredos | Exit 0, limpo | PASS |

## Matriz de Controles (`DES-0013` Threat Model)

| Threat ID | Recurso | Implementação | Evidência / Teste | Risco residual |
|---|---|---|---|---|
| `T1` | `/mcp`, `/sse`, REST e `/oauth/*` | `PUBLIC_PATHS` + `isPublicPath` + `authenticateRequest` exigindo `MCP_API_KEY` | `worker-auth-oauth-cors.test.ts` confirma `401` sem key e `200` com `Bearer`/`X-API-Key` | Deploy demo sem `MCP_API_KEY` continua aberto por design; validação live no Cloudflare edge fica **a confirmar** após deploy |
| `T2` | Comparação de API key | `constantTimeEqual` via `TextEncoder` + acumulador XOR | Teste unitário valida strings iguais, diff de 1 char, tamanhos distintos, vazio e UTF-8 | Baixo; depende da execução síncrona de V8/Workers |
| `T3` | `/oauth/authorize`, `/oauth/token`, `/oauth/register`, discovery/JWKS | Resposta estática `501 oauth_not_supported` + `Cache-Control: no-store`, sem `Location` | Testes negativos confirmam `501`, ausência de `Location` (mesmo para `javascript:` e URL malformada) e ausência de tokens | Clientes OAuth passarão a requerer `MCP_API_KEY` diretamente |
| `T4` | Preflight `OPTIONS` e CORS em respostas do Worker | `parseAllowedOrigins`, `getCorsHeaders`, `handleCORS` (`403`), `withCorsHeaders` | Testes cobrem allowlist, wildcard `*` ignorado, ausência de `MCP_ALLOWED_ORIGINS` com `MCP_API_KEY` e modo demo | `MCP_ALLOWED_ORIGINS` requer configuração explícita no ambiente Cloudflare quando houver frontend browser |
| `T5` | `/openapi.json` e `GET /` | Removido `OAuth2` e `endpoints.oauth`; adicionado `BearerAuth` + `ApiKeyAuth` em `/mcp` e `/sse` | Asserts em `generateOpenAPISchema()` confirmam ausência de `OAuth2` e `security` em `/mcp` e `/sse` | N/A |
