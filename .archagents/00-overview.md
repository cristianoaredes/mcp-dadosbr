# Visão geral

Base revisada: `9e74ba5` (candidata `0.6.0` sob `AGPL-3.0-only`; base inicial: `037dae4c`).

Servidor MCP em TypeScript (`@aredes.me/mcp-dadosbr`, licença `AGPL-3.0-only`, atribuições em `NOTICE.md`) para consulta de dados públicos brasileiros. O pacote declara a versão `0.6.0`, expõe 23 ferramentas MCP e 5 recursos MCP Apps (`ui://dadosbr/*.html`) em Node.js (`^22.12.0 || ^24.0.0 || ^26.0.0`), além de um adapter separado para Cloudflare Workers. O build compila o servidor com `tsc` e empacota os 5 apps HTML autônomos com `scripts/build-apps.mjs`.

## Fontes

- `package.json:L1-L48`
- `package.json:L72-L74`
- `package.json:L109-L114`
- `lib/core/mcp-server.ts:L17-L64`
