---
status: completed
run_id: RUN-20261120-170506-session-thinking-log-redaction-mcp-ratelimit
ticket: TCK-0017
design: DES-0016
start_time: 2026-11-20T17:05:06Z
end_time: 2026-11-20T17:10:00Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/shared/log-redaction.ts
  - lib/core/sequential-thinking.ts
  - lib/core/search.ts
  - lib/core/intelligence.ts
  - lib/infrastructure/rate-limiter.ts
  - lib/core/registry.ts
  - lib/core/tools.ts
  - lib/tools/core.ts
  - lib/core/mcp-server.ts
  - lib/workers/mcp-agent.ts
  - test/unit/session-thinking-redaction-ratelimit.test.ts
  - .archagents/07-security-compliance.md
test_result:
  status: pass
  summary: "8/8 novos testes (session-thinking-redaction-ratelimit.test.ts), 326/326 Vitest (21 arquivos), tsc + tsc.worker TYPECHECK_OK, npm run build + build:worker BUILD_OK, npm run test:transport PASS, git diff --check e secret-scan.sh limpos"
---
# RUN-20261120-170506-session-thinking-log-redaction-mcp-ratelimit - TCK-0017

## Resumo executivo

- Criado `lib/shared/log-redaction.ts` (`maskCnpj`, `summarizeQueryForLog`, `maskSensitiveText`) para padronizar a supressão de PII (CPF, CNPJ, e-mails, quebras de linha e queries longas) em logs operacionais.
- Endurecido `lib/core/sequential-thinking.ts`: substituído `branches: Record<string, ...>` por `Map` (retornando snapshot null-prototype em `getBranches()`), adicionados tetos FIFO (`MAX_THOUGHT_HISTORY=100`, `MAX_BRANCHES=20`, `MAX_THOUGHTS_PER_BRANCH=50`), desligado o logging de `thought` por padrão (exige `ENABLE_THOUGHT_LOGGING=true` fora de `NODE_ENV=production`) e aplicado `maskSensitiveText(thought, 80)` quando ativo em dev.
- Removido o singleton de módulo `thinkingProcessor` em `lib/tools/core.ts`; propagado `ToolExecutionContext` (`registry.ts` -> `tools.ts` -> `tools/core.ts`) com instâncias dedicadas por sessão/conexão em `createMCPServer` (`lib/core/mcp-server.ts`) e `DadosBRMCP` (`lib/workers/mcp-agent.ts`), e comportamento efêmero em chamadas stateless diretas.
- Aplicada redação de logs em `lib/core/search.ts` (`summarizeQueryForLog` + `maskSensitiveText` nos erros) e `lib/core/intelligence.ts` (`maskCnpj`, `Company resolved (has_name=...)`, `summarizeQueryForLog(dork.query)` e `maskSensitiveText` nos erros).
- Estendido `lib/infrastructure/rate-limiter.ts` (`enableCleanupTimer?: boolean`, `.unref?.()` e `destroy()`) e ativado rate limiter por sessão nos dispatchers MCP (`lib/core/mcp-server.ts` cobrindo `stdio`/SSE/Smithery e `lib/workers/mcp-agent.ts`, default `120` chamadas/janela via `MCP_TOOL_RATE_LIMIT_MAX`, retornando `RateLimitError` `-32003` quando excedido).

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/session-thinking-redaction-ratelimit.test.ts` | All passed | 1 arquivo, 8/8 passed (295 ms) | PASS |
| `npm test` | All tests pass | 21 arquivos, 326/326 passed (3.51 s) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `npm run test:transport` | Both transports PASS (101 stdio calls) | PASS (`stdio` 101 calls + HTTP/SSE) | PASS |
| `git diff --check && secret-scan.sh` | Exit 0, zero segredos | Exit 0, limpo | PASS |

## Matriz de Controles (`DES-0016` Threat Model)

| Threat ID | Recurso | Implementação | Evidência / Teste | Risco residual |
|---|---|---|---|---|
| `T1` | `sequentialthinking` cross-session | Instância por `createMCPServer`/`DadosBRMCP` via `ToolExecutionContext` | Teste com 2 clientes `InMemoryTransport` + `executeTool` stateless | N/A |
| `T2` | `branches` & crescimento de memória | `Map`, `Object.create(null)` em `getBranches()`, caps FIFO `100/20/50` | Testes com `__proto__`/`constructor`/`toString` e excesso dos limites | Limite aplicável por sessão |
| `T3` | Trace de pensamentos em `stderr` | Default OFF; em `production` sempre OFF; mascarado com `maskSensitiveText` em debug dev | Teste com spy em `console.error` para default, `production` e `development` | N/A |
| `T4` | Logs em `search.ts` / `intelligence.ts` | `maskCnpj` (`***XXXX`), `summarizeQueryForLog`, `has_name=...`, `maskSensitiveText` | Testes verificando ausência de CPF, CNPJ, razão social, nome de sócio e query bruta | Logs de outros subsistemas fora do escopo |
| `T5` | Rate limit no dispatcher MCP | `RateLimiter` (`enableCleanupTimer: false`) em `mcp-server.ts` e `mcp-agent.ts` retornando `-32003` | Testes com `rateLimit: { maxRequests: 3 }`, `MCP_TOOL_RATE_LIMIT_MAX="2"` e `npm run test:transport` (`101` chamadas `stdio`) | Rate limit por conexão `stdio`/SSE; abuso multi-processo local fora do escopo |
