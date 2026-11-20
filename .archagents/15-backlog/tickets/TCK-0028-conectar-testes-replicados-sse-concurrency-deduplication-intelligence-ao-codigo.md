---
id: TCK-0028
slug: conectar-testes-replicados-sse-concurrency-deduplication-intelligence-ao-codigo
title: "Conectar testes replicados (sse, concurrency, deduplication, intelligence) ao codigo real em lib/ com fake timers (TCK-0026b)"
source: audit
created_at: 2026-11-20T19:21:47Z
created_by: ops
updated_at: 2026-11-20T19:42:53Z
status: done
severity: high
category: test-coverage
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0014
linked_designs:
  - DES-0024
linked_runs:
  - RUN-20261120-193311-tck-0028
linked_verifications:
  - VER-20261120-194215-tck-0028
linked_docs:
  - .archagents/08-conventions.md
external_refs: []
external_sync: []
blocks: []
blocked_by:
  - TCK-0027
related: []
acceptance:
  - check: "npx vitest run test/unit/sse.test.ts test/unit/concurrency.test.ts test/unit/deduplication.test.ts test/unit/intelligence.test.ts test/unit/dependency-hygiene.test.ts"
    expect: passed
  - check: "npm run test:coverage"
    expect: passed
  - check: "npm test"
    expect: passed
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport && echo FULL_OK"
    expect: FULL_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T19:32:27Z
---
# TCK-0028 - Conectar testes replicados (sse, concurrency, deduplication, intelligence) ao codigo real em lib/ com fake timers (TCK-0026b)

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=audit.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

Evidências pré-fix observadas na revisão `e2d76c0` para **`TCK-0028` (`TCK-0026b`)**:

1. `test/unit/sse.test.ts:L1-L348` importa apenas `TIMEOUTS` (`L2`) e simula `setInterval`, `setTimeout`, `TransportSession` e `sendSSEMessage` localmente sem importar `handleSSEEndpoint` (`lib/workers/sse.ts`) nem `createCliHttpApp` (`lib/adapters/cli-http.ts`).
2. `test/unit/concurrency.test.ts:L8-L44` replica `executeWithConcurrencyLimit` localmente sem importar `lib/core/intelligence.ts` e usa `setTimeout` reais (`L76,L147,L166,L180,L184,L188,L209,L237`, levando `~293ms` por execução).
3. `test/unit/deduplication.test.ts:L1-L154` replica `deduplicate` inline 4 vezes sem importar `lib/tools/core.ts` e reverte temporariamente para timers reais (`L17,L23` `vi.useRealTimers()` + `setTimeout(resolve, 10)`).
4. `test/unit/intelligence.test.ts:L8-L36` replica `normalizeCnpj` e `containsCnpj` localmente sem importar `lib/core/intelligence.ts`.

Comando falsificador pré-fix:
- Inspeção de imports em `test/unit/{sse,concurrency,deduplication,intelligence}.test.ts` (nenhum deles importa funções de produção de `lib/workers/sse.ts`, `lib/adapters/cli-http.ts`, `lib/core/intelligence.ts` ou `lib/tools/core.ts`).

## Log de transicoes

- 2026-11-20T19:21:47Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T19:32:26Z - **noted** - body:falsifier (append): Registrar falsificador TCK-0028 (TCK-0026b)
- 2026-11-20T19:32:27Z - **triaged** - Triagem TCK-0028 com falsificador e aceite executavel [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T19:33:11Z - **designed** - Design DES-0024 aprovado
- 2026-11-20T19:33:12Z - **executing** - Executando DES-0024 / RUN-20261120-193311-tck-0028
- 2026-11-20T19:38:51Z - **verifying** - Execucao TCK-0028 concluida: 4 suites conectadas ao codigo real de lib/ com fake timers, ratchet 76/73/68/74 e 4/4 criteria-check; abrindo verificacao adversarial independente
- 2026-11-20T19:42:53Z - **done** - TCK-0028 (TCK-0026b) aprovado por verificador independente (6bfb0b76): 4 suites conectadas ao codigo real com fake timers, ratchet 76/73/68/74 e 401/401 Vitest
