---
id: ADR-0001
title: "Extrair lib/core/lookup.ts para eliminar ciclo core-tools e unificar contrato cnpj_intelligence"
status: accepted
date: 2026-11-20
deciders: codex
tickets:
  - TCK-0024
supersedes: []
---
# ADR-0001 - Extrair lib/core/lookup.ts para eliminar ciclo core-tools e unificar contrato cnpj_intelligence

## Contexto

Na auditoria arquitetural (`FND-0012` / `TCK-0024`), foram identificadas duas fragilidades estruturais na camada central:

1. **Ciclo de dependência `lib/core/` <-> `lib/tools/`:** `lib/core/intelligence.ts` importava `lookup` de `lib/tools/core.ts`, enquanto `lib/tools/core.ts` importava `executeIntelligence` e `CNPJ_INTELLIGENCE_TOOL` de `lib/core/intelligence.ts` (com import dinâmico e schema duplicado inline). Além de violar a direção de dependência (`tools -> core`), `lib/tools/company.ts` também dependia de `lib/tools/core.ts` apenas para `lookup`.
2. **Deriva e duplicação do contrato `cnpj_intelligence`:** `lib/tools/core.ts` definia uma cópia própria de `inputSchema` (apenas provider `tavily`, limite `max_queries` divergente) diferente de `CNPJ_INTELLIGENCE_TOOL` em `lib/core/intelligence.ts` (`L458-L525`), e `executeIntelligenceInternal` não normalizava o CNPJ antes de consultar a chave de cache `cnpj:${baseUrl}:${cnpj}`, causando cache miss quando o CNPJ entrava formatado enquanto `lookup()` gravava com dígitos normalizados (ou vice-versa).

## Decisao

1. **Extrair serviço compartilhado em `lib/core/lookup.ts` (`L1-L87`):** mover `PendingRequest`, `getPendingRequestCount()`, `deduplicate()` e `lookup()` para a camada `core`, dependendo apenas de `./http-client.js`, `../config/timeouts.js` e `../types/index.js`.
2. **Inverter imports para fluxo acíclico:** `lib/core/intelligence.ts:L5` e `lib/tools/company.ts` passam a importar `lookup` diretamente de `core/lookup.js`. `lib/tools/core.ts:L6` importa `{ deduplicate, getPendingRequestCount, lookup }` de `../core/lookup.js` e re-exporta os símbolos (`L103`) apenas para compatibilidade retroativa com testes unitários existentes.
3. **Fonte única do contrato `cnpj_intelligence`:** `lib/tools/core.ts:L16,L66-L90` importa estaticamente `CNPJ_INTELLIGENCE_TOOL` e `executeIntelligence` de `../core/intelligence.js`, usa `...CNPJ_INTELLIGENCE_TOOL` e `CnpjIntelligenceSchema` de `../core/tool-schemas.js` (`L9,L68`), encaminhando `max_results_per_query ?? max_results` e `max_queries` (`L83-L84`). Em `lib/core/intelligence.ts:L219-L242`, `executeIntelligenceInternal` passa a normalizar `normalizedCnpj = normalizeCnpj(options.cnpj)` antes da leitura de cache e do fallback para `lookup('cnpj', normalizedCnpj, ...)`, e `CNPJ_INTELLIGENCE_TOOL` documenta ambos os provedores `tavily` e `perplexity` (`L471-L475`, `L504`).

## Alternativas descartadas

- **Manter `lookup()` em `lib/tools/core.ts` usando lazy import contínuo:** manteria acoplamento circular bidirecional entre `core` e `tools` e impediria verificação estática limpa do grafo de imports.
- **Duplicar `lookup()` dentro de `intelligence.ts`:** multiplicaria o mapa `pendingRequests` de deduplicação em voo e reintroduziria inconsistência de TTL/timeout/chaves de cache.

## Consequencias

- **Positivas:** grafo `lib/core/` -> `lib/tools/` estritamente acíclico (nenhum arquivo em `lib/core/` importa de `lib/tools/`), zero duplicação de lógica de deduplicação ou schema de `cnpj_intelligence`, alinhamento de cache hits em CNPJs formatados/não-formatados, garantido em build (`tsc`, `tsconfig.worker.json`) e teste unitário (`test/unit/architecture-hygiene.test.ts`).
- **Custos / Trade-offs:** `lib/tools/core.ts:L103` mantém re-export de compatibilidade para suites antigas; remoções futuras exigem atualizar esses imports nos testes. Comportamento com Cloudflare KV em produção permanece *a confirmar*.

## Evidencias

- `lib/core/lookup.ts:L1-L87`
- `lib/core/intelligence.ts:L5,L219-L253,L458-L525`
- `lib/tools/core.ts:L6-L17,L66-L90,L103`
- `test/unit/architecture-hygiene.test.ts`
