---
id: TCK-0027
slug: instalar-vitest-coverage-v8-revisar-exclusoes-em-vitest-config-ts-com-ratchet-e
title: "Instalar @vitest/coverage-v8, revisar exclusoes em vitest.config.ts com ratchet e migrar circuit-breaker.test.ts para fake timers (TCK-0026a)"
source: audit
created_at: 2026-11-20T19:21:32Z
created_by: ops
updated_at: 2026-11-20T19:29:33Z
status: done
severity: high
category: test-coverage
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0014
linked_designs:
  - DES-0023
linked_runs:
  - RUN-20261120-192307-tck-0027
linked_verifications:
  - VER-20261120-192903-tck-0027
linked_docs:
  - .archagents/08-conventions.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npm audit --omit=dev --audit-level=high && npm audit --audit-level=high && echo AUDIT_OK"
    expect: AUDIT_OK
  - check: "npm run test:coverage"
    expect: passed
  - check: "npx vitest run test/unit/circuit-breaker.test.ts"
    expect: passed
  - check: "npm test && npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport && echo FULL_OK"
    expect: FULL_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T19:22:25Z
---
# TCK-0027 - Instalar @vitest/coverage-v8, revisar exclusoes em vitest.config.ts com ratchet e migrar circuit-breaker.test.ts para fake timers (TCK-0026a)

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=audit.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

Evidências pré-fix observadas na revisão `ef0dad9` para **`TCK-0027` (`TCK-0026a`)**:

1. `npm run test:coverage` falha com erro de pacote ausente (`@vitest/coverage-v8` não declarado em `package.json` nem instalado).
2. `vitest.config.ts:L14-L35` não declara `include: ['lib/**/*.ts']` e exclui explicitamente `'lib/workers/'` (`L23`) e `'lib/adapters/cloudflare.ts'` (`L24`) dos relatórios/thresholds de cobertura.
3. `test/unit/circuit-breaker.test.ts:L81,L100,L187` usa `setTimeout` reais (`1100ms` x 2 + `10ms` concorrente), fazendo o arquivo levar `3323ms` em cada execução de `npm test`.

## Log de transicoes

- 2026-11-20T19:21:32Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T19:21:49Z - **noted** - body:falsifier (append): Registrar falsificador TCK-0027 (TCK-0026a)
- 2026-11-20T19:22:25Z - **triaged** - Triagem TCK-0027 (TCK-0026a) com falsificador e criterios executaveis [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T19:23:07Z - **designed** - Design DES-0023 aprovado
- 2026-11-20T19:23:22Z - **executing** - Executando DES-0023 / RUN-20261120-192307-tck-0027
- 2026-11-20T19:26:05Z - **verifying** - Execucao TCK-0027 concluida: @vitest/coverage-v8 ativo, Workers na cobertura com ratchet 75/72/67/73, circuit-breaker em fake timers (1.87s total) e 4/4 criteria-check; abrindo verificacao adversarial independente
- 2026-11-20T19:29:33Z - **done** - TCK-0027 (TCK-0026a) aprovado por verificador independente (48a4d94e) com @vitest/coverage-v8, Workers no ratchet e fake timers em circuit-breaker.test.ts
