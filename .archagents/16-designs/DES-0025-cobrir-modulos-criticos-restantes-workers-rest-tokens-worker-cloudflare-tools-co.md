---
id: DES-0025
slug: cobrir-modulos-criticos-restantes-workers-rest-tokens-worker-cloudflare-tools-co
title: "Cobrir modulos criticos restantes (workers/rest, tokens, worker, cloudflare, tools company/health/osint/legal) e elevar ratchet de cobertura"
created_at: 2026-11-20T19:49:53Z
status: approved
ticket: TCK-0029
type: design
scope_files_new:
  - test/unit/worker-rest-cloudflare.test.ts
  - test/unit/tools-company-health-osint-legal.test.ts
scope_files_modified:
  - lib/tools/core.ts
  - vitest.config.ts
  - .archagents/08-conventions.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0025-playbook.md
acceptance_delta: unchanged
---
# DES-0025 - Cobrir modulos criticos restantes (workers/rest, tokens, worker, cloudflare, tools company/health/osint/legal) e elevar ratchet de cobertura

## Problema

Terceira e última fatia de `FND-0014` (`TCK-0026c`): embora `TCK-0027` tenha habilitado `@vitest/coverage-v8` com inclusão de `lib/workers/` + `lib/adapters/cloudflare.ts` e `TCK-0028` tenha conectado as 4 suítes replicadas aos módulos reais em `lib/`, permanecem em `0%` ou cobertura parcial módulos críticos do runtime Worker e catálogo de tools:
- `lib/workers/rest.ts` (`0%`), `lib/workers/tokens.ts` (`0%`), `lib/workers/worker.ts` (`60.46%`), `lib/adapters/cloudflare.ts` (`76.81%`).
- `lib/tools/company.ts` (`16.27%`), `lib/tools/health.ts` (`9.52%`), `lib/tools/osint.ts` (`22.22%`), `lib/tools/legal.ts` (`73.91%` / `36.36%` funcs), `lib/core/tools.ts` (`62.5%`).
- Pendência menor herdada de `VER-20261120-194215-tck-0028`: `lib/tools/core.ts:L22,L34-L49` precisa cancelar `existing.timeoutId` ao sobrescrever entrada expirada por timestamp em `deduplicate` e tipar `PendingRequest.promise` como `Promise<unknown>`.

## Design & Riscos

| ID | Risco / Lacuna | Contramedida |
|---|---|---|
| R1 | Chamadas reais à rede ou vazamento de env vars (`DATAJUD_API_KEY`, `TRANSPARENCIA_API_KEY`, `TAVILY_API_KEY`) em testes | Mockar `globalThis.fetch` determinístico por URL/método em todos os testes de Worker REST e tools, e restaurar `process.env` + `resetMetrics()` + `vi.restoreAllMocks()` antes de `vi.useRealTimers()` em `afterEach` |
| R2 | Asserções desalinhadas do contrato real em `workers/rest.ts` (`L43`) e `tools/company.ts` | Verificar contratos reais antes de testar: `handleLookupEndpoint` retorna `400` para `"CNPJ not found"` / `404` apenas se `data === 'Not found'`; `executeDeepProfile` usa `include_government`/`include_legal`/`include_news`/`domain` |
| R3 | Timer órfão ao sobrescrever entrada expirada por timestamp em `deduplicate` (`lib/tools/core.ts`) | Chamar `clearTimeout(existing.timeoutId)` quando entrada existente em `pendingRequests` expirou por timestamp e tipar `PendingRequest.promise` como `Promise<unknown>` |
| R4 | Cobertura abaixo da meta (`80/80/75/80`) | Adicionar `worker-rest-cloudflare.test.ts` e `tools-company-health-osint-legal.test.ts` (com fallback em `tools/government.ts` se necessário para folga >= 1.5%), recalibrar ratchet em `vitest.config.ts` e documentar em `.archagents/08-conventions.md` |

## Mudancas

- `lib/tools/core.ts`: cancelar `existing.timeoutId` quando entrada expirada por timestamp for substituída e tipar `PendingRequest.promise: Promise<unknown>`.
- `test/unit/worker-rest-cloudflare.test.ts`: suíte cobrindo `lib/workers/tokens.ts`, `lib/workers/rest.ts`, `lib/workers/worker.ts` e `lib/adapters/cloudflare.ts`.
- `test/unit/tools-company-health-osint-legal.test.ts`: suíte cobrindo `lib/core/tools.ts`, `lib/tools/company.ts`, `lib/tools/health.ts`, `lib/tools/osint.ts`, `lib/tools/legal.ts` e caminho de sobrescrita expirada de `deduplicate` em `lib/tools/core.ts`.
- `vitest.config.ts`: elevar thresholds (`lines`, `functions`, `branches`, `statements`) conforme medição real V8.
- `.archagents/08-conventions.md`: registrar novas suítes, cobertura medida e ratchet final de `FND-0014`.

## Criterios de sucesso

- [ ] `npm run test:coverage` passa com ratchet elevado
- [ ] `npm test` passa sem testes flaky ou chamadas reais de rede
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` passa
- [ ] `npm run build && npm run build:worker && npm run test:transport` passa
