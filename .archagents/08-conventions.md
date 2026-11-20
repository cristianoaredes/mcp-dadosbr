# Convenções

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

- O pacote usa ESM (`"type": "module"`), TypeScript (`tsc`), `esbuild` para os MCP Apps (`npm run build:apps`, acionado em `build` e `predev`) e Vitest para testes unitários.
- As 23 ferramentas registradas usam nomes em `snake_case`; os 5 recursos MCP Apps usam URIs `ui://dadosbr/<id>.html` com MIME `text/html;profile=mcp-app`.
- No transporte Node `stdio`, `stdout` é exclusivo para mensagens JSON-RPC; métricas e logs devem ir para `stderr` (`lib/core/tools.ts`).
- O teste de transporte (`npm run test:transport`) exige `initialize`, `ping`, catálogo explícito de 23 ferramentas, descoberta/leitura dos 5 recursos MCP Apps e 101 chamadas `stdio` sem erro de protocolo.
- **Cobertura e Fake Timers (`TCK-0027`):** `npm run test:coverage` utiliza `@vitest/coverage-v8` (`^4.1.12`) cobrindo `lib/**/*.ts` (incluindo `lib/workers/` e `lib/adapters/cloudflare.ts`, excluindo apenas tipos/entrypoints CLI/UI), com ratchet inicial `75% lines / 72% functions / 67% branches / 73% statements` calibrado sobre o baseline medido (`77.47% / 74.53% / 69.56% / 75.76%`). Suítes baseadas em tempo como `test/unit/circuit-breaker.test.ts` devem usar `vi.useFakeTimers()` (restaurando mocks antes de `vi.useRealTimers()`).

## Fontes

- `package.json:L5-L48`
- `vitest.config.ts:L1-L49`
- `test/integration/transports.mjs:L12-L99`
- `lib/core/tools.ts:L27-L47`
