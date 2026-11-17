---
id: DES-0001
slug: recurso-mcp-apps-com-navegacao-de-localidades-e-fallback-textual
title: "Recurso MCP Apps com navegação de localidades e fallback textual"
created_at: 2026-11-17T22:10:09Z
status: approved
ticket: TCK-0001
type: design
scope_files_new: ["apps/ibge/index.html", "apps/ibge/main.ts", "apps/ibge/style.css", "scripts/build-apps.mjs", "test/unit/ibge-app.test.ts"]
scope_files_modified: ["package.json", "package-lock.json", "lib/core/mcp-server.ts", "lib/types/index.ts", "lib/tools/government.ts", "test/integration/transports.mjs", "README.md", ".archagents/02-architecture.md", ".archagents/04-data-model.md"]
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0001-playbook.md
acceptance_delta: unchanged
---
# Explorador de Localidades do IBGE

A mesma ferramenta ibge_localidades recebe o recurso ui:// no servidor CLI. Ela devolve o JSON textual anterior junto de uma representação estruturada com os mesmos dados, URL e instante de coleta. O HTML empacotado usa a biblioteca MCP Apps e chama apenas a ferramenta já existente pelo host.

## Verificação

- Região, UF e município em host de teste com iframe isolado, incluindo busca e estados de erro.
- resources/read e resposta textual nos dois transportes do CLI. Compatibilidade sem extensão, 23 ferramentas e pacote npm com HTML.
- Worker compilado. A interface do adaptador Cloudflare permanece fora deste primeiro recorte.
- CI manual com checkout do SHA de produto no runner dedicado da VPS, sem deploy ou publicação.
