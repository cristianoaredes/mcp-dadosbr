---
id: DES-0027-playbook
created_at: 2026-11-20T20:46:27Z
status: approved
design: DES-0027
ticket: TCK-0024
approved_at: 2026-11-20T20:46:27Z
approved_by: codex
executed_at: 2026-11-20T20:53:00Z
executed_runs:
  - RUN-20261120-204702-tck-0024
dry_run_supported: true
total_steps: 5
destructive_steps: 1
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: chore/
branch_name: chore/TCK-0024-architecture-cycle-contract-worker-parity-adrs
commit_per_step: false
commit_message_format: "[TCK-0024] passo N/5: <titulo>"
---
# Playbook - DES-0027

**Ticket:** TCK-0024 (`FND-0012`)
**Objetivo:** Eliminar ciclo `core ↔ tools`, alinhar `cnpj_intelligence`, sincronizar versão/env/catálogo do Worker, remover órfãos e atualizar AS-IS + ADRs.

## Pre-requisitos

- [x] Sem `blocked_by` em `TCK-0024`; base `c83d626` limpa.

## Modo dry-run

`/ops-execute DES-0027 --dry-run`

## Passos

1. **Passo 1/5 — Quebrar ciclo e alinhar `cnpj_intelligence`:** Extrair `lib/core/lookup.ts`, apontar `intelligence.ts` e `tools/company.ts` para `lib/core/lookup.ts`, normalizar CNPJ em `executeIntelligenceInternal`, usar `...CNPJ_INTELLIGENCE_TOOL` e import estático em `lib/tools/core.ts` mantendo re-exports.
2. **Passo 2/5 — Versão & Paridade Worker:** Alinhar `SERVER.VERSION` e `SERVER_VERSION` para `"0.6.0"`, propagar nas rotas/SSE/OpenAPI do Worker, adicionar `syncWorkerEnv` (`TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`) e listar dinamicamente as 23 tools em `GET /`.
3. **Passo 3/5 — Limpeza de órfãos:** Remover `test/unit/search.test.ts.patch` e script `"test:sse"` quebrado em `package.json`. (Observação: remoção restrita ao patch órfão no worktree, aprovada em plano/remediação FND-0012.)
4. **Passo 4/5 — Testes, ADRs & Sync AS-IS:** Criar `test/unit/architecture-hygiene.test.ts`, gerar `ADR-0001` e `ADR-0002`, atualizar `.archagents/{00-overview,02-architecture,03-modules}.md` e executar `update-meta.py --root "$WT" --force`.
5. **Passo 5/5 — Verificação, Verificador Independente, Judge & Commit:** Executar suítes, `npm run test:coverage`, `npm test`, `tsc` + `tsc.worker`, `build` + `build:worker`, `test:transport`, `criteria-check.py`, `audit-measure.py`, subagente `self`, `VER`, `pipeline-judge.py`, `done`, `secret-scan.sh`, commit e `ops/validate.py`.

## Criterios de sucesso do playbook

- [x] Grafo `lib/core/` → `lib/tools/` 100% acíclico.
- [x] `SERVER_VERSION` e Worker alinhados com `package.json` (`0.6.0`), 23 tools em `/` e 4 API keys em `syncWorkerEnv`.
- [x] ADRs em `.archagents/09-decisions/` e AS-IS sincronizados sem quebrar `_meta.json`.
- [x] Todos os testes, cobertura V8, builds, `test:transport` e `ops/validate.py` verdes.

## Log de execucoes

- `RUN-20261120-204702-tck-0024` (`2026-11-20`): 4/4 critérios `criteria-check.py` aprovados, 30 arquivos / 434 testes passados (V8 `88.97%` Stmts / `82.1%` Branch / `87.3%` Funcs / `89.68%` Lines), `tsc` + `tsc.worker` + `build` + `build:worker` + `test:transport` verdes, `ADR-0001`/`ADR-0002` + docs AS-IS sincronizados.
