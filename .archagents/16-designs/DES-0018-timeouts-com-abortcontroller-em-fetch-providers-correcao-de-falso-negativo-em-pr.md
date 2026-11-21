---
id: DES-0018
slug: timeouts-com-abortcontroller-em-fetch-providers-correcao-de-falso-negativo-em-pr
title: "Timeouts com AbortController em fetch/providers, correcao de falso negativo em procurados_lookup e cancelamento em executeIntelligence"
created_at: 2026-11-20T17:40:10Z
status: approved
ticket: TCK-0019
type: design
scope_files_new:
  - lib/shared/utils/timeout.ts
  - test/unit/legal-timeouts-intelligence.test.ts
scope_files_modified:
  - lib/core/search-providers.ts
  - lib/core/intelligence.ts
  - lib/tools/legal.ts
  - .archagents/05-integrations.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0018-playbook.md
acceptance_delta: unchanged
---
# DES-0018 - Timeouts com AbortController em fetch/providers, correcao de falso negativo em procurados_lookup e cancelamento em executeIntelligence

## Problema

Diversas integrações externas fazem `fetch()` ou chamadas de SDK sem `AbortController`/timeout (`PerplexityProvider`, `TavilyProvider`, `executeDatajud`, `executeBnmp`, 13 páginas em `executeProcurados`); `executeProcurados` silencia erros HTTP/rede devolvendo `status: "NOT_FOUND"` (falso negativo em antecedentes); e `executeIntelligence` cria timer de 25 s sem `clearTimeout` em `finally` e sem propagação de `AbortSignal` para interromper buscas em andamento após timeout.

## Threat & Reliability Model

| ID | Ameaça / Falha | Vetor | Contramedida |
|---|---|---|---|
| T1 | Exaustão de conexões / travamento indefinido | `fetch()` / SDK sem `AbortController` ou envelope de timeout em `PerplexityProvider`, `TavilyProvider`, `datajud`, `bnmp`, `procurados` | `createTimeoutController` + `raceWithTimeoutAndSignal` com `clearTimeout` e cleanup de listeners em `finally` |
| T2 | Falso negativo silencioso em screening criminal (`procurados_lookup`) | `!resp.ok` (`continue`) e `catch` ignoram falhas retornando `NOT_FOUND` | Contabilizar `pagesChecked` vs `pagesFailed`; retornar `{ ok: false }` se `pagesChecked === 0` e `status: "INCONCLUSIVE"` com `partial: true` se `matches === 0 && pagesFailed > 0`, além de deadline total |
| T3 | Vazamento de timer de 25 s em `executeIntelligence` | `setTimeout` criado no `Promise.race` nunca recebe `clearTimeout` quando execução termina antes do limite | Armazenar `timeoutId` e executar `clearTimeout(timeoutId)` em `finally` |
| T4 | Trabalho órfão e rejeição não tratada após timeout | `executeIntelligence` estoura timeout mas tarefas em `executeWithConcurrencyLimit` continuam chamando providers em background | Propagar `AbortController.signal` para `executeWithConcurrencyLimit`, tarefas e `provider.search(..., { signal })`, acoplando `.catch(() => {})` |
| T5 | Incompatibilidade Node ↔ Cloudflare Workers | Uso de APIs não suportadas ou divergentes em `@cloudflare/workers-types` (`AbortSignal.any`, reason args) | Implementação compatível (`controller.abort()` sem argumento + `addEventListener("abort", ..., { once: true })` manual + validação via `tsc -p tsconfig.worker.json`) |

## Solucao

- Criar utilitário folha `lib/shared/utils/timeout.ts` (`isAbortOrTimeoutError`, `createTimeoutController`, `raceWithTimeoutAndSignal`).
- Atualizar `lib/core/search-providers.ts` (`SearchOptions { signal?, timeoutMs? }`) para impor timeout (`TIMEOUTS.SEARCH_REQUEST_MS`) + cancelamento em `TavilyProvider` e `PerplexityProvider`.
- Atualizar `lib/core/intelligence.ts` para limpar o timer em `finally`, abortar `controller` no timeout e interromper o scheduler/buscas com `AbortSignal`.
- Atualizar `lib/tools/legal.ts` (`executeDatajud`, `executeBnmp`, `executeProcurados`) com timeouts por requisição, deadline agregado e eliminação do falso negativo `NOT_FOUND` em `procurados_lookup`.
- Criar `test/unit/legal-timeouts-intelligence.test.ts` e sincronizar `.archagents/05-integrations.md`.

## Mudancas

- `lib/shared/utils/timeout.ts` (novo)
- `lib/core/search-providers.ts` (modificado)
- `lib/core/intelligence.ts` (modificado)
- `lib/tools/legal.ts` (modificado)
- `test/unit/legal-timeouts-intelligence.test.ts` (novo)
- `.archagents/05-integrations.md` (modificado)

## Criterios de sucesso

- [ ] `npx vitest run test/unit/legal-timeouts-intelligence.test.ts test/unit/search.test.ts test/unit/intelligence.test.ts` passa sem falhas.
- [ ] `npm test` passa sem regressões.
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker` e `npm run test:transport` passam.
