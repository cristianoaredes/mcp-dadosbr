---
id: TCK-0018
slug: corrigir-circuit-breaker-inoperante-em-httpjson-isolar-por-upstream-limpar-setti
title: "Corrigir circuit breaker inoperante em httpJson, isolar por upstream, limpar setTimeout e adicionar jitter no retry"
source: audit
created_at: 2026-11-20T15:16:15Z
created_by: ops
updated_at: 2026-11-20T17:35:41Z
status: done
severity: high
category: reliability
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0006
linked_designs:
  - DES-0017
linked_runs:
  - RUN-20261120-172548-tck-0018
linked_verifications:
  - VER-20261120-173500-tck-0018
linked_docs:
  - .archagents/05-integrations.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/http-client.test.ts test/unit/circuit-breaker.test.ts"
    expect: passed
  - check: "npm test"
    expect: passed
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && echo TYPECHECK_BUILD_OK"
    expect: TYPECHECK_BUILD_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T17:25:09Z
---
# TCK-0018 - Corrigir circuit breaker inoperante em httpJson, isolar por upstream, limpar setTimeout e adicionar jitter no retry

## Contexto

Originado por **FND-0006** (`reliability` / `high`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/infrastructure/http/circuit-breaker.ts:L53-L60`, `lib/core/http-client.ts:L7-L11`, `lib/core/http-client.ts:L16`, `lib/core/http-client.ts:L43-L56`, `lib/core/http-client.ts:L70-L117`.
- **Problema:** O callback passado por `httpJson` a `circuitBreaker.execute()` captura HTTP errors/exceções e retorna `{ ok: false }`, fazendo `onSuccess()` rodar mesmo em falhas 5xx/429/timeout e mantendo o circuit breaker morto; há instância única compartilhada entre 8 upstreams; `setTimeout` do `AbortController` nunca recebe `clearTimeout` em `finally`; mensagem de timeout fixa `8 seconds`; `RETRY_STATUS_CODES` não é usado e retry não tem jitter.
- **Mitigação:** Particionar `CircuitBreaker` por origem upstream, sinalizar falhas transientes por exceção antes de mapear para `HttpResponse`, limpar `setTimeout` em `finally`, interpolar `timeoutMs`, aplicar `RETRY_STATUS_CODES` e adicionar jitter no backoff.

## Falsificador

Evidências verificáveis no commit base `e129661` antes do fix:
- `lib/core/http-client.ts:L7-L11`: única instância global `const circuitBreaker = new CircuitBreaker(...)` compartilhada entre todos os 8+ upstreams externos.
- `lib/core/http-client.ts:L70-L117` e `lib/infrastructure/http/circuit-breaker.ts:L53-L60`: o callback em `circuitBreaker.execute(...)` captura HTTP >= 400 e exceções (`AbortError`, erros de rede) e retorna `{ ok: false, error }`, fazendo `this.onSuccess()` rodar sempre e mantendo o breaker permanentemente `CLOSED`.
- `lib/core/http-client.ts:L73`: `setTimeout(() => controller.abort(), timeoutMs)` nunca recebe `clearTimeout()` em `finally`, vazando um timer por requisição.
- `lib/core/http-client.ts:L16,L43-L56,L107`: `RETRY_STATUS_CODES` declarado sem uso; `executeWithRetry` faz matching frágil por substring sem jitter; erro de timeout fixo em `"request timeout after 8 seconds"` ignorando `timeoutMs`.
- **Comando falsificador:** `npx vitest run test/unit/http-client.test.ts` (reprova antes do fix porque o circuit breaker nunca abre em 5xx/429/rede/timeout, não isola origens, vaza `setTimeout` e não aplica jitter).

## Log de transicoes

- 2026-11-20T15:16:15Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T17:25:09Z - **noted** - body:falsifier (replace): Populate Falsificador evidence and repro command for TCK-0018
- 2026-11-20T17:25:09Z - **triaged** - Triagem de FND-0006 (circuit breaker por upstream, clearTimeout, timeoutMs dinamico, RETRY_STATUS_CODES e jitter) [aceite reescrito: 3 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T17:25:48Z - **designed** - DES-0017 (Threat/Reliability Model T1-T5) e playbook de 4 passos aprovados
- 2026-11-20T17:25:48Z - **executing** - Iniciando implementacao de DES-0017 em bugfix/TCK-0018-http-client-circuit-breaker-jitter (RUN-20261120-172548-tck-0018)
- 2026-11-20T17:31:21Z - **verifying** - Implementacao, 31 novos testes unitarios/adversariais, 357/357 suite completa, tsc/builds, test:transport e criteria-check 3/3 concluidos; iniciando verify adversarial independente
- 2026-11-20T17:35:41Z - **done** - Verify adversarial independente aprovado (VER-20261120-173500-tck-0018) e judge verdict ACCEPTABLE (score 76, safety 100)
