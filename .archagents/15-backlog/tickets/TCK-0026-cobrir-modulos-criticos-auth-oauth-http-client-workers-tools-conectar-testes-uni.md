---
id: TCK-0026
slug: cobrir-modulos-criticos-auth-oauth-http-client-workers-tools-conectar-testes-uni
title: "Cobrir modulos criticos (auth, oauth, http-client, workers, tools), conectar testes unitarios ao codigo real, corrigir test:coverage e fake timers"
source: audit
created_at: 2026-11-20T15:16:23Z
created_by: ops
updated_at: 2026-11-20T19:21:49Z
status: raw
severity: high
category: test-coverage
effort: L
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0014
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/08-conventions.md
external_refs: []
external_sync: []
blocks: []
blocked_by:
  - TCK-0027
  - TCK-0028
  - TCK-0029
related: []
acceptance:
  - check: "npm run test:coverage && npm test && echo COVERAGE_AND_TESTS_OK"
    expect: COVERAGE_AND_TESTS_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
---
# TCK-0026 - Cobrir modulos criticos (auth, oauth, http-client, workers, tools), conectar testes unitarios ao codigo real, corrigir test:coverage e fake timers

## Contexto

Originado por **FND-0014** (`test-coverage` / `high`, auditoria na revisão `6c74db6`).

- **Evidências:** `vitest.config.ts:L81-L102`, `package.json:L21`, `package.json:L60-L74`, `test/unit/sse.test.ts:L1-L2`, `test/unit/concurrency.test.ts:L1-L44`, `test/unit/deduplication.test.ts:L1-L96`, `test/unit/intelligence.test.ts:L1-L36`, `test/unit/circuit-breaker.test.ts:L81`, `test/unit/circuit-breaker.test.ts:L100`, `test/unit/circuit-breaker.test.ts:L187`.
- **Problema:** Módulos críticos (`workers/*`, `adapters/{cloudflare,smithery}`, `core/{http-client,sequential-thinking}`, `tools/{legal,company}`) têm 0 testes unitários; 4 arquivos de teste unitário duplicam código localmente sem importar `lib/`; `npm run test:coverage` falha sem `@vitest/coverage-v8`; `circuit-breaker.test.ts` e `concurrency.test.ts` usam `setTimeout` reais.
- **Mitigação:** Adicionar testes unitários importando diretamente os módulos de `lib/` (incluindo caminhos de falha/auth), conectar as 4 suítes replicadas ao código real, corrigir `test:coverage` (`@vitest/coverage-v8` + revisão de exclusões) e adotar fake timers.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

Evidências pré-fix de **FND-0014** observadas antes da decomposição (`ef0dad9`):

1. `npm run test:coverage` falha porque `@vitest/coverage-v8` não está instalado em `package.json`.
2. `vitest.config.ts:L17-L28` exclui `lib/workers/` e `lib/adapters/cloudflare.ts` dos thresholds de cobertura.
3. Quatro suítes em `test/unit/` duplicam funções localmente em vez de importar módulos reais de `lib/` (`sse.test.ts`, `concurrency.test.ts`, `deduplication.test.ts`, `intelligence.test.ts`).
4. `test/unit/circuit-breaker.test.ts:L81,L100,L187` e `test/unit/concurrency.test.ts:L76` executam `setTimeout` reais em vez de fake timers.
5. Módulos críticos restantes (`workers/rest.ts`, `workers/worker.ts` rotas REST, `tools/{company,health,osint,legal}.ts`) ainda precisam de cobertura direta além das suítes de segurança/confiabilidade já entregues em `TCK-0013..TCK-0020`.

**Decomposição aprovada pelo operador (16:28, L3):**
- `TCK-0027` (`TCK-0026a`, `S`): `@vitest/coverage-v8`, `vitest.config.ts` (incluindo Workers + ratchet honesto) e fake timers em `circuit-breaker.test.ts`.
- `TCK-0028` (`TCK-0026b`, `M`): conectar `sse.test.ts`, `concurrency.test.ts`, `deduplication.test.ts` e `intelligence.test.ts` ao código real em `lib/` + fake timers.
- `TCK-0029` (`TCK-0026c`, `M`): cobrir módulos críticos restantes (`workers/rest.ts`, `worker.ts`, `tools/{company,health,osint,legal}.ts`, `cloudflare.ts`) e elevar o ratchet de cobertura.

## Log de transicoes

- 2026-11-20T15:16:23Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T19:21:32Z - **noted** - body:falsifier (append): Registrar falsificador FND-0014 e decomposicao em //
- 2026-11-20T19:21:49Z - **linked** - links updated
