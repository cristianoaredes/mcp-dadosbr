---
id: DES-0033
slug: rest-json-400-sanitizacao-500-e-headers-defensivos-worker
title: "Tratar JSON invalido como 400, sanitizar 500 e alinhar headers defensivos no Worker"
created_at: 2026-11-21T14:10:00Z
status: approved
ticket: TCK-0035
type: design
scope_files_new:
  - test/unit/worker-security-headers.test.ts
scope_files_modified:
  - lib/workers/rest.ts
  - lib/adapters/cloudflare.ts
  - test/unit/worker-rest-cloudflare.test.ts
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0033-playbook.md
acceptance_delta: unchanged
---
# DES-0033 - Tratar JSON invalido como 400, sanitizar 500 e alinhar headers defensivos no Worker

## Problema

`FND-0020` / `TCK-0035`: Nos endpoints POST da API REST do Worker (`lib/workers/rest.ts`: `/search`, `/intelligence`, `/thinking`), erros de parsing em `await request.json()` caem no `catch` externo e retornam HTTP `500` com `error.message` bruto do parser em vez de HTTP `400`. Além disso, todos os quatro handlers REST (`handleLookupEndpoint`, `handleSearchEndpoint`, `handleIntelligenceEndpoint`, `handleThinkingEndpoint`) expõem `error.message` bruto ao cliente HTTP em exceções internas `500`, e `BASE_CORS_HEADERS` em `lib/adapters/cloudflare.ts` define apenas `X-Content-Type-Options: nosniff`, omitindo `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store`.

## Threat Model

| ID | Ameaça | Vetor | Contramedida |
|---|---|---|---|
| T1 | Information disclosure via exceções internas ou erros de parser JSON | Corpo JSON malformado ou exceção de runtime nos handlers REST retorna `error.message` bruto em `500` | Helper `parseJsonBody<T>` captura erro de `request.json()` e retorna `400` fixo (`{ error: 'Bad Request', message: 'Invalid JSON payload' }`); `catch` externo de todos os 4 handlers loga erro mascarado via `restLogger.error` + `maskSensitiveText` e retorna apenas `{ error: 'Internal server error' }` |
| T2 | Caching intermediário/navegador de respostas com dados cadastrais/PII | Proxies ou browsers armazenam respostas REST/MCP sem `Cache-Control: no-store` | Incluir `"Cache-Control": "no-store"` em `BASE_CORS_HEADERS` (`lib/adapters/cloudflare.ts`), herdado por `corsHeaders`, `getCorsHeaders` e `withCorsHeaders` |
| T3 | Clickjacking e vazamento de `Referer` em respostas do Worker | Ausência de `X-Frame-Options` e `Referrer-Policy` nas respostas do adaptador Cloudflare | Incluir `"X-Frame-Options": "DENY"` e `"Referrer-Policy": "no-referrer"` em `BASE_CORS_HEADERS` ao lado de `"X-Content-Type-Options": "nosniff"` |
| T4 | Regressão de contratos paralelos (Wave 2 `TCK-0036` / `TCK-0038`) | Alterar assinaturas `(request, env)` dos handlers REST ou remover guardas de payload (`serializeBoundedToolOutput`) | Manter assinaturas `(request, env)` intactas em `lib/workers/rest.ts` e preservar `MCP_MAX_TOOL_OUTPUT_CHARS` / `serializeBoundedToolOutput` em `lib/adapters/cloudflare.ts` |

## Solucao

1. **`lib/workers/rest.ts`:**
   - Importar `{ createLogger }` de `../infrastructure/logger.js` e `{ maskSensitiveText }` de `../shared/log-redaction.js`.
   - Instanciar `const restLogger = createLogger('worker-rest');`.
   - Adicionar helper `parseJsonBody<T>(request: Request): Promise<{ ok: true; data: T } | { ok: false; response: Response }>` que lê `await request.json() as T`, captura falhas de parsing e retorna HTTP `400` JSON `{ error: 'Bad Request', message: 'Invalid JSON payload' }` com `'Content-Type': 'application/json'` e `...corsHeaders` (sem vazar detalhes do parser).
   - Chamar `parseJsonBody` no início de `handleSearchEndpoint`, `handleIntelligenceEndpoint` e `handleThinkingEndpoint` antes da lógica de negócio, mantendo as assinaturas `(request, env)` intactas.
   - Nos blocos `catch` externos de `handleLookupEndpoint`, `handleSearchEndpoint`, `handleIntelligenceEndpoint` e `handleThinkingEndpoint`, registrar `restLogger.error('rest.handler_error', { endpoint, error: maskSensitiveText(error instanceof Error ? error.message : String(error)) })` e responder HTTP `500` com `{ error: 'Internal server error' }` (sem `message` nem detalhes da exceção).
2. **`lib/adapters/cloudflare.ts`:**
   - Em `BASE_CORS_HEADERS`, adicionar `"X-Frame-Options": "DENY"`, `"Referrer-Policy": "no-referrer"` e `"Cache-Control": "no-store"` junto a `"X-Content-Type-Options": "nosniff"`.
   - Preservar `MCP_MAX_TOOL_OUTPUT_CHARS`, `serializeBoundedToolOutput`, `handleHealthCheck` e demais comportamentos existentes.
3. **`test/unit/worker-security-headers.test.ts` & `test/unit/worker-rest-cloudflare.test.ts`:**
   - Atualizar em `test/unit/worker-rest-cloudflare.test.ts` apenas as 3 expectativas existentes de JSON malformado (`500` -> `400`) com impacto mínimo.
   - Criar `test/unit/worker-security-headers.test.ts` cobrindo `400 Invalid JSON payload` em `POST /search`, `/intelligence`, `/thinking`; sanitização de `500` nos 4 handlers (confirmando ausência da mensagem bruta no body); e presença de `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store` nas respostas do Worker (`GET /`, `GET /health`, `POST /mcp`, REST, `OPTIONS`).

## Criterios de sucesso

- [ ] `npx vitest run test/unit/worker-security-headers.test.ts test/unit/worker-rest-cloudflare.test.ts` passa integralmente.
- [ ] `npm run test` passa sem regressões.
- [ ] `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit`, `npm run build && npm run build:worker && npm run test:transport` e `secret-scan.sh` passam integralmente.

## Rollback

- Reverter o commit na branch `fix/TCK-0035-worker-rest-json-400-defensive-headers` via `git revert <commit-sha>` na worktree isolada.
