---
id: DES-0015-playbook
created_at: 2026-11-20T16:46:06Z
status: approved
design: DES-0015
ticket: TCK-0016
approved_at: 2026-11-20T16:46:06Z
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
branch_name: bugfix/TCK-0016-zod-runtime-validation-capabilities-allowlist
commit_per_step: false
commit_message_format: "[TCK-0016] passo N/4: <titulo>"
---
# Playbook - DES-0015

**Ticket:** TCK-0016
**Objetivo:** Validacao Zod em runtime nas 23 tools MCP, remocao de api_key e governanca agentica

## Pre-requisitos

- [x] Branch empilhada `bugfix/TCK-0016-zod-runtime-validation-capabilities-allowlist` criada no worktree a partir de `6e04d1b`.

## Modo dry-run

`/ops-execute DES-0015 --dry-run`

## Passos

1. **Passo 1 — Schemas Zod centralizados (`lib/core/tool-schemas.ts`) e enforcement em `lib/core/registry.ts`:**
   - Criar todos os 23 schemas Zod com bounds estritos e compatibilidade com testes existentes; exigir `zodSchema: ZodTypeAny` em `ToolHandler`, exportar `hasToolSchema` e validar argumentos com `safeParse` em `executeRegisteredTool`.
2. **Passo 2 — Remover `api_key` e conectar `zodSchema` em todas as 23 tools:**
   - Atualizar `lib/core/intelligence.ts`, `lib/tools/core.ts`, `lib/tools/company.ts`, `lib/tools/government.ts`, `lib/tools/legal.ts`, `lib/tools/financial.ts`, `lib/tools/health.ts` e `lib/tools/osint.ts` ligando os respectivos schemas Zod e adicionando bounds nos JSON Schemas.
3. **Passo 3 — Governança agêntica (`SC-9`), docs e testes unitários/negativos:**
   - Versionar `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json` (23 tools), criar `test/unit/tool-validation-allowlist.test.ts` e atualizar `.archagents/07-security-compliance.md`.
4. **Passo 4 — Verificação completa, Verify adversarial, Judge e Commit:**
   - Executar `vitest`, `npm test`, `tsc` (Node e Worker), `npm run build && npm run build:worker`, `verify-tool-allowlist.py`, `git diff --check`, `secret-scan.sh`, `verify-run.py`, `criteria-check.py`, revisão adversarial independente em contexto fresco e `pipeline-judge.py`.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa (`criteria-check.py`).
- [ ] `verify-tool-allowlist.py` retorna 0 violações e suíte completa passa.

## Log de execucoes

- *(aguardando registro do RUN)*
