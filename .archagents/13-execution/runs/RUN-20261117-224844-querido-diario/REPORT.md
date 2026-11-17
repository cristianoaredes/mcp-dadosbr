---
run_id: RUN-20261117-224844-querido-diario
ticket: TCK-0002
design: DES-0002
operator: codex
status: completed
start_time: "2026-11-17T22:48:44Z"
end_time: 2026-11-17T22:58:24+00:00
commits:
  - sha: 081244adfda998f926a37af576566daa11e7193b
    message: "[TCK-0002] Add Querido Diário MCP App with IBGE municipality handoff"
    files: [".archagents/02-architecture.md", ".archagents/15-backlog/tickets/TCK-0002-mcp-app-querido-diario-a-partir-de-municipio-do-ibge.md", ".archagents/16-designs/DES-0002-busca-do-querido-diario-com-contexto-municipal.md", ".archagents/16-designs/playbooks/DES-0002-playbook.md", ".github/workflows/ci.yml", "README.md", "apps/ibge/index.html", "apps/ibge/main.ts", "apps/querido-diario/index.html", "apps/querido-diario/main.ts", "apps/querido-diario/search.css", "apps/querido-diario/search.html", "apps/querido-diario/search.ts", "apps/querido-diario/style.css", "lib/core/mcp-server.ts", "lib/tools/government.ts", "scripts/build-apps.mjs", "test/integration/transports.mjs", "test/unit/querido-diario-app.test.ts"]
files_modified: [".archagents/02-architecture.md", ".archagents/15-backlog/tickets/TCK-0002-mcp-app-querido-diario-a-partir-de-municipio-do-ibge.md", ".archagents/16-designs/DES-0002-busca-do-querido-diario-com-contexto-municipal.md", ".archagents/16-designs/playbooks/DES-0002-playbook.md", ".github/workflows/ci.yml", "README.md", "apps/ibge/index.html", "apps/ibge/main.ts", "apps/querido-diario/index.html", "apps/querido-diario/main.ts", "apps/querido-diario/search.css", "apps/querido-diario/search.html", "apps/querido-diario/search.ts", "apps/querido-diario/style.css", "lib/core/mcp-server.ts", "lib/tools/government.ts", "scripts/build-apps.mjs", "test/integration/transports.mjs", "test/unit/querido-diario-app.test.ts"]
test_result:
  status: pass
  summary: "265 testes, build Node/Worker, recursos em stdio e HTTP/SSE e revisão P10"
---
# TCK-0002 — MCP App Querido Diário

- Chrome visível e AppBridge executaram Nordeste, Ceará e Fortaleza (2304400), consulta inicial, termo, datas, página 2, edição municipal, rejeição de URL javascript, vazio e chamada direta. Consultas de sucesso usaram uma fixture do contrato da API.
- O domínio ativo consta na [configuração do provedor](https://queridodiario.org.br/env.js). A API ao vivo respondeu 503 em consulta direta e o host mostrou indisponibilidade com retry quando a chamada real expirou.
- O JSON textual preserva seu envelope. O build Node, TypeScript estrito dos apps, build Worker, manifesto npm com os dois HTMLs e revisão independente passaram.
