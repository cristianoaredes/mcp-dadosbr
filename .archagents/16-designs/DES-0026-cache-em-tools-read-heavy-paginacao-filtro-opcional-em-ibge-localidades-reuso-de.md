---
id: DES-0026
slug: cache-em-tools-read-heavy-paginacao-filtro-opcional-em-ibge-localidades-reuso-de
title: "Cache em tools read-heavy, paginacao/filtro opcional em ibge_localidades, reuso de lookup em deep_profile e raspagem concorrente cacheada em procurados_lookup"
created_at: 2026-11-20T20:12:27Z
status: approved
ticket: TCK-0023
type: design
scope_files_new:
  - test/unit/performance-cache-pagination.test.ts
scope_files_modified:
  - lib/core/tool-schemas.ts
  - lib/core/mcp-server.ts
  - lib/tools/government.ts
  - lib/tools/financial.ts
  - lib/tools/company.ts
  - lib/tools/legal.ts
  - lib/tools/health.ts
  - test/unit/legal-timeouts-intelligence.test.ts
  - .archagents/05-integrations.md
scope_files_deleted: []
blast_radius: medium
playbook: .archagents/16-designs/playbooks/DES-0026-playbook.md
acceptance_delta: unchanged
---
# DES-0026 - Cache em tools read-heavy, paginacao/filtro opcional em ibge_localidades, reuso de lookup em deep_profile e raspagem concorrente cacheada em procurados_lookup

## Problema

Em `FND-0011` (`TCK-0023`):
1. `ibge_localidades` (`lib/tools/government.ts`) ignora `cache`, ignora `id` e retorna ~5.570 municípios em payload único sem paginação nem filtro por nome.
2. Tools read-heavy em `lib/tools/government.ts`, `lib/tools/financial.ts`, `lib/tools/company.ts`, `lib/tools/legal.ts` e `lib/tools/health.ts` ignoram o argumento `cache` fornecido por `executeRegisteredTool`.
3. `executeDeepProfile` (`lib/tools/company.ts:L166`) chama `httpJson` diretamente para CNPJ em vez de reutilizar `lookup()` (`cache` + `deduplicate`).
4. `procurados_lookup` (`lib/tools/legal.ts`) raspa sequencialmente 13 páginas sem concorrência limitada e sem cache da lista consolidada entre consultas.

## Design & Riscos

| ID | Risco / Lacuna | Contramedida |
|---|---|---|
| R1 | Vazamento de chaves/segredos (`TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`) em chaves de cache ou bypass de checagem de API key | Verificar API keys obrigatórias antes de consultar cache; nunca incluir secrets nas chaves de cache |
| R2 | Envenenamento de cache com falhas parciais, CAPTCHAs, fallbacks manuais ou erro 4xx/5xx | Só gravar em cache respostas upstream bem-sucedidas (`ok: true`); em `ceis_cnep_lookup` só gravar se `errors.length === 0`; em `procurados_lookup` só gravar `PROCURADOS_CACHE_KEY` quando `pagesFailed.length === 0` (mantendo fail-closed `TCK-0019`) |
| R3 | Quebra de compatibilidade com MCP Apps (`apps/ibge`, `ibge-app.test.ts`, `bacen-app`, `pncp-app`, `querido-diario-app`) | Sem `page`/`limit`, `ibge_localidades` continua retornando array puro; com `page`/`limit`, retorna `{ items, pagination, filter? }`; `mcp-server.ts` preserva `structuredContent.source` tanto em arrays quanto em payloads com `.items`; `source` é armazenado junto nos caches de `ibge`, `pncp`, `querido_diario` e `bacen` |
| R4 | Saturação do portal MJSP ou vazamento de timers/abort em `procurados_lookup` | Usar `executeWithConcurrencyLimit` com `PROCURADOS_CONCURRENCY = 4`, timer total único (`totalCtrl`) + controller por página limpos em `finally` |

## Mudancas

- `lib/core/tool-schemas.ts`: adicionar `nome`, `page`, `limit` opcionais e limitados em `IbgeSchema`.
- `lib/core/mcp-server.ts`: propagar `structuredContent` de `ibge_localidades` para payloads paginados (`items`) e arrays legados.
- `lib/tools/government.ts`: cache + filtro (`id`, `nome` acento/case-insensitive) + paginação opcional em `executeIBGE`, além de `cache` em `executeTransparencia`, `executeCeisCnep`, `executePncpPublication`/`executePncp` e `executeQueridoDiario`.
- `lib/tools/financial.ts`: `cache` em `executeBacen` (preservando `source`) e `executeFipe`.
- `lib/tools/company.ts`: reutilizar `lookup("cnpj", ...)` + repassar `cache` em `executeDeepProfile`, além de `cache` em `executeWhois` e `executeConsumidor`.
- `lib/tools/legal.ts`: `cache` em `executeDatajud`, `executeOab`, `executeBnmp`, `executeListaSuja` e concorrência limitada (`PROCURADOS_CONCURRENCY = 4`) + cache integral (`pagesFailed.length === 0`) em `executeProcurados`.
- `lib/tools/health.ts`: `cache` em `executeCnes`.
- `test/unit/performance-cache-pagination.test.ts`, `test/unit/legal-timeouts-intelligence.test.ts`, `.archagents/05-integrations.md`.

## Criterios de sucesso

- [ ] `npx vitest run test/unit/performance-cache-pagination.test.ts test/unit/ibge-app.test.ts test/unit/legal-timeouts-intelligence.test.ts`
- [ ] `npm run test:coverage && npm test`
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit`
- [ ] `npm run build && npm run build:worker && npm run test:transport`
