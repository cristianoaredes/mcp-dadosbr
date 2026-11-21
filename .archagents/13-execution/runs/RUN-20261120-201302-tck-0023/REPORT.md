---
status: completed
run_id: RUN-20261120-201302-tck-0023
ticket: TCK-0023
design: DES-0026
start_time: 2026-11-20T20:13:02Z
end_time: 2026-11-20T20:18:00Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/core/tool-schemas.ts
  - lib/core/mcp-server.ts
  - lib/tools/government.ts
  - lib/tools/financial.ts
  - lib/tools/company.ts
  - lib/tools/legal.ts
  - lib/tools/health.ts
  - test/unit/performance-cache-pagination.test.ts
  - test/unit/legal-timeouts-intelligence.test.ts
  - .archagents/05-integrations.md
test_result:
  status: pass
  summary: "26/26 targeted (3 files), 428/428 Vitest (29 files, 850ms), V8 coverage 88.80% stmts / 81.87% branch / 87.23% funcs / 89.47% lines >= ratchet 80/75/80/80, tsc + tsc.worker + build + build:worker + test:transport PASS, criteria-check 4/4 pass"
---
# RUN-20261120-201302-tck-0023 - TCK-0023 (`FND-0011`)

## Resumo executivo

- **`ibge_localidades` (`lib/core/tool-schemas.ts`, `lib/core/mcp-server.ts`, `lib/tools/government.ts`):** Adicionado caching por URL (`ibge:${url}` preservando `source`), filtros opcionais em memória (`id` e `nome` acento/case-insensitive) e paginação opcional (`page`/`limit`, retornando `{ items, pagination, filter? }` quando informados e mantendo array bruto legado + `structuredContent.source` quando omitidos).
- **Cache seguro em tools read-heavy (`lib/tools/{government,financial,company,legal,health}.ts`):** Habilitado `cache` em `transparencia_lookup`, `ceis_cnep_lookup`, `pncp_licitacoes`, `querido_diario`, `bacen_taxas`, `fipe_veiculos`, `domain_whois`, `consumidor_reclamacoes`, `datajud_processos`, `oab_advogado`, `bnmp_mandados`, `lista_suja_lookup` e `cnes_saude`. API keys obrigatórias (`TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`) são validadas antes da leitura do cache e nunca entram nas chaves; erros, CAPTCHAs, fallbacks e resultados parciais (`errors.length > 0`) nunca são cacheados; `source` é preservado para MCP Apps.
- **Reuso de `lookup()` em `company_deep_profile` (`lib/tools/company.ts`):** `executeDeepProfile` agora reutiliza `lookup("cnpj", cleanCnpj, apiConfig, cache)` (cache + `deduplicate`) e propaga `cache` aos sub-lookups.
- **`procurados_lookup` concorrente e cacheado fail-closed (`lib/tools/legal.ts`):** Raspagem das 13 páginas paralela com `executeWithConcurrencyLimit(..., PROCURADOS_CONCURRENCY = 4)` sob timer agregado `totalCtrl` + timer por página; cache da lista completa (`PROCURADOS_CACHE_KEY`) gravado apenas quando `pagesFailed.length === 0`, mantendo comportamento fail-closed `TCK-0019`.
- **Testes & Docs:** Atualizado `test/unit/legal-timeouts-intelligence.test.ts` para `12` fetches em 3 ondas concorrentes no deadline, criada suíte `test/unit/performance-cache-pagination.test.ts` (8 testes) e atualizada `.archagents/05-integrations.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/performance-cache-pagination.test.ts test/unit/ibge-app.test.ts test/unit/legal-timeouts-intelligence.test.ts` | `passed` | **3/3** arquivos, **26/26** testes | PASS |
| `npm run test:coverage` | `passed` | **29/29** (`428/428`), `88.80%` stmts / `81.87%` branches / `87.23%` funcs / `89.47%` lines >= `80/75/80/80` | PASS |
| `npm test` | `passed` | **29/29** arquivos, **428/428** testes (`850ms`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport` | Exit `0` + `PASS` | `TYPECHECK_OK` + `BUILD_OK` + `PASS: both transports expose the expected catalogue` | PASS |
| `criteria-check.py --root "$WT" --ticket TCK-0023 --json` | `verdict: pass` | **4/4** critérios `pass` | PASS |
