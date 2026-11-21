---
status: completed
run_id: RUN-20261121-134716-tck-0037
ticket: TCK-0037
design: DES-0032
start_time: 2026-11-21T13:47:16Z
end_time: 2026-11-21T14:01:14Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
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
files_deleted:
  - lib/workers/tokens.ts
  - smithery.config.js
test_result:
  status: pass
  summary: "443/443 Vitest (31 files), V8 coverage 92.15% stmts / 84.01% branch / 94.16% funcs / 92.84% lines, tsc --noEmit PASS, tsc -p tsconfig.worker.json --noEmit PASS, secret-scan.sh PASS (0 secrets)"
  details: "Targeted suite (worker-rest-cloudflare, worker-auth-oauth-cors, architecture-hygiene, dependency-hygiene): 4/4 files, 40/40 tests PASS; build + build:worker PASS."
---
# RUN-20261121-134716-tck-0037 - TCK-0037 (`FND-0022`)

## Resumo executivo

Execução completa da remediação arquitetural do contrato REST/OpenAPI do Worker e limpeza de legados (`FND-0022` / `DES-0032`):

1. **`lib/workers/types.ts` & `lib/workers/openapi.ts`**: importados `DORK_CATEGORIES` e `SEARCH_PROVIDERS` de `../core/tool-schemas.js`; exportados `DorkCategory` e `SearchProvider`; atualizados `IntelligenceRequestBody` e `ThinkingRequestBody`; alinhados os schemas OpenAPI de `/intelligence` (todas as 10 categorias, `provider`, `max_results`) e `/thinking` (`maxLength: 10000`, `maximum: 1000`, `isRevision`, `revisesThought`, `branchFromThought`, `branchId`, `needsMoreThoughts`), preservando `info` intacto para `TCK-0033`.
2. **`lib/workers/rest.ts` & `lib/workers/worker.ts`**: corrigido `handleLookupEndpoint` para retornar HTTP `404` quando `mcpResponse.error.code === -32603 && typeof mcpResponse.error.data === 'string' && /not found/i.test(mcpResponse.error.data)` (`"CNPJ not found"` / `"CEP not found"`); atualizado `handleIntelligenceEndpoint` para extrair `provider`/`max_results` e montar `args` apenas com chaves `!== undefined` (compatível com `CnpjIntelligenceSchema.strict()`); adicionada decodificação segura `decodeURIComponent` com retorno `400` em `%ZZ` inválido em `worker.ts` (preservando `GET /` intacto para `TCK-0033`).
3. **Limpeza de legados**: removidos `lib/workers/tokens.ts`, `smithery.config.js`, `getDorksByCategory`/`getPrioritizedDorks` em `lib/core/dork-templates.ts` e `logTimeoutConfig` em `lib/config/timeouts.ts` após confirmar zero referências ativas via `rg`.
4. **Sincronização de referências**: removidas menções obsoletas a `crypto.ts` e `tokens.ts` em `.archagents/03-modules.md:L9`; corrigidos endpoints de transporte HTTP (`GET /mcp`, `POST /messages`) e proteção de `/mcp`/`/sse` em `docs/CONFIGURATION.md` e `CLAUDE.md`; corrigidos imports e payloads de `test/manual/test-manual.js`; atualizado `Test deployment` em `.github/workflows/cloudflare-deploy.yml` para testar `/openapi.json` e enviar `Authorization: Bearer $MCP_API_KEY` (ou aceitar `401` quando `secrets.MCP_API_KEY` não estiver definido no CI) mantendo `permissions` e `persist-credentials: false`.
5. **Testes**: atualizados e expandidos testes em `test/unit/worker-rest-cloudflare.test.ts` (removido bloco `tokens.ts`, ajustado `404` de lookup, adicionados testes de OpenAPI `/intelligence` e `/thinking`, `decodeURIComponent` `%2F`/`%ZZ`, e forwarding estrito de `provider`/`max_results`).

## Lições consultadas

`cbctl.py learn consult TCK-0037 --run RUN-20261121-134716-tck-0037` retornou 1 lição advisory cross-ticket: `[medium] Precisou de 2 iterações (re-execução)`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npm run test` | 31/31 files pass | 31 passed, 443 passed (443) | PASS |
| `npm run test:coverage` | >= 85/80/85/85 | 92.15% Stmts / 84.01% Branch / 94.16% Funcs / 92.84% Lines | PASS |
| `npx tsc --noEmit` | exit 0 | exit 0 | PASS |
| `npx tsc -p tsconfig.worker.json --noEmit` | exit 0 | exit 0 | PASS |
| `secret-scan.sh` | 0 segredos | `✅ No secrets detected.` (exit 0) | PASS |
| `rg` referências mortas | 0 ocorrências | `ZERO_REFS_OK` | PASS |
