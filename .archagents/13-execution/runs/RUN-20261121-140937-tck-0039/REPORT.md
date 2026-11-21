---
status: completed
run_id: RUN-20261121-140937-tck-0039
ticket: TCK-0039
design: DES-0035
start_time: 2026-11-21T14:09:37Z
end_time: 2026-11-21T14:18:10Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - test/unit/cli-http-runtime-coverage.test.ts
  - test/unit/mcp-server-handlers.test.ts
test_result:
  status: pass
  summary: "482/482 Vitest (35 files; 11/11 cli-http-runtime-coverage.test.ts + 7/7 mcp-server-handlers.test.ts), cli-http.ts 99.65%/92.23%/100%/99.65%, mcp-server.ts 100%/93.15%/100%/100%, All files 94.97%/86.42%/97.26%/95.59%, tsc + tsc.worker exit 0, secret-scan clean"
---
# RUN-20261121-140937-tck-0039 - TCK-0039 (`FND-0024`)

## Resumo executivo

Adicionadas duas suítes unitárias dedicadas em Vitest sem modificar nenhum arquivo de produção em `lib/`:

1. **`test/unit/cli-http-runtime-coverage.test.ts` (11 testes):**
   - `parseCommaSeparatedList`, `normalizeHostHeader` e `isAllowedCliOrigin` (casos de borda), além de rejeição de header `Origin` em array (`403 Invalid Origin header`).
   - `isAllowedCliHost` e middleware com `bindHost` explícito e `extraAllowedHosts` (`allowedHosts`), filtrando `*`, `0.0.0.0`, `::` e rejeitando hosts spoofados (`403`).
   - Parser JSON: `413 Payload Too Large` acima de 1MB, `400 Bad Request` (`Invalid JSON payload`) e encaminhamento `next(err)` (`415` com `Content-Encoding` não suportado).
   - `rateLimitMiddleware`: `429 Too Many Requests` (corpo JSON `{ error, message, retryAfter }` + `X-RateLimit-*` + log `http.rate_limited` com IP em dev e `"[masked]"` em `NODE_ENV=production`). Nota: `lib/adapters/cli-http.ts` retorna `retryAfter` no JSON e não define header HTTP `Retry-After`.
   - Ciclo real HTTP/SSE em `127.0.0.1:0`: `GET /mcp` emitindo evento `endpoint` com `sessionId`, `POST /messages?sessionId=<valid>` (`202` + atualização de `lastActivity` + resposta SSE), `503` em `maxSessions: 1`, cliente SDK `SSEClientTransport` ponta a ponta, remoção de sessão em `transport.onclose`, e ramos `catch` de `GET /mcp` e `POST /messages` (antes e depois de `headersSent`).
   - `createGracefulShutdown`: caminho limpo, tolerância best-effort a falhas em `closeAll`/`server.close`/`mcpServer.close`/`cache.clear`, e timeout determinístico via `vi.useFakeTimers()` (`timeoutMs: 50` -> `closeIdleConnections()` + `onExit(1)`).
2. **`test/unit/mcp-server-handlers.test.ts` (7 testes):**
   - `createMCPServer()` ponta a ponta via `InMemoryTransport` + `Client`:
     - `tools/list` retorna todas as 23 tools com `_meta.ui.resourceUri` exclusivamente nas 5 tools MCP App.
     - `resources/list` retorna os 5 recursos `ui://dadosbr/*.html` com `mimeType: "text/html;profile=mcp-app"` e `_meta.ui.prefersBorder: true`.
     - `resources/read` retorna HTML + `_meta` válidos (via mock de `node:fs/promises` validando a `URL` para `build/lib/apps/*.html`) e rejeita URI desconhecida com `McpError` (`InvalidParams` / `-32602`, `"Unknown resource URI"`).
     - `tools/call` com capability `extensions['io.modelcontextprotocol/ui']` retorna `structuredContent` para `cnpj_lookup`, `ibge_localidades` (array e paginado), `bacen_taxas`, `querido_diario` e `pncp_licitacoes`.
     - `MCP_TOOL_RATE_LIMIT_MAX` inválido (`"0"`, `"-5"`, `"abc"`), bloqueio por rate limit (`RATE_LIMIT_ERROR` `-32003` + `retryAfter`), erro de validação (`isError: true`), e `catch` de exceção inesperada em `executeTool` via `cache.get` lançando `Error` (com e sem `details`).

## Cobertura V8 (Antes vs Depois)

| Escopo | Antes (`Stmts / Branch / Funcs / Lines`) | Depois (`Stmts / Branch / Funcs / Lines`) | Linhas descobertas restantes |
|---|---|---|---|
| `lib/adapters/cli-http.ts` | `79.86% / 74.88% / 86.11% / 80.00%` | `99.65% / 92.23% / 100.00% / 99.65%` | `L622` (`if (exited) return;` guarda defensiva) |
| `lib/core/mcp-server.ts` | `78.68% / 83.56% / 36.36% / 83.63%` | `100.00% / 93.15% / 100.00% / 100.00%` | Branches `L28,L73,L167,L193,L199` |
| `All files` (`lib/**/*.ts`) | `92.39% / 84.25% / 94.27% / 93.03%` | `94.97% / 86.42% / 97.26% / 95.59%` | — |

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/cli-http-runtime-coverage.test.ts test/unit/mcp-server-handlers.test.ts` | Todos os testes passam | `Test Files 2 passed (2)`, `Tests 18 passed (18)` | PASS |
| `npm run test:coverage` | Thresholds `85/80/85/85` e ganho de cobertura | `Test Files 35 passed (35)`, `Tests 482 passed (482)`, `All files 94.97/86.42/97.26/95.59` | PASS |
| `npx tsc --noEmit` | Exit 0 | Exit `0` sem erros | PASS |
| `npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 | Exit `0` sem erros | PASS |
| `git ls-files lib apps scripts infra .github \| xargs bash "$CBOPS/secret-scan.sh"` | Sem segredos | `✅ No secrets detected.` (exit `0`) | PASS |
| `bash "$CBOPS/secret-scan.sh" test/unit/cli-http-runtime-coverage.test.ts test/unit/mcp-server-handlers.test.ts` | Sem segredos nos novos testes | `✅ No secrets detected.` (exit `0`) | PASS |
| `python3 "$CBOPS/criteria-check.py" --ticket TCK-0039 --root "$WT"` | `3/3 PASS` | `Criteria Gate — TCK-0039: 3/3 (EXECUTE) Veredito: PASS` | PASS |
| `git diff --name-only lib/` | Nenhum arquivo em `lib/` alterado | Vazio (0 alterações em `lib/`) | PASS |
