---
id: TCK-0024
slug: resolver-ciclo-core-tools-alinhar-contrato-de-cnpj-intelligence-remover-codigo-a
title: "Resolver ciclo core-tools, alinhar contrato de cnpj_intelligence, remover codigo/artefatos orfaos e atualizar cobertura AS-IS/ADRs"
source: audit
created_at: 2026-11-20T15:16:21Z
created_by: ops
updated_at: 2026-11-20T21:04:16Z
status: done
severity: medium
category: architecture
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0012
linked_designs:
  - DES-0027
linked_runs:
  - RUN-20261120-204702-tck-0024
linked_verifications:
  - VER-20261120-210313-tck-0024
linked_docs:
  - .archagents/02-architecture.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/architecture-hygiene.test.ts test/unit/worker-rest-cloudflare.test.ts test/unit/deduplication.test.ts test/unit/dependency-hygiene.test.ts && echo ARCH_TESTS_OK"
    expect: ARCH_TESTS_OK
  - check: "npm run test:coverage && npm test && echo TESTS_COVERAGE_OK"
    expect: TESTS_COVERAGE_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
  - check: "npm run build && npm run build:worker && npm run test:transport && echo BUILD_TRANSPORT_OK"
    expect: BUILD_TRANSPORT_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T20:46:26Z
---
# TCK-0024 - Resolver ciclo core-tools, alinhar contrato de cnpj_intelligence, remover codigo/artefatos orfaos e atualizar cobertura AS-IS/ADRs

## Contexto

Originado por **FND-0012** (`architecture` / `medium`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/core/intelligence.ts:L5`, `lib/core/intelligence.ts:L62-L63`, `lib/core/intelligence.ts:L192-L200`, `lib/core/intelligence.ts:L217`, `lib/core/intelligence.ts:L244`, `lib/core/intelligence.ts:L389-L448`, `lib/tools/core.ts:L88-L104`, `lib/workers/rest.ts:L167`, `scripts/mcp-client.js:L205-L206`, `lib/config/index.ts:L13`, `lib/workers/worker.ts:L45-L47`, `lib/workers/worker.ts:L129`, `lib/workers/worker.ts:L143`, `lib/workers/mcp-agent.ts`, `test/unit/search.test.ts.patch`, `package.json:L30`, `.archagents/_meta.json:L8`, saída `audit-measure.py` (`cobertura-do-as-is`).
- **Problema:** Dependência circular `intelligence.ts ↔ tools/core.ts`, divergência de parâmetros/normalização em `cnpj_intelligence`, `SERVER_VERSION` fixo (`1.0.0` vs `0.6.0`), Worker injeta só `TAVILY_API_KEY` e lista apenas 5/23 tools em `/`, artefatos órfãos (`mcp-agent.ts`, `search.test.ts.patch`, `test:sse`), e cobertura AS-IS cega para `apps/` e `infra/` sem ADRs em `09-decisions/`.
- **Mitigação:** Quebrar ciclo extraindo `lookup`, alinhar contrato único de `cnpj_intelligence`, sincronizar versão e env vars do Worker, limpar artefatos órfãos e atualizar registro AS-IS (`apps/`, `infra/`, `baseline_commit`) e ADRs.

## Falsificador

Evidências pré-fix de **FND-0012** observadas na revisão `c83d626`:

- Ciclo `core ↔ tools`: `lib/core/intelligence.ts:5` importa `lookup` de `lib/tools/core.ts`, enquanto `lib/tools/core.ts:152` importa dinamicamente `../core/intelligence.js`.
- Divergência de contrato em `cnpj_intelligence`: `lib/tools/core.ts:128-141` duplica a definição em vez de reutilizar `CNPJ_INTELLIGENCE_TOOL` (`lib/core/intelligence.ts:457-523`), e `lib/core/intelligence.ts:233,241` usa `options.cnpj` sem normalização na chave de cache e no lookup.
- Versão divergente (`"1.0.0"` vs `package.json:3` `"0.6.0"`): `lib/config/index.ts:13`, `lib/shared/utils/constants.ts:37`, `lib/workers/worker.ts:93`, `lib/workers/sse.ts:158,181` e `lib/workers/openapi.ts:18`.
- Paridade incompleta no Worker: `lib/adapters/cloudflare.ts:34,163-165,263-265` e `lib/workers/worker.ts:165-167` injetam apenas `TAVILY_API_KEY` (omitindo `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`), e `lib/workers/worker.ts:106` lista apenas 5 de 23 tools em `GET /`.
- Artefatos órfãos/quebrados: `test/unit/search.test.ts.patch` e script `"test:sse": "node examples/sse-client.js"` em `package.json:39` apontando para arquivo inexistente.
- Governança AS-IS: `.archagents/03-modules.md` desatualizado segundo `audit-measure.py`, `.archagents/_meta.json:8` fixado em `baseline_commit` antigo e `.archagents/09-decisions/` sem ADRs (`elo-de-supersede-de-adr` não medido).

## Log de transicoes

- 2026-11-20T15:16:21Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T20:46:26Z - **noted** - body:falsifier (replace): Registrar evidencias FND-0012 pre-fix na revisao c83d626
- 2026-11-20T20:46:26Z - **triaged** - Falsificador FND-0012 e criterios mecanicos de aceite registrados para TCK-0024 [aceite reescrito: 4 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T20:47:02Z - **designed** - DES-0027 aprovado para remediacao arquitetural FND-0012 (TCK-0024)
- 2026-11-20T20:47:02Z - **executing** - Iniciando execucao de DES-0027 (RUN-20261120-204702-tck-0024)
- 2026-11-20T20:53:00Z - **verifying** - Execucao completa: ciclo core-tools resolvido via lib/core/lookup.ts, cnpj_intelligence unificado e normalizado, SERVER_VERSION=0.6.0, 23 tools em GET /, syncWorkerEnv (4 chaves), orfaos removidos, ADR-0001/0002 e AS-IS atualizados; criteria-check 4/4 pass
- 2026-11-20T21:04:16Z - **done** - Verificado de forma independente (e84568cf) e re-testado apos ajuste fino; criteria-check 4/4 pass
