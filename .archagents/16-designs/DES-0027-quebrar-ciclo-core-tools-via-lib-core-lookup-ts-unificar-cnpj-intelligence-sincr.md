---
id: DES-0027
slug: quebrar-ciclo-core-tools-via-lib-core-lookup-ts-unificar-cnpj-intelligence-sincr
title: "Quebrar ciclo core-tools via lib/core/lookup.ts, unificar cnpj_intelligence, sincronizar versao/env/catalogo do Worker, remover orfaos e atualizar AS-IS/ADRs"
created_at: 2026-11-20T20:46:26Z
status: approved
ticket: TCK-0024
type: design
scope_files_new:
  - lib/core/lookup.ts
  - test/unit/architecture-hygiene.test.ts
  - .archagents/09-decisions/ADR-0001.md
  - .archagents/09-decisions/ADR-0002.md
scope_files_modified:
  - lib/core/intelligence.ts
  - lib/tools/core.ts
  - lib/tools/company.ts
  - lib/shared/utils/constants.ts
  - lib/config/index.ts
  - lib/adapters/cloudflare.ts
  - lib/workers/worker.ts
  - lib/workers/sse.ts
  - lib/workers/openapi.ts
  - package.json
  - .archagents/00-overview.md
  - .archagents/02-architecture.md
  - .archagents/03-modules.md
  - .archagents/_meta.json
scope_files_deleted:
  - test/unit/search.test.ts.patch
blast_radius: medium
playbook: .archagents/16-designs/playbooks/DES-0027-playbook.md
acceptance_delta: unchanged
---
# DES-0027 - Quebrar ciclo core-tools via lib/core/lookup.ts, unificar cnpj_intelligence, sincronizar versao/env/catalogo do Worker, remover orfaos e atualizar AS-IS/ADRs

## Problema

Em `FND-0012` (`TCK-0024`):
1. `lib/core/intelligence.ts` importa `lookup` de `lib/tools/core.ts`, enquanto `lib/tools/core.ts` importa dinamicamente `lib/core/intelligence.ts`, mantendo acoplamento cíclico entre camadas `core ↔ tools`.
2. `lib/tools/core.ts` duplica inline a definição MCP de `cnpj_intelligence` em vez de reutilizar `CNPJ_INTELLIGENCE_TOOL`, e `executeIntelligenceInternal` consulta cache e `lookup` sem normalizar `options.cnpj`.
3. `SERVER_VERSION` e endpoints/eventos Worker (`lib/config/index.ts`, `lib/shared/utils/constants.ts`, `lib/workers/{worker,sse,openapi}.ts`) anunciam `"1.0.0"` em contraste com `package.json` (`"0.6.0"`).
4. `lib/adapters/cloudflare.ts` e `lib/workers/worker.ts` propagam apenas `TAVILY_API_KEY` para `process.env` (omitindo `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`) e `GET /` anuncia somente 5/23 ferramentas.
5. `test/unit/search.test.ts.patch` e script `"test:sse"` em `package.json` são artefatos órfãos/quebrados; docs AS-IS (`00-overview`, `02-architecture`, `03-modules`), `_meta.json` e `.archagents/09-decisions/` (0 ADRs) precisam de sincronização.

## Design & Riscos

| ID | Risco / Lacuna | Contramedida |
|---|---|---|
| R1 | Quebra de imports existentes de `deduplicate`/`lookup`/`getPendingRequestCount` em `test/unit/*` | Extrair lógica real para `lib/core/lookup.ts` e re-exportar os três símbolos em `lib/tools/core.ts` sem alterar assinaturas |
| R2 | Regressão no transporte/catálogo ou apps com `SERVER_VERSION` `"0.6.0"` | Unificar `SERVER.VERSION` (`"0.6.0"` = `package.json`) e `SERVER_VERSION = SERVER.VERSION`, substituir literais `"1.0.0"` no Worker (`worker.ts`, `sse.ts`, `openapi.ts`) e validar com `test:transport` |
| R3 | Chaves ausentes ou protótipo poluído em `syncWorkerEnv(env)` | Copiar explicitamente apenas allowlist fixa de 4 chaves string não-vazias (`TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`), com guarda `typeof process !== "undefined"` e sem logar segredos |
| R4 | Divergência futura de contrato em `cnpj_intelligence` ou retorno de ciclo | `lib/tools/core.ts` usa `...CNPJ_INTELLIGENCE_TOOL` e import estático acíclico; `test/unit/architecture-hygiene.test.ts` verifica ausência de ciclo, paridade de versão/env/catálogo e remoção dos órfãos |

## Criterios de sucesso

- [ ] `npx vitest run test/unit/architecture-hygiene.test.ts test/unit/worker-rest-cloudflare.test.ts test/unit/deduplication.test.ts test/unit/dependency-hygiene.test.ts`
- [ ] `npm run test:coverage && npm test`
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit`
- [ ] `npm run build && npm run build:worker && npm run test:transport`
