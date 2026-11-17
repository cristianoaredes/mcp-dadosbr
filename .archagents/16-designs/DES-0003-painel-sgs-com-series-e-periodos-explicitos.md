---
id: DES-0003
slug: painel-sgs-com-series-e-periodos-explicitos
title: "Painel SGS com séries e períodos explícitos"
created_at: 2026-11-17T23:32:25Z
status: approved
ticket: TCK-0003
type: design
scope_files_new: [apps/bacen/, lib/shared/bacen.ts, test/unit/bacen-app.test.ts]
scope_files_modified: [lib/core/mcp-server.ts, lib/tools/financial.ts, scripts/build-apps.mjs, test/integration/transports.mjs, .github/workflows/ci.yml, README.md]
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0003-playbook.md
acceptance_delta: unchanged
---
# DES-0003 - Painel SGS com séries e períodos explícitos

## Problema

`bacen_taxas` devolve séries do Banco Central em JSON. O painel deve apresentar os dados com unidades, datas e origem verificáveis em um host MCP Apps.

## Decisão

Registrar um recurso HTML autônomo em stdio e HTTP/SSE. Uma série por gráfico, com período selecionável, valor publicado mais recente, tabela acessível e link oficial SGS. Reusar os cinco códigos atuais. O caminho legado `indicador` / `ultimos` conserva a chamada e o envelope textual. Para os períodos do painel, a ferramenta aceita `periodo_dias` com 30, 90 ou 365 dias e consulta o SGS com as duas datas. O gráfico exclui observações posteriores à data de São Paulo. A API legada retorna datas futuras para a meta Selic e limita o endpoint de últimas observações a 20.

## Critérios

- Renderizar as cinco séries oficiais com unidade e frequência corretas.
- Preservar fallback textual e erros, servir o HTML empacotado e validar os dois transportes.
- Exercitar dados ao vivo e o filtro de períodos no host de teste visível. Rodar o CI de PR na VPS antes do merge.
