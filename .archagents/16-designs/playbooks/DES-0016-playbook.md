---
id: DES-0016-playbook
created_at: 2026-11-20T17:04:15Z
status: approved
design: DES-0016
ticket: TCK-0017
approved_at: 2026-11-20T17:04:15Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: bugfix/
branch_name: bugfix/TCK-0017-session-thinking-log-redaction-mcp-ratelimit
commit_per_step: false
commit_message_format: "[TCK-0017] passo N/4: <titulo>"
---
# Playbook - DES-0016

**Ticket:** TCK-0017
**Objetivo:** Isolamento de sessao em sequentialthinking, redacao de PII em logs e rate limit no dispatcher MCP

## Pre-requisitos

- [x] Branch empilhada `bugfix/TCK-0017-session-thinking-log-redaction-mcp-ratelimit` criada no worktree a partir de `9308fe0`.

## Modo dry-run

`/ops-execute DES-0016 --dry-run`

## Passos

1. **Passo 1 — Redação centralizada (`lib/shared/log-redaction.ts`), endurecimento de `sequential-thinking.ts` e redação em `search.ts`/`intelligence.ts`:**
   - Criar helper de mascaramento/truncamento, converter `branches` para `Map` com caps FIFO e log default-OFF, e remover PII/queries/dorks crus dos logs de `search.ts` e `intelligence.ts`.
2. **Passo 2 — Contexto por sessão (`registry.ts`, `tools.ts`, `tools/core.ts`) e Rate Limit no dispatcher MCP (`rate-limiter.ts`, `mcp-server.ts`, `mcp-agent.ts`):**
   - Remover singleton de `tools/core.ts`, propagar `ToolExecutionContext`, suportar `enableCleanupTimer`/`destroy`/`unref` no `RateLimiter` e aplicar throttle por sessão com `RateLimitError` em `mcp-server.ts` e `mcp-agent.ts`.
3. **Passo 3 — Testes unitários/segurança e atualização de `.archagents/07-security-compliance.md`:**
   - Criar `test/unit/session-thinking-redaction-ratelimit.test.ts` cobrindo isolamento cross-session, prototype safety, limites FIFO, logging default-OFF, redação em `search`/`intelligence` e rate limiting MCP; atualizar `07-security-compliance.md`.
4. **Passo 4 — Verificação completa (incluindo `test:transport`), Verify adversarial, Judge e Commit:**
   - Rodar `vitest`, `npm test`, `tsc` (Node/Worker), `build`, `build:worker`, `npm run test:transport`, `verify-run.py`, `criteria-check.py`, revisão adversarial independente e `pipeline-judge.py`.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa (`criteria-check.py` + `test:transport`).
- [ ] Revisão adversarial independente aprovada e sem bloqueantes.

## Log de execucoes

- *(aguardando registro do RUN)*
