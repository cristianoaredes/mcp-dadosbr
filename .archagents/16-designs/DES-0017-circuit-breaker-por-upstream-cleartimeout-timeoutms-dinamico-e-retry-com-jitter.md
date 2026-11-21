---
id: DES-0017
slug: circuit-breaker-por-upstream-cleartimeout-timeoutms-dinamico-e-retry-com-jitter
title: "Circuit breaker por upstream, clearTimeout, timeoutMs dinamico e retry com jitter em httpJson"
created_at: 2026-11-20T17:25:19Z
status: approved
ticket: TCK-0018
type: design
scope_files_new:
  - test/unit/http-client.test.ts
scope_files_modified:
  - lib/core/http-client.ts
  - .archagents/05-integrations.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0017-playbook.md
acceptance_delta: unchanged
---
# DES-0017 - Circuit breaker por upstream, clearTimeout, timeoutMs dinamico e retry com jitter em httpJson

## Problema

`lib/core/http-client.ts` mantém uma instância global única de `CircuitBreaker` cujo callback captura HTTP `>= 400`, `AbortError` e erros de rede sem relançar exceção, mantendo o disjuntor permanentemente `CLOSED` (`lib/infrastructure/http/circuit-breaker.ts:L53-L60`). Além disso, cria `setTimeout` sem `clearTimeout` em `finally`, fixa `"request timeout after 8 seconds"` ignorando `timeoutMs`, declara `RETRY_STATUS_CODES` sem uso e faz retry com backoff determinístico sem jitter.

## Threat & Reliability Model

| ID | Ameaça / Falha | Vetor | Contramedida |
|---|---|---|---|
| T1 | Cascata em indisponibilidade upstream | Falhas 5xx/429/rede/timeout não lançam exceção em `circuitBreaker.execute()` | Sinalizar via `TransientHttpError` dentro de `breaker.execute()` antes de converter em `HttpResponse`; não lançar para 4xx não-429 (`400`/`401`/`403`/`404`) |
| T2 | Blast radius cross-upstream | Instância única global para todos os provedores | Particionar `Map<string, CircuitBreaker>` por `origin` normalizado (`getUpstreamKey`) |
| T3 | Vazamento de timer handles no event loop | `setTimeout(() => controller.abort(), timeoutMs)` sem `clearTimeout` | Envolver `fetch` + leitura JSON em `try { ... } finally { clearTimeout(timeoutId); }` e interpolar `timeoutMs` via `formatTimeoutMessage` |
| T4 | Retry storm / Thundering herd | Backoff determinístico `1s/2s/4s` e timeout sem diagnóstico real | Usar `RETRY_STATUS_CODES` (`429, 500, 502, 503, 504`) + network error com Equal Jitter (`[base/2, base]`) e short-circuit imediato quando `CircuitBreakerOpenError` |
| T5 | Crescimento ilimitado do registro de origens | Map de breakers crescendo sem teto em chamadas dinâmicas | Cap `MAX_CIRCUIT_BREAKERS = 100` com eviction LRU/FIFO priorizando `CLOSED`, validando URL antes de inserir (`invalid url`) |

## Solucao

- Particionar `CircuitBreaker` por `origin` (`new URL(url).origin.toLowerCase()`), com `MAX_CIRCUIT_BREAKERS = 100` e helpers `getUpstreamKey`, `getCircuitBreaker`, `getCircuitBreakerMetrics`, `resetCircuitBreakers`.
- Exportar `RETRY_STATUS_CODES = new Set([429, 500, 502, 503, 504])`, `formatTimeoutMessage(timeoutMs)` e `calculateBackoffDelayMs(attempt, initialDelayMs, random)` com Equal Jitter.
- Estender `HttpJsonOptions` preservando assinatura retrocompatível `httpJson(url, authHeaders?, timeoutMs?, options?)` (`"noContent" in options`).
- Separar `TransientHttpError(response, retryable)` para sinalizar falhas ao `CircuitBreaker` mantendo contrato externo `{ ok, data | error, source }` sem vazamento de exceções não tratadas.

## Mudancas

- `lib/core/http-client.ts`: refatoração completa de resiliência e cleanup de timers.
- `test/unit/http-client.test.ts`: suíte unitária/adversarial cobrindo 10 cenários (abertura em 5 falhas, isolamento por origem, 4xx não abre breaker, `HALF_OPEN` recovery, short-circuit em retry, `clearTimeout` zero timers vazados, `timeoutMs` dinâmico, `RETRY_STATUS_CODES`, Equal Jitter, 204 `noContent` / URL inválida / cap >100).
- `.archagents/05-integrations.md`: sincronização documentando circuit breaker por upstream, retry com jitter e cleanup.

## Criterios de sucesso

- [ ] `npx vitest run test/unit/http-client.test.ts test/unit/circuit-breaker.test.ts` passa integralmente.
- [ ] `npm test` passa sem regressões.
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker` e `npm run test:transport` passam sem erros.
