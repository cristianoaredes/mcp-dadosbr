---
id: DES-0035
slug: cobertura-vitest-cli-http-e-mcp-server-handlers
title: "Cobertura Vitest em cli-http.ts (429/413/400/extraAllowedHosts/SSE/shutdown) e mcp-server.ts (handlers/erro)"
created_at: 2026-11-21T14:09:15Z
status: approved
ticket: TCK-0039
type: design
scope_files_new:
  - test/unit/cli-http-runtime-coverage.test.ts
  - test/unit/mcp-server-handlers.test.ts
scope_files_modified: []
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0035-playbook.md
acceptance_delta: unchanged
---
# DES-0035 - Cobertura Vitest em cli-http.ts e mcp-server.ts

## Problema

`FND-0024` / `TCK-0039`: Embora a suíte global esteja acima do ratchet (`85/80/85/85`), dois arquivos centrais do runtime CLI/MCP ainda possuem ramos não exercitados por testes automatizados:

1. `lib/adapters/cli-http.ts` (baseline `79.86%` stmts, `74.88%` branch, `86.11%` funcs, `80.00%` lines):
   - `parseCommaSeparatedList` (`L51-57`)
   - `isAllowedCliHost` com `bindHost` explícito e `extraAllowedHosts` (`L124-145`)
   - `Array.isArray(req.headers.origin)` e CORS middleware (`L291-298`)
   - Tratamento de JSON `413 Payload Too Large` (`entity.too.large`) e `400 Bad Request` (`Invalid JSON payload`) (`L373-387`)
   - `rateLimitMiddleware` `429 Too Many Requests` (`retryAfter`, `NODE_ENV === "production"` masking vs non-production, `X-RateLimit-*`) (`L396-423`)
   - Ciclo real HTTP/SSE (`GET /mcp`, emissão de `endpoint` + `sessionId`, `POST /messages?sessionId=<valid>`, `transport.onclose`, `503` em `maxSessions`, erro de conexão em `GET /mcp` e `POST /messages` catch paths) (`L466-582`)
   - `createGracefulShutdown` (caminho limpo, timeout com fake timers `onExit(1)`, erros best-effort de `closeAll`/`server.close`/`mcpServer.close`/`cache.clear`) (`L608-691`)
2. `lib/core/mcp-server.ts` (baseline `78.68%` stmts, `83.56%` branch, `36.36%` funcs, `83.63%` lines):
   - `parsePositiveIntEnv` (`L27-32`)
   - Handlers `tools/list` (`ListToolsRequestSchema`, incluindo `_meta.ui.resourceUri` nos 5 MCP Apps), `resources/list` (`ListResourcesRequestSchema`) e `resources/read` (`ReadResourceRequestSchema` válido e `McpError(ErrorCode.InvalidParams)` para URI desconhecida) (`L117-140`)
   - `tools/call` (`CallToolRequestSchema`): `structuredContent` para `querido_diario` / `bacen_taxas` / `pncp_licitacoes` / `cnpj_lookup` / `ibge_localidades`, rate limit `429` (`RATE_LIMIT_ERROR` / `retryAfter`), falha de tool (`result.ok === false`), e `catch` de exceção inesperada (`L148-176`, `L208-257`).

## Riscos e Contramedidas

| ID | Risco | Contramedida |
|---|---|---|
| R1 | Portas/timers/listeners HTTP abertos causarem hang ou flakiness no Vitest | Bind apenas em `127.0.0.1` porta `0` (efêmera), `closeAll()` + `server.close()` determinísticos em `finally`/`afterEach` |
| R2 | `ReadResourceRequestSchema` depender de `build/lib/apps/*.html` inexistente antes de `npm run build` | Mockar `node:fs/promises` (`readFile`) no escopo de `test/unit/mcp-server-handlers.test.ts` validando o argumento `URL` |
| R3 | Chamadas externas ou vazamento de env vars / credenciais sintéticas | Mockar `globalThis.fetch` quando aplicável, restaurar `process.env` e usar apenas chaves sintéticas curtas (`test-key-123`) |
| R4 | Alteração acidental em código de produção | Escopo estritamente aditivo em `test/unit/`; nenhuma alteração em `lib/` |

## Solucao

1. **`test/unit/cli-http-runtime-coverage.test.ts`**:
   - Cobrir `parseCommaSeparatedList`, `isAllowedCliHost` (`bindHost` + `extraAllowedHosts`, rejeição de `*`, `0.0.0.0`, `::` e spoofing), `413`/`400` no parser JSON, `429` via `rateLimitMiddleware` (headers, `retryAfter`, log com/sem mascaramento de IP em `NODE_ENV=production`), ciclo real HTTP/SSE via `http.Server` em `127.0.0.1:0` (`GET /mcp`, evento `endpoint`, `POST /messages?sessionId=<valid>`, `503` ao atingir `maxSessions`, `400`/`404`, `transport.onclose`, caminhos `catch` de `GET /mcp` e `POST /messages`) e `createGracefulShutdown` (caminho limpo, idempotência, erros best-effort e timeout com `vi.useFakeTimers()`).
2. **`test/unit/mcp-server-handlers.test.ts`**:
   - Cobrir `createMCPServer()` ponta a ponta via `InMemoryTransport` + `Client` do `@modelcontextprotocol/sdk`: `tools/list` (23 tools e `_meta.ui.resourceUri` nas 5 tools MCP App), `resources/list` (5 recursos `ui://dadosbr/*.html`), `resources/read` (conteúdo HTML + `_meta` válido e `McpError` `InvalidParams` em URI desconhecida), `tools/call` com `extensions['io.modelcontextprotocol/ui']` (`cnpj_lookup`, `ibge_localidades`, `bacen_taxas`/`querido_diario`/`pncp_licitacoes`), rate-limit exceeded (`MCP_TOOL_RATE_LIMIT_MAX`), erro de validação/tool (`isError: true`) e exceção inesperada via `cache.get` lançando `Error`.

## Criterios de sucesso

- [ ] `npx vitest run test/unit/cli-http-runtime-coverage.test.ts test/unit/mcp-server-handlers.test.ts` passa 100% sem flakiness
- [ ] `npm run test:coverage` passa com aumento de cobertura em `lib/adapters/cli-http.ts` e `lib/core/mcp-server.ts`
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` passa com exit `0`
- [ ] `secret-scan.sh` passa sem achados e nenhum arquivo em `lib/` foi alterado

## Rollback

- Reverter o commit na branch `test/TCK-0039-cli-http-mcp-server-coverage` usando `git revert <commit-sha>` na worktree isolada.
