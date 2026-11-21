---
status: completed
run_id: RUN-20261121-134623-tck-0034
ticket: TCK-0034
design: DES-0030
start_time: 2026-11-21T13:46:23Z
end_time: 2026-11-21T13:50:50Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/adapters/cli-http.ts
  - lib/adapters/cli.ts
  - README.md
  - test/unit/cli-http-security.test.ts
test_result:
  status: pass
  summary: "447/447 Vitest (31 files, 12/12 cli-http-security.test.ts), tsc + tsc.worker exit 0, build + build:worker + test:transport PASS, secret-scan clean, CLI fail-closed exit 1 verified"
---
# RUN-20261121-134623-tck-0034 - TCK-0034 (`FND-0019`)

## Resumo executivo

Implementada a autenticação via `MCP_API_KEY` e a guarda fail-closed fora de loopback no transporte HTTP/SSE do CLI conforme `DES-0030`:

1. **`lib/adapters/cli-http.ts`**:
   - Importado `{ createHash, timingSafeEqual } from "node:crypto"`.
   - Adicionado `apiKey?: string` a `CliHttpOptions`.
   - Exportado `isLoopbackHost(host: string): boolean` (aceita estritamente `"127.0.0.1"`, `"localhost"`, `"::1"`, `"[::1]"` após `trim().toLowerCase()`).
   - Exportado `isValidApiKey(provided: string, expected: string): boolean` usando `createHash("sha256")` + `timingSafeEqual` (imune a timing side-channel por comprimento).
   - Em `createCliHttpApp(options)`: normalização de `apiKey`, guarda fail-closed (`if (!isLoopbackHost(bindHost) && !apiKey) throw Error(...)`), inclusão de `X-API-Key` em `Access-Control-Allow-Headers`, e middleware de autenticação imediatamente após Host/Origin/`OPTIONS` (`204`), aceitando `Authorization: Bearer <token>` (case-insensitive) ou `X-API-Key` (rejeitando `Array.isArray(...)`) e respondendo `401` + `WWW-Authenticate: Bearer` + `{ error: "Unauthorized", message: "Valid API key required" }` com log estruturado `cliHttpLogger.warn("auth.unauthorized", { path: req.path }, requestContext?.requestId)` sem expor token ou IP bruto.
   - Mantidas assinaturas de `GET /mcp` e `POST /messages` e acesso local em loopback quando `apiKey` não é informada.
2. **`lib/adapters/cli.ts`**:
   - Leitura de `const apiKey = process.env.MCP_API_KEY?.trim() || undefined;`.
   - Validação fail-closed antes de `createCliHttpApp`: se `!isLoopbackHost(host) && !apiKey`, registra erro fatal `[Security] Refusing to bind HTTP/SSE transport on non-loopback host "${host}" without MCP_API_KEY configured.` em `stderr` e encerra com `process.exit(1)`.
   - Registro do estado de autenticação na inicialização HTTP (sem vazar o segredo) e repasse de `apiKey` para `createCliHttpApp`.
   - Atualizada ajuda `--help` com `MCP_API_KEY`.
3. **`README.md`**:
   - Documentada exigência de `MCP_API_KEY` em modo fail-closed ao definir `MCP_HTTP_HOST` para endereços não-loopback (`0.0.0.0`, `::`, etc.) e uso de `Authorization: Bearer` / `X-API-Key` na tabela de modos (`L135-138`), exemplo HTTP/SSE (`L194-203`) e referência de variáveis de ambiente (`L259-260`).
4. **`test/unit/cli-http-security.test.ts`**:
   - Adicionados 5 testes unitários cobrindo `isLoopbackHost`, `isValidApiKey`, startup fail-closed em hosts não-loopback, rejeição `401` + `WWW-Authenticate: Bearer` sem vazar segredo/IP nos logs, CORS preflight `OPTIONS` `204` com `X-API-Key`, aceitação `Bearer`/`X-API-Key`, rejeição de cabeçalhos duplicados/malformados e comportamento em loopback com/sem `apiKey`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/cli-http-security.test.ts` | Todos os testes passam | `Test Files 1 passed (1)`, `Tests 12 passed (12)` | PASS |
| `npm run test` | Suíte completa verde | `Test Files 31 passed (31)`, `Tests 447 passed (447)` | PASS |
| `npm run test:coverage` | Thresholds 85/80/85/85 | Passou todos os thresholds (exit `0`) | PASS |
| `npx tsc --noEmit` | Exit 0 | Exit `0` sem erros | PASS |
| `npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 | Exit `0` sem erros (`node:crypto` validado) | PASS |
| `npm run build && npm run build:worker && npm run test:transport` | Exit 0, `PASS: both transports expose the expected catalogue` | Exit `0`, `PASS stdio` + `PASS HTTP/SSE` (23 tools, 5 MCP Apps) | PASS |
| `MCP_TRANSPORT=http MCP_HTTP_HOST=0.0.0.0 node build/lib/adapters/cli.js` | Exit `1` fail-closed | Exit `1`, `[Security] Refusing to bind HTTP/SSE transport on non-loopback host "0.0.0.0" without MCP_API_KEY configured.` | PASS |
| `git ls-files lib apps scripts infra .github \| xargs bash "$CBOPS/secret-scan.sh"` | Sem segredos | `✅ No secrets detected.` (exit `0`) | PASS |
| `python3 "$CBOPS/criteria-check.py" --ticket TCK-0034 --root "$WT"` | `3/3 PASS` | `Criteria Gate — TCK-0034: 3/3 (EXECUTE) Veredito: PASS` | PASS |
