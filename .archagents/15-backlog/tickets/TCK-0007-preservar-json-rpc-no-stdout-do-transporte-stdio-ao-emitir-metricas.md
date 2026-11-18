---
id: TCK-0007
slug: preservar-json-rpc-no-stdout-do-transporte-stdio-ao-emitir-metricas
title: "Preservar JSON-RPC no stdout do transporte stdio ao emitir métricas"
source: verify
created_at: 2026-11-18T03:07:53Z
created_by: ops
updated_at: 2026-11-18T03:20:28Z
status: done
severity: medium
category: bug
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings: []
linked_designs:
  - DES-0007
linked_runs:
  - RUN-20261118-031326-stdio-metrics
linked_verifications:
  - VER-20261118-031947-tck-0007
linked_docs:
  - lib/core/tools.ts:27
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npm run build && npm run test:transport"
depth_decision:
  workflow: inline
  design: skip
  verify: lightweight
  source: routing-classifier
  classified_at: 2026-11-18T03:13:25Z
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
- 2026-11-18T03:13:25Z - **triaged** - Contaminação de stdout reproduzida após 100 chamadas; correção limitada à emissão da métrica e ao teste stdio [depth_decision do routing-classifier: workflow inline, design skip, verify lightweight]
- 2026-11-18T03:13:26Z - **linked** - links updated
- 2026-11-18T03:13:26Z - **designed** - Preservar diagnóstico e contrato JSON-RPC com a menor alteração
- 2026-11-18T03:13:26Z - **executing** - Implementar e validar a regressão de 101 chamadas
- 2026-11-18T03:19:47Z - **verifying** - Prova RED/GREEN e aceite local disponíveis
- 2026-11-18T03:20:28Z - **done** - Aceite e verificação independente aprovados
