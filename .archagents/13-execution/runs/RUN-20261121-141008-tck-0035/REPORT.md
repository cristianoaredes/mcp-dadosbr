---
status: completed
run_id: RUN-20261121-141008-tck-0035
ticket: TCK-0035
design: DES-0033
start_time: 2026-11-21T14:10:08Z
end_time: 2026-11-21T14:14:30Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/workers/rest.ts
  - lib/adapters/cloudflare.ts
  - test/unit/worker-rest-cloudflare.test.ts
  - test/unit/worker-security-headers.test.ts
test_result:
  status: pass
  summary: "470/470 Vitest (34 files; 6/6 worker-security-headers.test.ts, 9/9 worker-rest-cloudflare.test.ts), tsc + tsc.worker exit 0, build + build:worker + test:transport PASS, secret-scan clean"
---
# RUN-20261121-141008-tck-0035 - TCK-0035 (`FND-0020`)

## Resumo executivo

Implementada a remediação de `FND-0020` / `TCK-0035` conforme `DES-0033`:

1. **`lib/workers/rest.ts`**:
   - Importados `createLogger` (`../infrastructure/logger.js`) e `maskSensitiveText` (`../shared/log-redaction.js`); instanciado `const restLogger = createLogger('worker-rest');`.
   - Adicionado helper `parseJsonBody<T>(request: Request)` retornando HTTP `400` `{ error: 'Bad Request', message: 'Invalid JSON payload' }` para JSON malformado (`SyntaxError`) ou corpo não-objeto (`null`, arrays, primitivos), sem expor mensagens do parser.
   - Aplicado `parseJsonBody` no início de `handleSearchEndpoint`, `handleIntelligenceEndpoint` e `handleThinkingEndpoint`, preservando assinaturas `(request, env)`.
   - Nos blocos `catch` externos de todos os 4 handlers (`handleLookupEndpoint`, `handleSearchEndpoint`, `handleIntelligenceEndpoint`, `handleThinkingEndpoint`), registrado `restLogger.error('rest.handler_error', { endpoint, error: maskSensitiveText(...) })` e retornado HTTP `500` `{ error: 'Internal server error' }` sem `message` nem detalhes da exceção.
2. **`lib/adapters/cloudflare.ts`**:
   - Adicionados `"X-Frame-Options": "DENY"`, `"Referrer-Policy": "no-referrer"` e `"Cache-Control": "no-store"` a `BASE_CORS_HEADERS` junto a `"X-Content-Type-Options": "nosniff"`, propagando automaticamente via `corsHeaders`, `getCorsHeaders` e `withCorsHeaders`.
   - Preservados `MCP_MAX_TOOL_OUTPUT_CHARS` e `serializeBoundedToolOutput` (`TCK-0036`).
3. **Testes (`test/unit/worker-security-headers.test.ts` e `test/unit/worker-rest-cloudflare.test.ts`)**:
   - Criado `test/unit/worker-security-headers.test.ts` (`6/6` testes) cobrindo `400 Invalid JSON payload` em `/search`, `/intelligence`, `/thinking`, sanitização de `500` + log mascarado nos 4 handlers, e headers defensivos + `Cache-Control: no-store` nas respostas do Worker (`GET /`, `GET /health`, `POST /mcp`, REST, `OPTIONS`, `401`, `404`).
   - Atualizadas em `test/unit/worker-rest-cloudflare.test.ts` apenas as 3 asserções pré-existentes de JSON malformado (`500` -> `400`).

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/worker-security-headers.test.ts` | Todos os testes passam | `Test Files 1 passed (1)`, `Tests 6 passed (6)` | PASS |
| `npx vitest run test/unit/worker-security-headers.test.ts test/unit/worker-rest-cloudflare.test.ts` | Todos os testes passam | `Test Files 2 passed (2)`, `Tests 15 passed (15)` | PASS |
| `npm run test` | Suíte completa verde | `Test Files 34 passed (34)`, `Tests 470 passed (470)` | PASS |
| `npx tsc --noEmit` | Exit 0 | Exit `0` sem erros | PASS |
| `npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 | Exit `0` sem erros | PASS |
| `npm run build && npm run build:worker && npm run test:transport` | Exit 0, `PASS: both transports expose the expected catalogue` | Exit `0`, `PASS stdio` + `PASS HTTP/SSE` (23 tools, 5 MCP Apps, 101 tool calls) | PASS |
| `git ls-files lib apps scripts infra .github \| xargs bash "$CBOPS/secret-scan.sh"` | Sem segredos | `✅ No secrets detected.` (exit `0`) | PASS |
