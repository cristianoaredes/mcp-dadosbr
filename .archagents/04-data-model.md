# Contratos de dados

Base inicial: `037dae4c`.

As ferramentas são descritas com nome, descrição e schema de entrada. O handler do CLI devolve o objeto serializado em conteúdo de texto ou um erro MCP. No IBGE o argumento `tipo` seleciona a coleção e `uf` é exigido para municípios por estado.

## Fontes no snapshot inicial

- `lib/core/registry.ts:L8-L30`
- `lib/core/mcp-server.ts:L28-L65`
- `lib/tools/government.ts:L35-L55`
