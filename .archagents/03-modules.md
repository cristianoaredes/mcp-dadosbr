# Mapa de módulos

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

- `lib/core`: servidor MCP (`mcp-server.ts`), registro (`registry.ts`), orquestração e métricas (`tools.ts`), cliente HTTP com retry/circuit breaker (`http-client.ts`), cache, busca, inteligência e validação.
- `lib/tools`: módulos de domínio auto-registrados via barrel `index.ts` (`core`, `government`, `legal`, `company`, `financial`, `health`, `osint`).
- `lib/shared`: contratos e projeções compartilhadas entre servidor e apps (`bacen.ts`, `pncp.ts`, `cnpj-profile.ts`, `errors.ts`).
- `lib/adapters` e `lib/bin`: adaptadores do CLI (`cli.ts` em stdio e HTTP/SSE), Cloudflare (`cloudflare.ts`), Smithery (`smithery.ts`) e binário `mcp-dadosbr.ts`.
- `lib/workers`: ponto de entrada, rotas REST/SSE, autenticação/OAuth e rate limit do Cloudflare Worker.
- `apps/` e `scripts/build-apps.mjs`: cinco interfaces MCP Apps (`apps/ibge`, `apps/querido-diario`, `apps/bacen`, `apps/pncp`, `apps/cnpj`), empacotadas via `esbuild` em HTML autônomo sob `build/lib/apps/*.html`.

## Fontes

- `lib/tools/index.ts:L1-L25`
- `lib/core/registry.ts:L8-L46`
- `lib/adapters/cli.ts:L1-L18`
- `lib/workers/worker.ts:L63-L92`
- `scripts/build-apps.mjs:L1-L42`
- `lib/shared/bacen.ts:L1-L37`
- `lib/shared/pncp.ts:L1-L56`
- `lib/shared/cnpj-profile.ts:L1-L119`
