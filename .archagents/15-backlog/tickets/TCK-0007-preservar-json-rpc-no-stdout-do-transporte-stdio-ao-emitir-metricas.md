---
id: TCK-0007
slug: preservar-json-rpc-no-stdout-do-transporte-stdio-ao-emitir-metricas
title: "Preservar JSON-RPC no stdout do transporte stdio ao emitir métricas"
source: verify
created_at: 2026-11-18T03:07:53Z
created_by: ops
updated_at: 2026-11-18T03:07:53Z
status: raw
severity: medium
category: bug
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - lib/core/tools.ts:27
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npm run build && npm run test:transport"
---
# TCK-0007 - Preservar JSON-RPC no stdout do transporte stdio ao emitir métricas

## Contexto

Criado via scripts/ops/ticket/create.py a partir de source=verify.

## Falsificador

lib/core/tools.ts:27 imprime métricas no stdout. O teste de transporte precisa fazer 101 chamadas determinísticas em stdio e reprovar se o cliente detectar linha fora do protocolo JSON-RPC.

## Evidência

Verificação independente de TCK-0006: cliente stdio executou 101 chamadas a cpf_validate. As respostas chegaram, mas na centésima chamada o SDK reportou erro de parsing JSON quando a linha [metrics] foi escrita no stdout. lib/core/tools.ts:27 usa console.log; test/integration/transports.mjs não executa chamadas suficientes para detectar essa regressão.

## Log de transicoes

- 2026-11-18T03:07:53Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-18T03:07:53Z - **noted** - body:evidence (replace): Registrar achado de runtime para o próximo ciclo
- 2026-11-18T03:07:53Z - **noted** - body:falsifier (replace): Definir reprodução e critério pendente
