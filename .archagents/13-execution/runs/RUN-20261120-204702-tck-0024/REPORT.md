---
status: completed
run_id: RUN-20261120-204702-tck-0024
ticket: TCK-0024
design: DES-0027
start_time: 2026-11-20T20:47:02Z
end_time: 2026-11-20T20:53:00Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/core/lookup.ts
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
  - test/unit/search.test.ts.patch
  - test/unit/architecture-hygiene.test.ts
  - .archagents/09-decisions/ADR-0001-extrair-lib-core-lookup-ts-para-eliminar-ciclo-core-tools-e-unificar-contrato-cn.md
  - .archagents/09-decisions/ADR-0002-paridade-de-versao-catalogo-de-23-tools-e-injecao-de-env-vars-entre-cli-node-e-c.md
  - .archagents/00-overview.md
  - .archagents/02-architecture.md
  - .archagents/03-modules.md
test_result:
  status: pass
  summary: "Post-polish full verification: 28/28 targeted (4 files), 434/434 Vitest (30 files), V8 coverage 88.97% stmts / 82.1% branch / 87.3% funcs / 89.68% lines >= 80/75/80/80, tsc + tsc.worker + build + build:worker + test:transport PASS (23 tools stdio & HTTP/SSE), criteria-check 4/4"
---
# Relatório de Execução — RUN-20261120-204702-tck-0024

- **Ticket:** `TCK-0024` (`FND-0012` — arquitetura)
- **Design / Playbook:** `DES-0027` (`DES-0027-playbook.md`)
- **Branch:** `chore/TCK-0024-architecture-cycle-contract-worker-parity-adrs` (worktree `.worktrees/audit-remediation`)
- **Data:** `2026-11-20`
- **Status:** Concluído (aguardando verificação independente e commit)

## Alterações Implementadas

1. **Separação acíclica `lib/core/` <-> `lib/tools/` (`ADR-0001`):**
   - Criado `lib/core/lookup.ts` extraindo `PendingRequest`, `getPendingRequestCount`, `deduplicate` e `lookup` (importando apenas `./http-client.js`, `../config/timeouts.js`, `../types/index.js`).
   - Atualizado `lib/core/intelligence.ts` para importar `lookup` de `./lookup.js`, normalizar `options.cnpj` com `normalizeCnpj` em `executeIntelligenceInternal` (`cacheKey`, `lookup`) e documentar ambos provedores (`tavily`, `perplexity`) em `CNPJ_INTELLIGENCE_TOOL`.
   - Atualizado `lib/tools/company.ts` para importar `lookup` de `../core/lookup.js`.
   - Simplificado `lib/tools/core.ts` removendo duplicatas de `lookup`/`deduplicate` e schema inline de `cnpj_intelligence`, adotando `...CNPJ_INTELLIGENCE_TOOL` + import estático de `executeIntelligence` + re-export de compatibilidade em `L103`.

2. **Paridade de versão, catálogo Worker e injeção de env vars (`ADR-0002`):**
   - Alinhado `SERVER.VERSION` em `lib/shared/utils/constants.ts:L37` e `SERVER_VERSION` em `lib/config/index.ts:L13` para `'0.6.0'`.
   - Atualizados `lib/workers/worker.ts`, `lib/workers/sse.ts` e `lib/workers/openapi.ts` para usar `SERVER_VERSION` no lugar de strings `'1.0.0'`, e `GET /` em `worker.ts:L109` para publicar dinamicamente `TOOL_DEFINITIONS.map((tool) => tool.name)` (23 tools).
   - Declarados `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY` e `DATAJUD_API_KEY` na interface `Env` e criado helper `syncWorkerEnv(env)` em `lib/adapters/cloudflare.ts:L40-L58` (propagando somente a allowlist de 4 chaves de API não-vazias para `process.env`, substituindo `if (env.TAVILY_API_KEY)` duplicados em `cloudflare.ts` e `worker.ts`).

3. **Higiene de órfãos e documentação governada:**
   - Removido script quebrado `"test:sse"` em `package.json`.
   - Removido patch órfão `test/unit/search.test.ts.patch`.
   - Criada suíte `test/unit/architecture-hygiene.test.ts` (5 testes).
   - Criados `ADR-0001` e `ADR-0002` em `.archagents/09-decisions/` e sincronizados `.archagents/{00-overview,02-architecture,03-modules}.md` + `_meta.json`.

## Evidências Locais

- `npx vitest run test/unit/architecture-hygiene.test.ts test/unit/worker-rest-cloudflare.test.ts test/unit/deduplication.test.ts test/unit/dependency-hygiene.test.ts`: **4 files, 28/28 tests passed (`255ms`)**.
- `npm run test:coverage` + `npm test`: **30 files, 434/434 tests passed**, V8 **`88.97%` Stmts / `82.1%` Branch / `87.3%` Funcs / `89.68%` Lines**.
- `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit`: exit `0`.
- `npm run build && npm run build:worker && npm run test:transport`: exit `0` (`PASS: both transports expose the expected catalogue`, 23 tools em stdio e HTTP/SSE, 5 MCP Apps, 101 calls sem erro).
- `criteria-check.py --ticket TCK-0024 --json`: **`verdict: "pass"` (`4/4`)**.
- Logs completos em `commands.log` e diff em `diff.txt`.
