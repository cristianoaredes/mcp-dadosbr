---
id: DES-0030
slug: autenticacao-mcp-api-key-fail-closed-no-cli-http
title: "Autenticacao MCP_API_KEY fail-closed no transporte HTTP/SSE do CLI"
created_at: 2026-11-21T13:46:00Z
status: approved
ticket: TCK-0034
type: design
scope_files_new: []
scope_files_modified:
  - lib/adapters/cli-http.ts
  - lib/adapters/cli.ts
  - test/unit/cli-http-security.test.ts
  - README.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0030-playbook.md
acceptance_delta: unchanged
---
# DES-0030 - Autenticacao MCP_API_KEY fail-closed no transporte HTTP/SSE do CLI

## Problema

`FND-0019` / `TCK-0034`: Quando `MCP_TRANSPORT=http` é iniciado com `MCP_HTTP_HOST` em interface não-loopback (ex.: `0.0.0.0`, `::`), `lib/adapters/cli.ts` apenas emite um aviso em `stderr` e `createCliHttpApp()` em `lib/adapters/cli-http.ts` não suporta nem exige `MCP_API_KEY` (`Authorization: Bearer` ou `X-API-Key`), expondo as 23 ferramentas MCP sem autenticação para qualquer cliente com acesso à porta e `Host` permitido.

## Threat Model

| ID | Ameaça | Vetor | Contramedida |
|---|---|---|---|
| T1 | Exposição não autenticada em rede/Docker/VPS | `MCP_HTTP_HOST=0.0.0.0` ou `::` sem `MCP_API_KEY` | Fail-closed no startup em `createCliHttpApp()` (`throw Error`) e em `cli.ts` (`stderr` + `process.exit(1)`) sempre que `!isLoopbackHost(host) && !apiKey` |
| T2 | Ataque de temporização (timing side-channel) na validação do segredo | Comparação por igualdade simples (`===`) ou vazamento de comprimento | `isValidApiKey(provided, expected)` computa `SHA-256` (`createHash("sha256")`) de ambos e compara digests de 32 bytes com `timingSafeEqual` |
| T3 | Vazamento de token ou IP em logs de auditoria/erro | Logar header `Authorization`/`X-API-Key` ou token recebido em `401` | `cliHttpLogger.warn("auth.unauthorized", { path: req.path }, requestContext.requestId)` sem token bruto e sem IP bruto |
| T4 | Quebra de CORS preflight ou colisão de headers repetidos | Bloquear `OPTIONS` com `401` ou aceitar arrays de `X-API-Key` | Middleware de auth executado após validação de `Host`/`Origin` e `OPTIONS` (`204`); `Access-Control-Allow-Headers` inclui `Content-Type, Authorization, X-API-Key`; `Array.isArray(...)` rejeitado |
| T5 | Regressão em uso local (`stdio`/loopback) e `test:transport` | Exigir `MCP_API_KEY` mesmo em `127.0.0.1`/`localhost`/`::1` | Manter loopback sem `apiKey` operacional por padrão; se `apiKey` estiver configurada em loopback, exigir autenticação normalmente |

## Solucao

1. **`lib/adapters/cli-http.ts`:**
   - Importar `{ createHash, timingSafeEqual } from "node:crypto"`.
   - Adicionar `apiKey?: string` em `CliHttpOptions`.
   - Exportar `isLoopbackHost(host: string): boolean` (aceita estritamente `"127.0.0.1"`, `"localhost"`, `"::1"`, `"[::1]"` após `trim().toLowerCase()`).
   - Exportar `isValidApiKey(provided: string, expected: string): boolean` usando `createHash("sha256")` + `timingSafeEqual`.
   - Normalizar `apiKey` em `createCliHttpApp(options)` e falhar fechado (`throw new Error(...)`) quando `!isLoopbackHost(effectiveHost) && !apiKey`.
   - Incluir `X-API-Key` em `Access-Control-Allow-Headers`.
   - Inserir middleware de autenticação imediatamente após Host/Origin/`OPTIONS`, exigindo `Authorization: Bearer <token>` (case-insensitive `Bearer `) ou `X-API-Key` (rejeitando `Array.isArray(...)`) sempre que `apiKey` estiver configurada; retornar `401` com `WWW-Authenticate: Bearer` e `{ error: "Unauthorized", message: "Valid API key required" }` e logar `auth.unauthorized` sem token nem IP bruto.
   - Preservar assinaturas de `GET /mcp` e `POST /messages` intactas (evitando colisão com `TCK-0038`).
2. **`lib/adapters/cli.ts`:**
   - Ler `process.env.MCP_API_KEY?.trim() || undefined`.
   - Antes de `createCliHttpApp`, checar `!isLoopbackHost(host) && !apiKey`, logar erro fatal em `stderr` e sair com `process.exit(1)`.
   - Logar estado de autenticação (habilitada vs loopback-only, nunca o segredo) e passar `apiKey` para `createCliHttpApp`.
3. **`README.md`:**
   - Documentar `MCP_API_KEY` como obrigatória em `MCP_HTTP_HOST` não-loopback e uso de `Authorization: Bearer` / `X-API-Key`.
4. **`test/unit/cli-http-security.test.ts`:**
   - Cobrir `isLoopbackHost`, `isValidApiKey`, startup fail-closed em `0.0.0.0`, rejeição `401` + `WWW-Authenticate: Bearer` sem vazar segredo em logs, aceitação Bearer/`X-API-Key`, e comportamento em loopback com e sem `apiKey`.

## Criterios de sucesso

- [ ] `npx vitest run test/unit/cli-http-security.test.ts` passa com cobertura de todos os cenários de `FND-0019`.
- [ ] `npm run test` passa sem regressões.
- [ ] `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit` e `secret-scan.sh` passam integralmente.

## Rollback

- Reverter o commit na branch `fix/TCK-0034-cli-http-api-key-fail-closed` via `git revert <commit>` na worktree isolada.
