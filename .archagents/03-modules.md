# Mapa de módulos

Base revisada: `c83d626` (`0.6.0`, worktree `audit-remediation`; base inicial: `037dae4c`).

- `lib/core`: servidor MCP (`mcp-server.ts`), registro (`registry.ts`), orquestração e métricas (`tools.ts`), serviço acíclico de lookup/deduplicação (`lookup.ts`), cliente HTTP com retry/circuit breaker e proteção SSRF (`http-client.ts`), cache (`cache.ts`), schemas compartilhados (`tool-schemas.ts`), busca (`search.ts`, `search-providers.ts`, `dork-templates.ts`), inteligência CNPJ (`intelligence.ts`), pensamento sequencial (`sequential-thinking.ts`) e validação Zod (`validation.ts`). Decisões estruturais registradas em `.archagents/09-decisions/ADR-0001-*.md` e `ADR-0002-*.md`.
- `lib/tools`: módulos de domínio auto-registrados via barrel `index.ts` (`core`, `government`, `legal`, `company`, `financial`, `health`, `osint`). Não são importados por `lib/core/` (fluxo acíclico `tools -> core`).
- `lib/shared`: contratos e projeções compartilhadas entre servidor e apps (`bacen.ts`, `pncp.ts`, `cnpj-profile.ts`, `errors.ts`, `log-redaction.ts`, `types/`, `utils/constants.ts`, `utils/timeout.ts`).
- `lib/adapters` e `lib/bin`: adaptadores do CLI (`cli.ts` em stdio/HTTP, `cli-http.ts` com servidor Express, headers e `createGracefulShutdown`), Cloudflare (`cloudflare.ts` com `syncWorkerEnv`), Smithery (`smithery.ts`) e binário `mcp-dadosbr.ts`.
- `lib/workers`: ponto de entrada (`worker.ts`), rotas REST (`rest.ts`), SSE (`sse.ts`), OpenAPI (`openapi.ts`), autenticação/OAuth/tipos (`auth.ts`, `oauth.ts`, `types.ts`) e rate limit (`rate-limit.ts`) do Cloudflare Worker.
- `apps/` e `scripts/build-apps.mjs`: cinco interfaces MCP Apps (`apps/ibge`, `apps/querido-diario`, `apps/bacen`, `apps/pncp`, `apps/cnpj`), empacotadas via `esbuild` em HTML autônomo sob `build/lib/apps/*.html`.
- `infra/runner/`: supervisor systemd/Docker isolado (`supervisor.py`, `setup-network-isolation.sh`, `Dockerfile`, `dadosbr-runner-supervisor.service`, `test_supervisor.py`) documentado em `.archagents/06-infra-devops.md`.

## Fontes

- `lib/tools/index.ts:L1-L25`
- `lib/core/registry.ts:L8-L46`
- `lib/core/lookup.ts:L1-L87`
- `lib/core/intelligence.ts:L1-L35`
- `lib/tools/core.ts:L1-L103`
- `lib/adapters/cli.ts:L1-L18`
- `lib/adapters/cloudflare.ts:L23-L58`
- `lib/workers/worker.ts:L12-L115`
- `scripts/build-apps.mjs:L1-L42`
- `lib/shared/bacen.ts:L1-L37`
- `lib/shared/pncp.ts:L1-L56`
- `lib/shared/cnpj-profile.ts:L1-L119`
