# Mapa de módulos

Base revisada: `133dbd5` (`0.7.0`, branch `feature/SPC-0001-v0.7.0-transversal-sources` / `SPC-0001`; base inicial: `037dae4c`).

- `lib/core`: servidor MCP (`mcp-server.ts`), registro (`registry.ts`), orquestração e métricas (`tools.ts`), serviço acíclico de lookup/deduplicação (`lookup.ts`), cliente HTTP com retry/circuit breaker e proteção SSRF (`http-client.ts`), cache (`cache.ts`), schemas compartilhados (`tool-schemas.ts`), busca (`search.ts`, `search-providers.ts`, `dork-templates.ts`), inteligência CNPJ (`intelligence.ts`), pensamento sequencial (`sequential-thinking.ts`) e validação Zod (`validation.ts`). Decisões estruturais registradas em `.archagents/09-decisions/ADR-0001-*.md` e `ADR-0002-*.md`.
- `lib/tools`: módulos de domínio registrados via barrel `index.ts` (`core`, `government`, `legal`, `company`, `financial`, `health`, `osint`, `tcu`, `fiscal-banking`, `olinda`, `ibge-indicadores`). Não são importados por `lib/core/` (fluxo acíclico `tools -> core`).
- `lib/shared`: contratos, schemas `.strict()` e utilitários portáveis (Web-standard, sem imports `node:*`) compartilhados entre servidor, Worker e apps (`bacen.ts`, `pncp.ts`, `cnpj-profile.ts`, `errors.ts`, `log-redaction.ts`, `agentic-guard.ts`, `compliance-notices.ts`, `mte-lista-suja.ts`, `tcu-schema.ts`, `fiscal-banking-schemas.ts`, `olinda-ibge-schemas.ts`, `types/`, `utils/constants.ts`, `utils/timeout.ts`).
- `lib/adapters` e `lib/bin`: adaptadores do CLI (`cli.ts` em stdio/HTTP com `MCP_API_KEY` fail-closed fora de loopback, `cli-http.ts` com Express, auth Bearer/`X-API-Key`, `AsyncLocalStorage<RequestContext>`, headers e `createGracefulShutdown`), Cloudflare (`cloudflare.ts` com `syncWorkerEnv`, headers defensivos e `serializeBoundedToolOutput`), Smithery (`smithery.ts`) e binário `mcp-dadosbr.ts`.
- `lib/workers`: ponto de entrada (`worker.ts`), rotas REST (`rest.ts` com `parseJsonBody` `400`, `404` e `500` sanitizado), SSE (`sse.ts`), OpenAPI (`openapi.ts`), autenticação/OAuth/tipos (`auth.ts`, `oauth.ts`, `types.ts`) e rate limit (`rate-limit.ts`) do Cloudflare Worker.
- `apps/` e `scripts/build-apps.mjs`: cinco interfaces MCP Apps (`apps/ibge`, `apps/querido-diario`, `apps/bacen`, `apps/pncp`, `apps/cnpj`), empacotadas via `esbuild` em HTML autônomo sob `build/lib/apps/*.html`.
- `infra/runner/`: supervisor systemd/Docker isolado (`supervisor.py`, `setup-network-isolation.sh`, `Dockerfile`, `dadosbr-runner-supervisor.service`, `test_supervisor.py`) documentado em `.archagents/06-infra-devops.md`.
- `PRIVACY.md`: política e transparência LGPD na raiz do pacote/repositório.

## Fontes

- `lib/tools/index.ts:L1-L25`
- `lib/core/registry.ts:L8-L46`
- `lib/core/lookup.ts:L1-L87`
- `lib/core/intelligence.ts:L1-L35`
- `lib/tools/core.ts:L1-L103`
- `lib/adapters/cli.ts:L1-L174`
- `lib/adapters/cloudflare.ts:L1-L441`
- `lib/workers/worker.ts:L1-L236`
- `lib/workers/rest.ts:L1-L323`
- `lib/workers/openapi.ts:L1-L343`
- `scripts/build-apps.mjs:L1-L42`
- `lib/shared/bacen.ts:L1-L37`
- `lib/shared/pncp.ts:L1-L56`
- `lib/shared/cnpj-profile.ts:L1-L119`
- `lib/shared/agentic-guard.ts:L1-L151`
- `lib/shared/compliance-notices.ts:L1-L20`
- `lib/shared/mte-lista-suja.ts:L1-L301`
- `lib/shared/tcu-schema.ts:L1-L54`
- `lib/shared/fiscal-banking-schemas.ts:L1-L49`
- `lib/shared/olinda-ibge-schemas.ts:L1-L85`
- `lib/tools/tcu.ts:L1-L186`
- `lib/tools/fiscal-banking.ts:L1-L915`
- `lib/tools/olinda.ts:L1-L456`
- `lib/tools/ibge-indicadores.ts:L1-L520`
- `PRIVACY.md:L1-L78`
