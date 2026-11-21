---
id: DES-0034
slug: correlacao-requestcontext-rest-cli-e-logger-estruturado-unificado
title: "Propagar requestContext em REST/CLI-MCP e unificar Logger estruturado em rate-limit, search, intelligence e tools"
created_at: 2026-11-21T14:11:00Z
status: approved
ticket: TCK-0038
type: design
scope_files_new: []
scope_files_modified:
  - lib/workers/worker.ts
  - lib/workers/rest.ts
  - lib/workers/rate-limit.ts
  - lib/adapters/cli-http.ts
  - lib/core/mcp-server.ts
  - lib/core/search.ts
  - lib/core/intelligence.ts
  - lib/core/tools.ts
  - lib/tools/core.ts
  - lib/tools/company.ts
  - test/unit/observability.test.ts
  - test/unit/session-thinking-redaction-ratelimit.test.ts
  - .archagents/10-runbooks.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0034-playbook.md
acceptance_delta: unchanged
---
# DES-0034 - Propagar requestContext em REST/CLI-MCP e unificar Logger estruturado em rate-limit, search, intelligence e tools

## Problema (`FND-0023`)

1. Em `lib/workers/worker.ts`, o `RequestContext` extraído de `X-Request-Id` não é repassado para `checkRateLimit(request, env)` nem para os 4 handlers REST em `lib/workers/rest.ts` (`handleLookupEndpoint`, `handleSearchEndpoint`, `handleIntelligenceEndpoint`, `handleThinkingEndpoint`), que chamam `handleMCPRequest(mcpRequest, env)` sem `requestContext` (quebrando a correlação ponta a ponta em `tools.ts`).
2. No transporte CLI HTTP/SSE (`lib/adapters/cli-http.ts`), `POST /messages` extrai `requestContext`, mas `createMCPServer(...)` em `lib/core/mcp-server.ts` instancia um novo `RequestContext()` dentro do handler `CallToolRequestSchema`, perdendo o `X-Request-Id` HTTP original.
3. Pontos residuais em `lib/workers/rate-limit.ts`, `lib/core/search.ts` e `lib/core/intelligence.ts` ainda utilizam `console.error` ad-hoc em vez de `createLogger(...)` com correlação por `requestId` e redação, e `lib/core/tools.ts` registra `tool.executed` apenas em nível `DEBUG`.

## Solucao

1. **Correlação REST/Rate-Limit no Worker (`lib/workers/worker.ts`, `lib/workers/rest.ts`, `lib/workers/rate-limit.ts`):**
   - Adicionar parâmetro opcional `requestContext?: RequestContext` em `handleLookupEndpoint`, `handleSearchEndpoint`, `handleIntelligenceEndpoint`, `handleThinkingEndpoint` e `checkRateLimit`.
   - Encaminhar `requestContext` em todas as chamadas `handleMCPRequest(mcpRequest, env, requestContext)` em `lib/workers/rest.ts` e nas chamadas de `worker.ts` (preservando corpos `try/catch` para evitar conflitos com `TCK-0035`).
2. **Correlação CLI HTTP/SSE -> MCP via `AsyncLocalStorage` (`lib/adapters/cli-http.ts`, `lib/core/mcp-server.ts`):**
   - Adicionar `getRequestContext?: () => RequestContext | undefined` em `MCPServerOptions` sem adicionar novos imports `node:*` em `lib/core/`.
   - Em `CallToolRequestSchema` (`lib/core/mcp-server.ts`), resolver `const requestContext = getRequestContext?.() ?? new RequestContext();`, preservando `requestContext.addMetadata("tool", name)` e o repasse para `executeTool`.
   - Em `lib/adapters/cli-http.ts`, importar `{ AsyncLocalStorage } from "node:async_hooks"`, criar `requestContextStore`, passar `getRequestContext: () => requestContextStore.getStore()` em `GET /mcp` e envolver `session.transport.handlePostMessage(req, res, req.body)` em `requestContextStore.run(requestContext, ...)` em `POST /messages` (mantendo todos os middlewares de segurança intactos).
3. **Logger estruturado unificado & evento `tool.executed` em `INFO`:**
   - `lib/workers/rate-limit.ts`: substituir `console.error` por `createLogger("worker-rate-limit").error("rate_limit.check_failed", { error: maskSensitiveText(...) }, requestContext?.requestId)`.
   - `lib/core/search.ts`: substituir os 4 `console.error` por `createLogger("search")` (`info`/`error` preservando `querySummary`, `elapsedMs`, `transportMode`, `provider`, `results`, `maskSensitiveText`) e aceitar 4º argumento opcional `requestId?: string` (propagado por `lib/tools/core.ts` e `lib/tools/company.ts`).
   - `lib/core/intelligence.ts`: substituir todos os `console.error` por `createLogger("intelligence")` (`debug`/`info`/`warn`/`error`), preservando `maskCnpj`, `summarizeQueryForLog` e `maskSensitiveText`, com correlação opcional por `requestId` (4º argumento e `options.requestId`, propagado por `lib/tools/core.ts`).
   - `lib/core/tools.ts`: promover `toolsLogger.debug("tool.executed", ...)` para `toolsLogger.info("tool.executed", { tool: name, ok: true, cacheHit, elapsedMs }, requestContext.requestId)` sem PII.
4. **Testes & Documentação (`test/unit/observability.test.ts`, `test/unit/session-thinking-redaction-ratelimit.test.ts`, `.archagents/10-runbooks.md`):**
   - Cobrir correlação `X-Request-Id` ponta a ponta em Worker REST -> `tools.ts`, CLI `POST /messages` -> `AsyncLocalStorage` -> `tools.ts`, e logs JSON estruturados redigidos em `rate-limit.ts`, `search.ts` e `intelligence.ts` (chaves fictícias sempre `< 16` chars).
   - Ajustar `session-thinking-redaction-ratelimit.test.ts` apenas para habilitar `LOG_LEVEL="debug"` / verificar formato JSON estruturado mantendo 100% das asserções de redação.

## Criterios de sucesso

- [x] `X-Request-Id` propagado ponta a ponta em Worker REST e CLI HTTP/SSE até `tool.executed` (`level: "info"`).
- [x] Zero `console.error` ad-hoc remanescente em `rate-limit.ts`, `search.ts` e `intelligence.ts`.
- [x] `npm run test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit`, `npm run build && npm run build:worker && npm run test:transport` e `secret-scan.sh` passam sem erros.
