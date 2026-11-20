---
id: TCK-0029
slug: cobrir-modulos-criticos-restantes-workers-rest-worker-cloudflare-tools-company-h
title: "Cobrir modulos criticos restantes (workers/rest, worker, cloudflare, tools company/health/osint/legal) e elevar ratchet de cobertura (TCK-0026c)"
source: audit
created_at: 2026-11-20T19:21:49Z
created_by: ops
updated_at: 2026-11-20T20:02:43Z
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
  - DES-0025
linked_runs:
  - RUN-20261120-195035-tck-0029
linked_verifications:
  - VER-20261120-200146-tck-0029
linked_docs:
  - .archagents/08-conventions.md
external_refs: []
external_sync: []
blocks: []
blocked_by:
  - TCK-0028
related: []
acceptance:
  - check: "npm run test:coverage && echo COVERAGE_OK"
    expect: COVERAGE_OK
  - check: "npm test && echo TESTS_OK"
    expect: TESTS_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
  - check: "npm run build && npm run build:worker && npm run test:transport && echo BUILD_TRANSPORT_OK"
    expect: BUILD_TRANSPORT_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T19:49:25Z
---
# TCK-0029 - Cobrir modulos criticos restantes (workers/rest, worker, cloudflare, tools company/health/osint/legal) e elevar ratchet de cobertura (TCK-0026c)

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=audit.

## Falsificador

Baseline medido na revisao `a4cd423` (`TCK-0028`) antes de `TCK-0029`:

- Coverage global (`npm run test:coverage`, V8 em `lib/**/*.ts`): **76.62% Stmts / 70.17% Branch / 75.66% Funcs / 78.26% Lines** — abaixo da meta `80/80/75/80` (ratchet atual em `vitest.config.ts:36-41`: `lines: 76`, `functions: 73`, `branches: 68`, `statements: 74`).
- Modulos criticos em `0%` ou cobertura parcial:
  - `lib/workers/rest.ts:17-255` (`0%` Stmts / `0%` Branch / `0%` Funcs / `0%` Lines)
  - `lib/workers/tokens.ts:10-17` (`0%` Stmts / `0%` Branch / `0%` Funcs / `0%` Lines)
  - `lib/workers/worker.ts:87-149` (`60.46%` Stmts / `46.51%` Branch)
  - `lib/adapters/cloudflare.ts:189-255` (`76.81%` Stmts / `78.18%` Branch)
  - `lib/tools/company.ts:20-215` (`16.27%` Stmts / `11.32%` Branch / `16.66%` Funcs / `19.4%` Lines)
  - `lib/tools/health.ts:14-48` (`9.52%` Stmts / `0%` Branch / `0%` Funcs / `13.33%` Lines)
  - `lib/tools/osint.ts:95-140` (`22.22%` Stmts / `0%` Branch / `0%` Funcs)
  - `lib/tools/legal.ts:32-360` (`73.91%` Stmts / `36.36%` Funcs)
  - `lib/core/tools.ts:28-90` (`62.5%` Stmts / `50%` Branch / `60%` Funcs)
- Nota nao-bloqueante herdada de `VER-20261120-194215-tck-0028`: `lib/tools/core.ts:22,34-49` nao cancelava `existing.timeoutId` ao sobrescrever entrada expirada por timestamp em `deduplicate` e tipava `PendingRequest.promise` como `Promise<LookupResult>`.

## Log de transicoes

- 2026-11-20T19:21:49Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T19:49:25Z - **triaged** - Falsificador a4cd423 e criterios mecanicos de aceite registrados para TCK-0029 [aceite reescrito: 4 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T19:49:53Z - **noted** - body:falsifier (replace): Registrar baseline de cobertura a4cd423 e modulos descobertos para FND-0014 (TCK-0029)
- 2026-11-20T19:50:24Z - **designed** - DES-0025 aprovado para cobrir modulos criticos restantes e elevar ratchet
- 2026-11-20T19:50:36Z - **executing** - Iniciando execucao de DES-0025 (RUN-20261120-195035-tck-0029)
- 2026-11-20T19:56:39Z - **verifying** - Execucao RUN-20261120-195035-tck-0029 concluida com todas as verificacoes locais verdes
- 2026-11-20T20:02:43Z - **done** - TCK-0029 aprovado pelo verificador independente e juiz com cobertura 87.91/80.27/86.89/88.64 e 420/420 testes
