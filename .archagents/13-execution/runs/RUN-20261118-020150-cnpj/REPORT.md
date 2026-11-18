---
run_id: RUN-20261118-020150-cnpj
ticket: TCK-0005
design: DES-0005
operator: codex
status: completed
start_time: "2026-11-18T02:01:50Z"
end_time: 2026-11-18T02:07:35+00:00
commits:
  - sha: c491a8a96932776d40e653648531d029a836ef66
    message: "[TCK-0005] Add CNPJ registration profile MCP App"
    files: [".archagents/02-architecture.md", ".archagents/15-backlog/tickets/TCK-0005-mcp-app-de-ficha-por-cnpj.md", ".archagents/16-designs/DES-0005-ficha-cadastral-e-proveniencia-do-provedor-de-cnpj.md", ".archagents/16-designs/playbooks/DES-0005-playbook.md", ".github/workflows/ci.yml", "README.md", "apps/cnpj/index.html", "apps/cnpj/main.ts", "apps/cnpj/style.css", "lib/core/mcp-server.ts", "lib/shared/cnpj-profile.ts", "scripts/build-apps.mjs", "test/integration/transports.mjs", "test/unit/cnpj-app.test.ts"]
files_modified: [".archagents/02-architecture.md", ".archagents/15-backlog/tickets/TCK-0005-mcp-app-de-ficha-por-cnpj.md", ".archagents/16-designs/DES-0005-ficha-cadastral-e-proveniencia-do-provedor-de-cnpj.md", ".archagents/16-designs/playbooks/DES-0005-playbook.md", ".github/workflows/ci.yml", "README.md", "apps/cnpj/index.html", "apps/cnpj/main.ts", "apps/cnpj/style.css", "lib/core/mcp-server.ts", "lib/shared/cnpj-profile.ts", "scripts/build-apps.mjs", "test/integration/transports.mjs", "test/unit/cnpj-app.test.ts"]
test_result:
  status: pass
  summary: "286 testes, transporte, empacotamento e AppBridge com respostas reais"
---
# TCK-0005 — Ficha por CNPJ

- Chrome e AppBridge exibiram Ministério da Fazenda e Banco do Brasil por OpenCNPJ e Ministério da Fazenda por CNPJ.ws. Confirmados situação, CNAE principal, atividade secundária, endereço e proveniência.
- Entrada inválida mostrou erro e removeu a ficha anterior. A validação do lookup é a mesma.
- Verificação independente conferiu compatibilidade literal de texto, projeção, proveniência e cache.
