---
id: TCK-0019
slug: adicionar-timeouts-em-fetch-sem-abortsignal-eliminar-falso-negativo-em-procurado
title: "Adicionar timeouts em fetch() sem AbortSignal, eliminar falso negativo em procurados_lookup e limpar timer em executeIntelligence"
source: audit
created_at: 2026-11-20T15:16:16Z
created_by: ops
updated_at: 2026-11-20T17:49:17Z
status: done
severity: high
category: reliability
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0007
linked_designs:
  - DES-0018
linked_runs:
  - RUN-20261120-174045-tck-0019
linked_verifications:
  - VER-20261120-174842-tck-0019
linked_docs:
  - .archagents/05-integrations.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/legal-timeouts-intelligence.test.ts test/unit/search.test.ts test/unit/intelligence.test.ts"
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
  classified_at: 2026-11-20T17:40:10Z
---
# TCK-0019 - Adicionar timeouts em fetch() sem AbortSignal, eliminar falso negativo em procurados_lookup e limpar timer em executeIntelligence

## Contexto

Originado por **FND-0007** (`reliability` / `high`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/core/search-providers.ts:L58-L65`, `lib/core/search-providers.ts:L128-L147`, `lib/tools/legal.ts:L32-L35`, `lib/tools/legal.ts:L104-L106`, `lib/tools/legal.ts:L143-L169`, `lib/core/intelligence.ts:L156-L169`.
- **Problema:** `PerplexityProvider`, `executeDatajud`, `executeBnmp` e 13 `fetch()` em `executeProcurados` não usam `AbortController`/timeout; `executeProcurados` ignora falhas HTTP/rede e devolve `NOT_FOUND` (falso negativo silencioso); `executeIntelligence` vaza `setTimeout` quando resolve antes do prazo e não aborta buscas em voo ao expirar.
- **Mitigação:** Configurar timeout explícito com `AbortController`/`clearTimeout` em todos os clientes externos (incluindo Tavily), reportar erro ou status parcial em `procurados_lookup` quando páginas falharem e limpar o timer/abortar buscas em `executeIntelligence`.

## Falsificador

Evidências verificáveis no commit base `bac11a5` antes do fix:
- `lib/core/search-providers.ts:L58-L65,L128-L147`: `TavilyProvider.search` delega ao SDK sem envelope de timeout nem `AbortSignal`; `PerplexityProvider.search` chama `fetch(...)` sem `AbortController`/timeout.
- `lib/tools/legal.ts:L39-L42,L113-L115,L147-L180`: `executeDatajud`, `executeBnmp` e as 13 chamadas sequenciais em `executeProcurados` invocam `fetch(...)` sem `signal`/timeout; além disso `executeProcurados` engole respostas `!resp.ok` (`continue`) e exceções (`catch`) retornando `status: "NOT_FOUND"` quando páginas ou todas as 13 páginas falham.
- `lib/core/intelligence.ts:L156-L169`: `executeIntelligence` cria `setTimeout` de `25000ms` sem `clearTimeout` em `finally` (vazamento em conclusão rápida) e não propaga `AbortSignal` para interromper buscas em andamento ao atingir o limite.
- **Comando falsificador:** `npx vitest run test/unit/legal-timeouts-intelligence.test.ts` (reprova antes do fix porque chamadas pendentes não recebem `AbortSignal`, `executeProcurados` retorna `NOT_FOUND` diante de falhas e `executeIntelligence` deixa o timer ativo sem cancelar buscas).

## Log de transicoes

- 2026-11-20T15:16:16Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T17:40:10Z - **noted** - body:falsifier (replace): Populate Falsificador evidence and repro command for TCK-0019
- 2026-11-20T17:40:10Z - **triaged** - Triagem de FND-0007 (timeouts em fetch/providers, eliminar falso negativo NOT_FOUND em procurados_lookup e cancelamento/clearTimeout em executeIntelligence) [aceite reescrito: 3 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T17:40:45Z - **designed** - DES-0018 (Threat/Reliability Model T1-T5) e playbook de 5 passos aprovados
- 2026-11-20T17:40:46Z - **executing** - Iniciando implementacao de DES-0018 em bugfix/TCK-0019-fetch-timeouts-procurados-intelligence (RUN-20261120-174045-tck-0019)
- 2026-11-20T17:45:08Z - **verifying** - Implementacao, 14 novos testes unitarios/adversariais, 371/371 suite completa, tsc/builds, test:transport e criteria-check 3/3 concluidos; iniciando verify adversarial independente
- 2026-11-20T17:49:17Z - **done** - Verify adversarial independente aprovado (VER-20261120-174842-tck-0019) e judge verdict aprovado
