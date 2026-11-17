# Contratos de dados

Base inicial: `037dae4c`.

As ferramentas são descritas com nome, descrição e schema de entrada. O handler do CLI devolve o objeto serializado em conteúdo de texto ou um erro MCP. No IBGE o argumento `tipo` seleciona a coleção e `uf` é exigido para municípios por estado.

## Fontes no snapshot inicial

- `lib/core/registry.ts:L8-L30`
- `lib/core/mcp-server.ts:L28-L65`
- `lib/tools/government.ts:L35-L55`

## Resposta de localidades com MCP Apps

`ibge_localidades` mantém o JSON no conteúdo textual. Se o cliente anunciar suporte ao MIME `text/html;profile=mcp-app`, o CLI inclui `structuredContent` como objeto com `items` e `source`. O servidor registra URL e horário da consulta bem-sucedida à API de Localidades do IBGE. Erros mantêm `isError` e a resposta textual. Veja `lib/core/mcp-server.ts` e `lib/tools/government.ts`.
