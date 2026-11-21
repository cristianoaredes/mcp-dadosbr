---
id: TCK-0037
slug: alinhar-contrato-rest-openapi-do-worker-corrigir-404-decodeuricomponent-e-limpar
title: "Alinhar contrato REST/OpenAPI do Worker, corrigir 404/decodeURIComponent e limpar legados"
source: audit
created_at: 2026-11-21T13:09:44Z
created_by: ops
updated_at: 2026-11-21T14:06:02Z
status: done
severity: medium
category: architecture
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0022
linked_designs:
  - DES-0032
linked_runs:
  - RUN-20261121-134716-tck-0037
linked_verifications:
  - VER-20261121-135934-tck-0037
linked_docs:
  - .archagents/03-modules.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/worker-rest-cloudflare.test.ts test/unit/worker-auth-oauth-cors.test.ts test/unit/architecture-hygiene.test.ts test/unit/dependency-hygiene.test.ts && echo WORKER_REST_TESTS_OK"
    expect: WORKER_REST_TESTS_OK
  - check: "npm run test && echo ALL_TESTS_OK"
    expect: ALL_TESTS_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
  - check: "test ! -e lib/workers/tokens.ts && test ! -e smithery.config.js && echo CLEANUP_OK"
    expect: CLEANUP_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-21T13:46:49Z
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
- 2026-11-21T13:46:49Z - **triaged** - triaged in wave 1 parallel remediation [aceite reescrito: 4 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-21T13:47:16Z - **designed** - DES-0032 created
- 2026-11-21T13:47:25Z - **executing** - executing TCK-0037
- 2026-11-21T13:51:46Z - **verifying** - implementation verified and ready for review
- 2026-11-21T14:06:02Z - **done** - P10 verify approved-with-notes (8c948d51) + judge pass
