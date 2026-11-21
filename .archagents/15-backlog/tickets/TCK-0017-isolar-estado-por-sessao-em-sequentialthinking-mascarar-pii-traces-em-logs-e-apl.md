---
id: TCK-0017
slug: isolar-estado-por-sessao-em-sequentialthinking-mascarar-pii-traces-em-logs-e-apl
title: "Isolar estado por sessao em sequentialthinking, mascarar PII/traces em logs e aplicar rate limit no dispatcher MCP"
source: audit
created_at: 2026-11-20T15:16:14Z
created_by: ops
updated_at: 2026-11-20T17:18:21Z
status: done
severity: high
category: security
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0005
linked_designs:
  - DES-0016
linked_runs:
  - RUN-20261120-170506-session-thinking-log-redaction-mcp-ratelimit
linked_verifications:
  - VER-20261120-171706-tck-0017
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/session-thinking-redaction-ratelimit.test.ts"
    expect: passed
    note: "Session-isolated sequentialthinking with Map & bounds, default-off thought logging, PII/query/dork redaction, and MCP dispatcher rate limit"
  - check: "npm test && npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
    note: "Full Vitest suite and Node + Worker typechecks pass without regressions"
  - check: "npm run build && npm run build:worker && npm run test:transport"
    expect: "PASS: both transports expose the expected catalogue"
    note: "Node + Worker builds and stdio/HTTP-SSE transport integration test (101 stdio calls) pass"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T17:04:14Z
---
# TCK-0017 - Isolar estado por sessao em sequentialthinking, mascarar PII/traces em logs e aplicar rate limit no dispatcher MCP

## Contexto

Originado por **FND-0005** (`agentic-security` / `high`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/tools/core.ts:L110`, `lib/core/sequential-thinking.ts:L28-L29`, `lib/core/sequential-thinking.ts:L102-L116`, `lib/core/search.ts:L31-L33`, `lib/core/search.ts:L46-L48`, `lib/core/search.ts:L73-L75`, `lib/core/search.ts:L86-L88`, `lib/core/intelligence.ts:L182`, `lib/core/intelligence.ts:L213`, `lib/core/intelligence.ts:L258`, `lib/core/intelligence.ts:L354`, `lib/adapters/cli.ts:L241-L246`, `lib/core/mcp-server.ts:L109-L179`.
- **Problema:** `thinkingProcessor` é singleton global compartilhado entre sessões SSE/Worker (vazando histórico/branches sem teto e usando `{}` vulnerável a protótipo), imprime pensamentos completos em `stderr` por padrão, `search.ts`/`intelligence.ts` logam queries cruas, CNPJ, razão social e dorks completos em `stderr`, e o dispatcher MCP/`stdio` não possui rate limit.
- **Mitigação:** Escopar `SequentialThinkingProcessor` por sessão com `Map` e teto de histórico, desabilitar/mascarar logging de pensamentos, queries e dorks/PII em produção, e aplicar rate limit na camada de execução de tools (incluindo `stdio`).

## Falsificador

Evidências verificáveis no commit base `9308fe0` antes do fix:
- `lib/tools/core.ts:L140`: `const thinkingProcessor = new SequentialThinkingProcessor();` cria singleton de módulo compartilhado entre sessões/conexões distintas (`stdio`/SSE/Worker).
- `lib/core/sequential-thinking.ts:L28-L34,L102-L116`: `thoughtHistory` cresce sem teto, `branches: Record<string, ThoughtData[]> = {}` permite chaves de `Object.prototype` (`__proto__`/`constructor`) e imprime `thought` integral em `stderr` por padrão (`DISABLE_THOUGHT_LOGGING !== "true"`).
- `lib/core/search.ts:L31-L33,L46-L48,L73-L75,L86-L88` e `lib/core/intelligence.ts:L181,L212,L257,L352`: expõem `query` completa, CNPJ sem máscara (`14` dígitos), `razao_social` e `dork.query` integral em `stderr`.
- `lib/core/mcp-server.ts:L109-L179` e `lib/adapters/cli.ts:L240-L246`: dispatcher MCP (`CallToolRequestSchema` / `stdio`) executa chamadas sem rate limiting por sessão.
- **Comando falsificador:** `npx vitest run test/unit/session-thinking-redaction-ratelimit.test.ts` (reprova antes do fix por vazamento cross-session em `sequentialthinking`, protótipo/teto de memória, exposição de PII em logs e ausência de rate limit no MCP).

## Log de transicoes

- 2026-11-20T15:16:14Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T17:04:14Z - **triaged** - Triagem de FND-0005 (isolamento de sessao em sequentialthinking, redacao PII/traces em logs e rate limit MCP) com criterios verificaveis [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T17:05:05Z - **linked** - links updated
- 2026-11-20T17:05:05Z - **designed** - DES-0016 (Threat Model T1-T5) e playbook de 4 passos aprovados em L3
- 2026-11-20T17:05:06Z - **linked** - links updated
- 2026-11-20T17:05:06Z - **executing** - Iniciando implementacao de DES-0016 em branch bugfix/TCK-0017-session-thinking-log-redaction-mcp-ratelimit (RUN-20261120-170506-session-thinking-log-redaction-mcp-ratelimit)
- 2026-11-20T17:10:48Z - **verifying** - Implementacao, testes unitarios/negativos, builds e test:transport concluidos; iniciando verify adversarial independente
- 2026-11-20T17:18:21Z - **done** - Verify adversarial independente aprovado (VER-20261120-171706-tck-0017) e judge verdict aprovado (safety 100)
