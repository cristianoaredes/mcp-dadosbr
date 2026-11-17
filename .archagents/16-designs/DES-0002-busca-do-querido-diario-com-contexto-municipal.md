---
id: DES-0002
slug: busca-do-querido-diario-com-contexto-municipal
title: "Busca do Querido Diário com contexto municipal"
created_at: 2026-11-17T22:48:44Z
status: approved
ticket: TCK-0002
type: design
scope_files_new: [apps/querido-diario/, test/unit/querido-diario-app.test.ts]
scope_files_modified: [apps/ibge/, lib/core/mcp-server.ts, lib/tools/government.ts, scripts/build-apps.mjs, test/integration/transports.mjs, .github/workflows/ci.yml, README.md]
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0002-playbook.md
acceptance_delta: unchanged
---
# DES-0002 - Busca do Querido Diário com contexto municipal

## Problema

O Explorador identifica o município e o código IBGE. A consulta aos diários municipais deve aproveitar essa seleção no próprio host, sem digitação adicional.

## Decisão

O painel de busca é compartilhado entre o Explorador e o recurso MCP de `querido_diario`. O clique em município aciona a ferramenta via AppBridge com o código da linha em `territory_id`. Busca textual, período e paginação preservam o município. A resposta textual continua no formato original e o resultado estruturado é negociado pelo tipo MCP App. O Worker mantém o retorno textual.

A API é chamada pelo adaptador do servidor em `api.queridodiario.org.br`, conforme a configuração pública do provedor. O front renderiza retorno como texto, valida o código do município e só delega ao host a abertura de links HTTPS em domínios de arquivos reconhecidos. Erros e vazios têm feedback distinto.

## Critérios

- Seleção municipal passa o código correto, inclusive em buscas, datas e paginação.
- Os dois recursos HTML são empacotados e descobertos nos transportes Node.
- O fallback textual tem o mesmo envelope sem a extensão e os erros preservam `isError`.
- CI do SHA do PR usa runner isolado na VPS e inclui teste, qualidade e build Worker.
