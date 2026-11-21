---
id: DES-0032
slug: alinhar-contrato-rest-openapi-e-remover-legados
title: "Alinhar contrato REST/OpenAPI do Worker, corrigir 404/decodeURIComponent e limpar legados"
created_at: 2026-11-21T13:47:00Z
status: approved
ticket: TCK-0037
type: design
scope_files_new: []
scope_files_modified:
  - lib/workers/types.ts
  - lib/workers/openapi.ts
  - lib/workers/rest.ts
  - lib/workers/worker.ts
  - lib/core/dork-templates.ts
  - lib/config/timeouts.ts
  - test/unit/worker-rest-cloudflare.test.ts
  - .archagents/03-modules.md
  - docs/CONFIGURATION.md
  - CLAUDE.md
  - test/manual/test-manual.js
  - .github/workflows/cloudflare-deploy.yml
scope_files_deleted:
  - lib/workers/tokens.ts
  - smithery.config.js
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0032-playbook.md
acceptance_delta: unchanged
---
# DES-0032 - Alinhar contrato REST/OpenAPI do Worker, corrigir 404/decodeURIComponent e limpar legados

## Problema (`FND-0022`)

O contrato REST/OpenAPI do Cloudflare Worker e módulos/documentação adjacentes apresentam deriva em relação aos schemas Zod canônicos (`lib/core/tool-schemas.ts`) e ao comportamento real de runtime:
1. `lib/workers/types.ts` e `lib/workers/openapi.ts` listam apenas 6 categorias OSINT (vs. 10 em `DORK_CATEGORIES`), omitem `provider` (`SEARCH_PROVIDERS`) e `max_results` em `/intelligence`, e definem `ThinkingRequestBody` e `/thinking` divergentes de `SequentialThinkingSchema`.
2. `lib/workers/rest.ts:L43` compara `mcpResponse.error.data === 'Not found'`, mas `lookup()` retorna `"CNPJ not found"` / `"CEP not found"`, fazendo o endpoint devolver `400` em vez de `404`. Além disso, `handleIntelligenceEndpoint` não encaminha `provider`/`max_results` e injeta defaults/chaves `undefined` incompatíveis com `CnpjIntelligenceSchema.strict()`.
3. `lib/workers/worker.ts:L136-140` passa o segmento bruto da rota `^/(cnpj|cep)/(.+)$` sem `decodeURIComponent`, quebrando CNPJs URL-encoded (`%2F`) e sem tratar `%ZZ` inválido com `400`.
4. Existem artefatos/exports mortos (`lib/workers/tokens.ts`, `smithery.config.js`, `getDorksByCategory`, `getPrioritizedDorks`, `logTimeoutConfig`) e referências obsoletas em `.archagents/03-modules.md:L9`, `docs/CONFIGURATION.md`, `CLAUDE.md:L166-167`, `test/manual/test-manual.js` e `.github/workflows/cloudflare-deploy.yml:L117-120`.

## Solucao

1. **Alinhar tipos e OpenAPI (`lib/workers/types.ts`, `lib/workers/openapi.ts`):** importar `DORK_CATEGORIES` e `SEARCH_PROVIDERS` de `../core/tool-schemas.js`; exportar `DorkCategory` e `SearchProvider`; atualizar `IntelligenceRequestBody` e `ThinkingRequestBody`; atualizar `/intelligence` (`categories`, `provider`, `max_results`) e `/thinking` (`maxLength`, `maximum`, campos opcionais de revisão/branch) preservando `info` intacto (reservado a `TCK-0033`).
2. **Corrigir REST & Router (`lib/workers/rest.ts`, `lib/workers/worker.ts`):**
   - `handleLookupEndpoint`: retornar `404` quando `mcpResponse.error.code === -32603 && typeof mcpResponse.error.data === 'string' && /not found/i.test(mcpResponse.error.data)`.
   - `handleIntelligenceEndpoint`: extrair `{ cnpj, categories, provider, max_results_per_query, max_queries, max_results } = body` e montar `args: Record<string, unknown> = { cnpj }` adicionando chaves opcionais apenas quando `!== undefined`, preservando estrutura `try/catch` para Wave 2 (`TCK-0035`/`TCK-0038`).
   - `worker.ts`: decodificar `value` com `try { decodedValue = decodeURIComponent(value); } catch { return 400 ... }`, mantendo `GET /` intacto.
3. **Limpar legados e sincronizar referências:** remover `lib/workers/tokens.ts`, `smithery.config.js`, `getDorksByCategory`/`getPrioritizedDorks` (`lib/core/dork-templates.ts`) e `logTimeoutConfig` (`lib/config/timeouts.ts`); atualizar `.archagents/03-modules.md`, `docs/CONFIGURATION.md`, `CLAUDE.md`, `test/manual/test-manual.js` e `.github/workflows/cloudflare-deploy.yml` (enviando `MCP_API_KEY` quando configurada / validando 401 vs 200 + `/openapi.json` sem relaxar permissões).
4. **Testes:** atualizar e expandir `test/unit/worker-rest-cloudflare.test.ts` cobrindo schema OpenAPI, `decodeURIComponent` (`%2F` e `%ZZ` -> `400`), `404` para CNPJ/CEP não encontrado, e forwarding estrito de `provider`/`max_results` em `/intelligence`.

## Criterios de sucesso

- [x] Todos os 4 critérios de aceite de `TCK-0037` passam (`WORKER_REST_TESTS_OK`, `ALL_TESTS_OK`, `TYPECHECK_OK`, `CLEANUP_OK`).
- [x] `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit` e `secret-scan.sh` passam sem erros.
- [x] Zero referências remanescentes a `lib/workers/tokens.ts`, `smithery.config.js`, `getDorksByCategory`, `getPrioritizedDorks` ou `logTimeoutConfig`.
