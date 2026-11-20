---
id: TCK-0024
slug: resolver-ciclo-core-tools-alinhar-contrato-de-cnpj-intelligence-remover-codigo-a
title: "Resolver ciclo core-tools, alinhar contrato de cnpj_intelligence, remover codigo/artefatos orfaos e atualizar cobertura AS-IS/ADRs"
source: audit
created_at: 2026-11-20T15:16:21Z
created_by: ops
updated_at: 2026-11-20T15:16:21Z
status: raw
severity: medium
category: architecture
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0012
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/02-architecture.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance: []
---
# TCK-0024 - Resolver ciclo core-tools, alinhar contrato de cnpj_intelligence, remover codigo/artefatos orfaos e atualizar cobertura AS-IS/ADRs

## Contexto

Originado por **FND-0012** (`architecture` / `medium`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/core/intelligence.ts:L5`, `lib/core/intelligence.ts:L62-L63`, `lib/core/intelligence.ts:L192-L200`, `lib/core/intelligence.ts:L217`, `lib/core/intelligence.ts:L244`, `lib/core/intelligence.ts:L389-L448`, `lib/tools/core.ts:L88-L104`, `lib/workers/rest.ts:L167`, `scripts/mcp-client.js:L205-L206`, `lib/config/index.ts:L13`, `lib/workers/worker.ts:L45-L47`, `lib/workers/worker.ts:L129`, `lib/workers/worker.ts:L143`, `lib/workers/mcp-agent.ts`, `test/unit/search.test.ts.patch`, `package.json:L30`, `.archagents/_meta.json:L8`, saída `audit-measure.py` (`cobertura-do-as-is`).
- **Problema:** Dependência circular `intelligence.ts ↔ tools/core.ts`, divergência de parâmetros/normalização em `cnpj_intelligence`, `SERVER_VERSION` fixo (`1.0.0` vs `0.6.0`), Worker injeta só `TAVILY_API_KEY` e lista apenas 5/23 tools em `/`, artefatos órfãos (`mcp-agent.ts`, `search.test.ts.patch`, `test:sse`), e cobertura AS-IS cega para `apps/` e `infra/` sem ADRs em `09-decisions/`.
- **Mitigação:** Quebrar ciclo extraindo `lookup`, alinhar contrato único de `cnpj_intelligence`, sincronizar versão e env vars do Worker, limpar artefatos órfãos e atualizar registro AS-IS (`apps/`, `infra/`, `baseline_commit`) e ADRs.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

## Log de transicoes

- 2026-11-20T15:16:21Z - **raw** - criado via scripts/ops/ticket/create.py.
