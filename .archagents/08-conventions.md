# Convenções

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

- O pacote usa ESM (`"type": "module"`), TypeScript (`tsc`), `esbuild` para os MCP Apps (`npm run build:apps`, acionado em `build` e `predev`) e Vitest para testes unitários.
- As 23 ferramentas registradas usam nomes em `snake_case`; os 5 recursos MCP Apps usam URIs `ui://dadosbr/<id>.html` com MIME `text/html;profile=mcp-app`.
- No transporte Node `stdio`, `stdout` é exclusivo para mensagens JSON-RPC; métricas e logs devem ir para `stderr` (`lib/core/tools.ts`).
- O teste de transporte (`npm run test:transport`) exige `initialize`, `ping`, catálogo explícito de 23 ferramentas, descoberta/leitura dos 5 recursos MCP Apps e 101 chamadas `stdio` sem erro de protocolo.

## Fontes

- `package.json:L5-L48`
- `test/integration/transports.mjs:L12-L99`
- `lib/core/tools.ts:L27-L47`
