---
id: DES-0016
slug: isolamento-de-sessao-em-sequentialthinking-redacao-de-pii-em-logs-e-rate-limit-n
title: "Isolamento de sessao em sequentialthinking, redacao de PII em logs e rate limit no dispatcher MCP"
created_at: 2026-11-20T17:04:14Z
status: approved
ticket: TCK-0017
type: design
scope_files_new:
  - lib/shared/log-redaction.ts
  - test/unit/session-thinking-redaction-ratelimit.test.ts
scope_files_modified:
  - lib/core/sequential-thinking.ts
  - lib/core/registry.ts
  - lib/core/tools.ts
  - lib/tools/core.ts
  - lib/core/search.ts
  - lib/core/intelligence.ts
  - lib/infrastructure/rate-limiter.ts
  - lib/core/mcp-server.ts
  - lib/workers/mcp-agent.ts
  - .archagents/07-security-compliance.md
scope_files_deleted: []
blast_radius: medium
security_sensitive: true
playbook: .archagents/16-designs/playbooks/DES-0016-playbook.md
acceptance_delta: unchanged
---
# DES-0016 - Isolamento de sessao em sequentialthinking, redacao de PII em logs e rate limit no dispatcher MCP

## Problema (`FND-0005`)

1. `thinkingProcessor` é um singleton global de módulo em `lib/tools/core.ts:L140`, compartilhando `thoughtHistory` e `branches` entre todas as sessões SSE/Worker, sem limites de memória (`thoughtHistory` e `branches` crescem indefinidamente), armazenando `branches` em `{}` (exposto a chaves de `Object.prototype` como `__proto__`/`constructor`) e imprimindo cada `thought` completo em `stderr` por padrão (`DISABLE_THOUGHT_LOGGING !== "true"`).
2. `lib/core/search.ts` (`L31-L88`) e `lib/core/intelligence.ts` (`L181-L378`) logam em `stderr` o termo de busca completo (`query`), CNPJ em texto claro, `razao_social` e todas as queries Dork (que podem conter nomes de sócios/PII).
3. `lib/core/mcp-server.ts` (`L109-L179`) e `lib/workers/mcp-agent.ts` não aplicam rate limiting na camada de execução de tools, deixando o transporte `stdio`, SSE, Smithery e Durable Objects expostos a loops descontrolados de chamadas LLM.

## Decisões de Design

1. **Redação centralizada de logs (`lib/shared/log-redaction.ts`):**
   - `maskCnpj(cnpj)`: mascara mantendo apenas os 4 últimos dígitos (`***0181`).
   - `summarizeQueryForLog(query)`: resume para `query(len=N)` sem expor PII nem operadores/termos.
   - `maskSensitiveText(text, maxLen = 120)`: normaliza quebras de linha, substitui CPF, CNPJ, sequências de 11/14 dígitos e endereços de e-mail por `"[REDACTED]"` e trunca a `maxLen`.
2. **`SequentialThinkingProcessor` limitado, seguro contra protótipo e isolado por sessão (`lib/core/sequential-thinking.ts`, `registry.ts`, `tools.ts`, `tools/core.ts`, `mcp-server.ts`, `mcp-agent.ts`):**
   - Substituir `Record<string, ThoughtData[]>` por `Map<string, ThoughtData[]>` e retornar objeto null-prototype em `getBranches()`.
   - Impor tetos com descarte FIFO (`MAX_THOUGHT_HISTORY = 100`, `MAX_BRANCHES = 20`, `MAX_THOUGHTS_PER_BRANCH = 50`).
   - Desligar thought logging por padrão; habilitar somente fora de `NODE_ENV=production` quando `ENABLE_THOUGHT_LOGGING === "true"` e `DISABLE_THOUGHT_LOGGING !== "true"`, usando sempre `maskSensitiveText(thought, 80)`.
   - Remover singleton de `lib/tools/core.ts`; propagar `ToolExecutionContext` (`{ sessionId?, thinkingProcessor? }`) a partir de `createMCPServer` e `DadosBRMCP` (ou instância efêmera em chamadas stateless diretas).
3. **Redação em `search.ts` e `intelligence.ts`:**
   - Substituir queries/CNPJ/`razao_social`/dorks por `summarizeQueryForLog`, `maskCnpj`, flag booleana `has_name=...` e `maskSensitiveText` em mensagens de erro.
4. **Rate limiting no dispatcher MCP (`lib/infrastructure/rate-limiter.ts`, `lib/core/mcp-server.ts`, `lib/workers/mcp-agent.ts`):**
   - Adicionar `enableCleanupTimer?: boolean`, `.unref?.()` no intervalo e método `destroy()` ao `RateLimiter` (mantendo `enableCleanupTimer = true` por default para compatibilidade com `rate-limiter.test.ts`).
   - No `createMCPServer` (`stdio`/SSE/Smithery) e `DadosBRMCP` (Worker DO), aplicar `RateLimiter` por sessão com `enableCleanupTimer: false` e limite padrão de `120` chamadas/janela (configurável por `options.rateLimit` ou `MCP_TOOL_RATE_LIMIT_MAX`, desativável apenas por `rateLimit: false` ou `MCP_DISABLE_RATE_LIMIT=true`), preservando os 101 calls do teste `test:transport` e devolvendo `RateLimitError` (`-32003`, `isError: true`, `retryAfter`).

## Threat Model (`T1`–`T5`)

| ID | Ameaça | Vetor / Superfície | Controle / Mitigação | Verificação |
|---|---|---|---|---|
| `T1` | Vazamento de histórico entre sessões/usuários | Singleton `thinkingProcessor` em `lib/tools/core.ts` | Instância por `createMCPServer` / `DadosBRMCP` passada via `ToolExecutionContext` | Teste com 2 sessões `InMemoryTransport` + `executeTool` stateless em `session-thinking-redaction-ratelimit.test.ts` |
| `T2` | Crescimento sem teto e poluição/colisão de protótipo em `branches` | Array ilimitado e `branches["__proto__"]` em `{}` | `Map` para `branches`, objeto `Object.create(null)` em `getBranches()`, caps FIFO `100/20/50` | Testes de `__proto__`/`constructor`/`toString` e excesso de `MAX_THOUGHT_HISTORY`/`MAX_BRANCHES` |
| `T3` | Exposição de pensamentos completos em `stderr` | Logging ativo por padrão em `SequentialThinkingProcessor` | Default OFF; em opt-in debug exige `NODE_ENV !== "production"` e aplica `maskSensitiveText` | Testes com `vi.spyOn(console, "error")` em default, `production` e `development` |
| `T4` | Vazamento de PII/CNPJ/dorks/razão social em `stderr` | Logs de `executeSearch` e `executeIntelligenceInternal` | `summarizeQueryForLog`, `maskCnpj`, remoção de `razao_social` literal e `maskSensitiveText` em erros | Testes com `console.error` spy verificando ausência de CPF, CNPJ completo, nome e query |
| `T5` | Loop descontrolado de tool calls no protocolo MCP (`stdio`/SSE/DO) | `CallToolRequestSchema` e `DadosBRMCP.registerTools` sem throttle | `RateLimiter` por sessão antes de `executeTool` retornando `RateLimitError` (`-32003`) | Testes de rate limit via `InMemoryTransport`, `MCP_TOOL_RATE_LIMIT_MAX` e `npm run test:transport` (101 chamadas) |

## Criterios de sucesso

- [ ] Todos os 3 critérios de `acceptance:` do `TCK-0017` passam via `criteria-check.py` (incluindo `npm run test:transport`).
- [ ] Zero achados bloqueantes na verificação adversarial independente em contexto fresco e `pipeline-judge.py` aprovado.
