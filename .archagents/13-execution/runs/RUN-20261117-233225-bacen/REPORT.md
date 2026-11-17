---
run_id: RUN-20261117-233225-bacen
ticket: TCK-0003
design: DES-0003
operator: codex
status: completed
start_time: "2026-11-17T23:32:25Z"
end_time: 2026-11-17T23:40:05+00:00
commits:
  - sha: f7d97812d1b33ced8ce3cd2651bfbf505fef2987
    message: "[TCK-0003] Add Banco Central indicator charts as an MCP App"
    files: [".archagents/02-architecture.md", ".archagents/15-backlog/tickets/TCK-0003-mcp-app-para-indicadores-do-banco-central.md", ".archagents/16-designs/DES-0003-painel-sgs-com-series-e-periodos-explicitos.md", ".archagents/16-designs/playbooks/DES-0003-playbook.md", ".github/workflows/ci.yml", "README.md", "apps/bacen/chart.ts", "apps/bacen/index.html", "apps/bacen/main.ts", "apps/bacen/series.ts", "apps/bacen/style.css", "lib/core/mcp-server.ts", "lib/shared/bacen.ts", "lib/tools/financial.ts", "scripts/build-apps.mjs", "test/integration/transports.mjs", "test/unit/bacen-app.test.ts"]
files_modified: [".archagents/02-architecture.md", ".archagents/15-backlog/tickets/TCK-0003-mcp-app-para-indicadores-do-banco-central.md", ".archagents/16-designs/DES-0003-painel-sgs-com-series-e-periodos-explicitos.md", ".archagents/16-designs/playbooks/DES-0003-playbook.md", ".github/workflows/ci.yml", "README.md", "apps/bacen/chart.ts", "apps/bacen/index.html", "apps/bacen/main.ts", "apps/bacen/series.ts", "apps/bacen/style.css", "lib/core/mcp-server.ts", "lib/shared/bacen.ts", "lib/tools/financial.ts", "scripts/build-apps.mjs", "test/integration/transports.mjs", "test/unit/bacen-app.test.ts"]
test_result:
  status: pass
  summary: "274 testes, TypeScript estrito dos apps, stdio e HTTP/SSE, pacote e build Worker"
---
# TCK-0003 — Indicadores do Banco Central

- Chrome visível, CLI e AppBridge usaram o SGS real para meta Selic, IPCA, dólar, euro e CDI. Verificadas as unidades, a última referência, troca de janela e seleção das cinco séries.
- A meta Selic via últimos registros continha datas futuras. O CLI manteve a resposta original e o painel buscou a janela de 90 dias até a data atual, com 90 observações. A tabela do IPCA exibiu 12 observações anuais de periodicidade mensal e o host recebeu o link SGS 433.
- A negociação da extensão mantém o JSON e acrescenta proveniência estruturada. Worker textual. As três interfaces estão no manifesto npm.
