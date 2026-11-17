---
run_id: RUN-20261117-221052-ibge-mcp-app
ticket: TCK-0001
design: DES-0001
operator: codex
status: completed
start_time: "2026-11-17T22:10:52Z"
end_time: 2026-11-17T22:24:45.794036+00:00
commits:
  - sha: 4d31292b85b4fdedda9d75deb3a10bdc5719540f
    message: "[TCK-0001] Add the IBGE localities MCP App"
    files: [".archagents/02-architecture.md", ".archagents/04-data-model.md", ".archagents/15-backlog/tickets/TCK-0001-explorador-de-localidades-do-ibge-com-mcp-apps.md", ".archagents/16-designs/DES-0001-recurso-mcp-apps-com-navegacao-de-localidades-e-fallback-textual.md", ".archagents/16-designs/playbooks/DES-0001-playbook.md", "README.md", "apps/ibge/index.html", "apps/ibge/main.ts", "apps/ibge/style.css", "lib/core/mcp-server.ts", "lib/tools/government.ts", "lib/types/index.ts", "package-lock.json", "package.json", "scripts/build-apps.mjs", "test/integration/transports.mjs", "test/unit/ibge-app.test.ts"]
files_modified: [".archagents/02-architecture.md", ".archagents/04-data-model.md", ".archagents/15-backlog/tickets/TCK-0001-explorador-de-localidades-do-ibge-com-mcp-apps.md", ".archagents/16-designs/DES-0001-recurso-mcp-apps-com-navegacao-de-localidades-e-fallback-textual.md", ".archagents/16-designs/playbooks/DES-0001-playbook.md", "README.md", "apps/ibge/index.html", "apps/ibge/main.ts", "apps/ibge/style.css", "lib/core/mcp-server.ts", "lib/tools/government.ts", "lib/types/index.ts", "package-lock.json", "package.json", "scripts/build-apps.mjs", "test/integration/transports.mjs", "test/unit/ibge-app.test.ts"]
test_result:
  status: pass
  summary: "261 testes em cada Node LTS, protocolo em stdio e HTTP/SSE, ativo npm e build Worker"
---

# TCK-0001 — Explorador de localidades do IBGE

- O recurso MCP Apps foi empacotado e descoberto em stdio e HTTP/SSE. JSON textual preservado em clientes sem extensão. Os erros de consulta conservam a sinalização do protocolo.
- O host de teste com AppBridge, sandbox e CLI real percorreu Nordeste, Ceará e Fortaleza por código e nome, confirmou estado vazio e URL oficial com data de consulta.
- CI dedicado https://github.com/cristianoaredes/mcp-dadosbr/actions/runs/44188716170, Node 22/24/26, commit de produto 4d31292b85b4fdedda9d75deb3a10bdc5719540f confirmado em cada log. O workflow possui ref separada e não contém publicação.
- Containers e rede temporários removidos da VPS, zero runners registrados ao fim. O Worker compilou, com suporte à interface do App restrito ao CLI neste piloto.
