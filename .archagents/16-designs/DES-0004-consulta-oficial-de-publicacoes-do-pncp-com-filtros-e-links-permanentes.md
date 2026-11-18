---
id: DES-0004
slug: consulta-oficial-de-publicacoes-do-pncp-com-filtros-e-links-permanentes
title: "Consulta oficial de publicações do PNCP com filtros e links permanentes"
created_at: 2026-11-17T23:59:45Z
status: approved
ticket: TCK-0004
type: design
scope_files_new: [apps/pncp/, lib/shared/pncp.ts, test/unit/pncp-app.test.ts]
scope_files_modified: [lib/core/http-client.ts, lib/core/mcp-server.ts, lib/tools/government.ts, scripts/build-apps.mjs, test/integration/transports.mjs, .github/workflows/ci.yml, README.md]
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0004-playbook.md
acceptance_delta: unchanged
---
# DES-0004 - Consulta oficial de publicações do PNCP com filtros e links permanentes

## Problema

A ferramenta textual inclui busca legada por termo e encaminhamento ao portal. O endpoint oficial de publicações exige datas de publicação e modalidade e aceita CNPJ opcional. O MCP App precisa expor esses filtros e links de editais verificáveis.

## Decisão

Registrar um HTML autônomo para `pncp_licitacoes`. A busca filtrada, com `modalidade_id`, datas e `query: ""`, usa a API de publicações com `cnpj`, `dataInicial`, `dataFinal`, `codigoModalidadeContratacao` e `pagina`. O CNPJ pode ser alfanumérico. O caminho sem modalidade preserva a resposta anterior e busca pública no portal. O cliente HTTP permite interpretar 204 como página vazia apenas nesta chamada. O link oficial vem dos identificadores do aviso e do domínio fixo pncp.gov.br.

## Critérios

- Filtros e páginas preservados, com estados vazio, erro e carregamento.
- Contrato textual original preservado, incluindo encaminhamento legado.
- Transporte Node com recurso HTML e Worker textual. Prova live no navegador e CI no PR da VPS.
