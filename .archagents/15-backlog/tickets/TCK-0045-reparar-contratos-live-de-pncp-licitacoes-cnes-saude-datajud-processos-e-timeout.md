---
id: TCK-0045
slug: reparar-contratos-live-de-pncp-licitacoes-cnes-saude-datajud-processos-e-timeout
title: "Reparar contratos live de pncp_licitacoes, cnes_saude, datajud_processos e TimeoutError/ResourceNotFoundError"
source: bug
created_at: 2026-11-22T02:00:17Z
created_by: ops
updated_at: 2026-11-22T02:14:59Z
status: done
severity: high
category: bug
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0041
linked_runs:
  - RUN-20261122-020104-tck-0045
linked_verifications:
  - VER-20261122-021100-tck-0045
linked_docs: []
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npm run build && npm run build:worker && npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit"
  - check: "npx vitest run"
  - check: "npm run test:transport"
  - check: "rg -q 'PNCP_SEARCH' lib/tools/government.ts && rg -q 'UF_TO_IBGE_CODE' lib/tools/health.ts && rg -q 'numeroProcesso' lib/tools/legal.ts && rg -q 'customMessage\\?: string' lib/shared/errors.ts"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-22T02:00:37Z
---
# TCK-0045 - Reparar contratos live de pncp_licitacoes, cnes_saude, datajud_processos e TimeoutError/ResourceNotFoundError

## Contexto

Etapa 1A de reparo de contratos live e preservação de mensagens de erro em runtime:
1. `pncp_licitacoes` (`lib/tools/government.ts`): migrar busca por palavra-chave (sem `modalidade_id`) para `https://pncp.gov.br/api/search/` com parâmetros aceitos pelo portal (`q`, `tipos_documento=edital`, `ordenacao=-data`, `pagina`, `tam_pagina=10`, `status=todos`, e `orgao_cnpj` normalizado via `pncpCnpj` quando válido).
2. `cnes_saude` (`lib/tools/health.ts`): mapear siglas de UF (`[A-Za-z]{2}`) para o código IBGE de 2 dígitos via `UF_TO_IBGE_CODE` em `codigo_uf` mantendo compatibilidade com códigos numéricos diretos (ex.: `"35"`).
3. `datajud_processos` (`lib/tools/legal.ts`) e `lib/shared/errors.ts`: substituir `{ match: { "_all": query } }` por `{ match: { numeroProcesso: digits } }` (quando `digits.length === 20`) ou `{ query_string: { query } }`, e preservar `error.message` via `customMessage?: string` em `TimeoutError` e `ResourceNotFoundError` usados por `categorizeError`.

## Falsificador

Antes do fix:
- `lib/tools/government.ts:L324,L380-L404`: `executePncp` sem `modalidade_id` envia `q`/`tamanhoPagina`/`cnpjOrgao` para `/api/consulta/v1/contratacoes/publicacao` (rejeitado pela API live do PNCP).
- `lib/tools/health.ts:L19`: `params.set("codigo_uf", uf)` envia `"SP"` literal em vez de `"35"` na API CNES DataSUS.
- `lib/tools/legal.ts:L67`: payload `{ query: { match: { "_all": query } }, size: tamanho }` usa campo `_all` inexistente no Elasticsearch do Datajud CNJ.
- `lib/shared/errors.ts:L100-L106,L133-L140,L156,L190`: `TimeoutError` e `ResourceNotFoundError` não aceitam `customMessage`, e `categorizeError` descarta `error.message` substituindo por `"Operation 'operation' timed out after 30000ms"` e `"resource not found: unknown"`.

## Log de transicoes

- 2026-11-22T02:00:17Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-22T02:00:37Z - **triaged** - Bug reproduzido com evidencias path:linha e criterios de aceite executaveis definidos [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-22T02:01:04Z - **designed** - DES-0041 approved
- 2026-11-22T02:01:45Z - **executing** - Executando reparos de Etapa 1A (DES-0041)
- 2026-11-22T02:06:18Z - **verifying** - Implementado e validado (540/540 vitest, build+worker+tsc, test:transport, live stdio E2E); pronto para verificador independente P10
- 2026-11-22T02:14:59Z - **done** - P10 independent verification + pipeline-judge approved (VER-20261122-021100-tck-0045): 540/540 vitest, build+worker+tsc, test:transport and live stdio E2E PASS
