---
id: TCK-0011
slug: tornar-deterministicos-os-testes-de-ttl-em-test-unit-cache-test-ts-com-fake-time
title: "Tornar determinísticos os testes de TTL em test/unit/cache.test.ts com fake timers"
source: bug
created_at: 2026-11-19T13:21:00Z
created_by: ops
updated_at: 2026-11-19T13:55:17Z
status: done
severity: low
category: bug
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0011
linked_runs:
  - RUN-20261119-134735-cache-fake-timers
linked_verifications:
  - VER-20261119-135437-tck-0011
linked_docs:
  - test/unit/cache.test.ts
  - lib/core/cache.ts
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "! grep -q \"setTimeout\" test/unit/cache.test.ts && grep -q \"useFakeTimers\" test/unit/cache.test.ts"
  - check: "git diff --check && npx vitest run test/unit/cache.test.ts && npm test"
depth_decision:
  workflow: inline
  design: skip
  verify: lightweight
  source: routing-classifier
  classified_at: 2026-11-19T13:21:00Z
---
# TCK-0011 - Tornar determinísticos os testes de TTL em test/unit/cache.test.ts com fake timers

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=bug.

## Falsificador

`test/unit/cache.test.ts` (L66, L75, L82-L88, L98-L102, L254, L267-L270, L314, L363, L430, L439) usa `setTimeout` real com TTL de 100 ms e margens de 20–30 ms, falhando de forma intermitente sob contenção de CPU (reproduzido em `Test & Build (26.x)`, job `135535524524` da run `44517012490`, linha 92: `expected null to be value2`). A correção reprova se restar qualquer `setTimeout` real em `test/unit/cache.test.ts` ou se qualquer teste da suíte falhar.

## Log de transicoes

- 2026-11-19T13:21:00Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-19T13:21:00Z - **noted** - body:falsifier (replace): Registrar causa raiz e critério falsificável do flake de TTL em cache.test.ts
- 2026-11-19T13:21:00Z - **triaged** - Flake determinístico em teste unitário (esforço S, severidade low, escopo isolado em test/unit/cache.test.ts) [depth_decision do routing-classifier: workflow inline, design skip, verify lightweight]
- 2026-11-19T13:47:34Z - **linked** - links updated
- 2026-11-19T13:47:34Z - **designed** - DES-0011 aprovado: usar vi.useFakeTimers() em MemoryCache e KVCache em test/unit/cache.test.ts
- 2026-11-19T13:47:35Z - **linked** - links updated
- 2026-11-19T13:48:15Z - **executing** - DES-0011 + playbook prontos; iniciar substituição de setTimeout por fake timers
- 2026-11-19T13:50:10Z - **verifying** - Testes determinísticos (37/37 em 7ms, 286/286 suíte) e criteria-check 2/2 PASS; encaminhando para verificação independente
- 2026-11-19T13:55:16Z - **linked** - links updated
- 2026-11-19T13:55:17Z - **done** - Verificacao adversarial independente aprovada (VER-20261119-135437-tck-0011); 14 setTimeout substituidos por vi.useFakeTimers()/vi.advanceTimersByTime(); 37/37 testes em 7ms e 286/286 na suite completa
