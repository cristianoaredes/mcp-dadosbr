---
id: TCK-0037
slug: alinhar-contrato-rest-openapi-do-worker-corrigir-404-decodeuricomponent-e-limpar
title: "Alinhar contrato REST/OpenAPI do Worker, corrigir 404/decodeURIComponent e limpar legados"
source: audit
created_at: 2026-11-21T13:09:44Z
created_by: ops
updated_at: 2026-11-21T13:09:44Z
status: raw
severity: medium
category: architecture
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0022
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/03-modules.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance: []
---
# TCK-0037 - Alinhar contrato REST/OpenAPI do Worker, corrigir 404/decodeURIComponent e limpar legados

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0022`** (`architecture`, `medium`).

**Problema:** Há drift contratual entre rotas REST (`rest.ts`), OpenAPI (`openapi.ts`), `types.ts` e os schemas Zod (`10` categorias, `provider`, `SequentialThinkingSchema`); problemas de roteamento `404` / `decodeURIComponent`; presença de artefatos/exports legados (`lib/workers/tokens.ts`, `smithery.config.js`, exports mortos); e divergência documental em `.archagents/03-modules.md:L9`, `docs/CONFIGURATION.md`, `CLAUDE.md`, `test/manual/test-manual.js` e `.github/workflows/cloudflare-deploy.yml`.

**Evidências (`a3a2e12`):**
- `lib/workers/openapi.ts:L151,L194-L217`
- `lib/workers/rest.ts:L43,L149-L168`
- `lib/workers/types.ts:L33-L46`
- `lib/workers/worker.ts:L136-L140`
- `lib/workers/tokens.ts:L1-L17`
- `smithery.config.js:L1-L9`
- `lib/core/dork-templates.ts:L521-L540`
- `lib/config/timeouts.ts:L117-L131`
- `.archagents/03-modules.md:L9`
- `test/manual/test-manual.js:L1-L28`
- `docs/CONFIGURATION.md:L138-L139`
- `CLAUDE.md:L166-L167`
- `.github/workflows/cloudflare-deploy.yml:L117-L120`

**Mitigação sugerida:**
- Alinhar REST/OpenAPI/types aos schemas Zod (`10` categorias, `provider`, `SequentialThinkingSchema`).
- Corrigir tratamento de `404` e decodificação segura de `decodeURIComponent`.
- Remover `lib/workers/tokens.ts`, `smithery.config.js` e exports mortos.
- Atualizar `.archagents/03-modules.md:L9`, docs, workflow e script manual referenciados.

## Falsificador

Antes do fix, `lib/workers/openapi.ts:L151,L194-L217`, `lib/workers/rest.ts:L43,L149-L168` e `lib/workers/types.ts:L33-L46` apresentam drift contra os schemas Zod e falha de `404`/`decodeURIComponent`; `lib/workers/tokens.ts:L1-L17` e `smithery.config.js:L1-L9` permanecem órfãos; e `.archagents/03-modules.md:L9` mantém informação desatualizada.

## Log de transicoes

- 2026-11-21T13:09:44Z - **raw** - criado via scripts/ops/ticket/create.py.
