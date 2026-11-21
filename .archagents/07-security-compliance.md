# Segurança e limites

Base revisada: `a7fd8e4` (`0.6.0`, branch `feature/audit-remediation-wave2` sobre `origin/main` `dae3ca0`; base inicial: `037dae4c`).

O Worker define rotas públicas explícitas (`PUBLIC_PATHS`: `/health`, `/`, `/openapi.json`, `/.well-known/*`), adiciona headers defensivos globais em `BASE_CORS_HEADERS` (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`), valida JSON malformado como HTTP `400` (`parseJsonBody`) e sanitiza falhas `500` em `lib/workers/rest.ts` via `internalServerErrorResponse` sem expor `error.message` ao cliente; exige `MCP_API_KEY` com comparação constant-time em `/mcp`, `/sse` e rotas REST quando configurada, mantendo `/oauth/*` e descoberta OAuth desabilitados em modo fail-closed (`501 oauth_not_supported`) e aplicando CORS restritivo via `MCP_ALLOWED_ORIGINS` (sem `*` em rotas autenticadas). O transporte HTTP/SSE local do CLI (`lib/adapters/cli.ts` + `lib/adapters/cli-http.ts`) realiza bind padrão em `127.0.0.1` (`MCP_HTTP_HOST`), exige `MCP_API_KEY` em modo fail-closed sempre que configurado fora de loopback (`!isLoopbackHost(host)`), valida Bearer/`X-API-Key` via SHA-256 + `timingSafeEqual` (`isValidApiKey`) quando definida, desativa `x-powered-by`, impõe headers defensivos (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, `Referrer-Policy: no-referrer`), valida `Host` (anti-DNS-rebinding) e `Origin` (CORS loopback/allowlist explícito, nunca `*`, com `Vary: Origin`), aplica rate limit por IP, propaga `RequestContext` via `AsyncLocalStorage`, valida `sessionId` (`^[A-Za-z0-9_-]{1,128}$`) e armazena sessões SSE em `Map` com teto configurável (`MCP_MAX_SSE_SESSIONS`, default `100`). `.github/workflows/cloudflare-deploy.yml` restringe o token com `permissions: { contents: read }` e `persist-credentials: false`. URLs configuráveis de CNPJ e CEP passam por allowlist de hosts HTTPS e normalização (`validateAndNormalizeApiConfig`), tanto em `loadApiConfiguration()` quanto em `resolveApiConfig(overrides)` e no adaptador Smithery (`configSchema` / `createServer`), restringindo loopback (`localhost`, `127.0.0.1` exatos via HTTP/HTTPS) exclusivamente a `NODE_ENV` `development`/`test` (fail-closed quando ausente ou `production`), rejeitando credenciais embutidas (`username`/`password`) e sanitizando URLs em logs/erros. A tool `fipe_veiculos` valida `tipo` contra `ALLOWED_FIPE_TYPES` e `codigo_fipe` contra regex estrito antes de chamar `httpJson`. Todas as **23** ferramentas MCP registradas exigem `zodSchema` em tempo de compilação e passam por `zodSchema.safeParse(...)` centralizado em `executeRegisteredTool` (`lib/core/registry.ts` + `lib/core/tool-schemas.ts`, Zod `v4`) antes de qualquer chamada externa, com limites explícitos de paginação/tamanho; `cnpj_intelligence` removeu `api_key` do schema e rejeita argumentos extras (`.strict()`). As capacidades e a allowlist agêntica (`SAFETY.md §SC-9`) estão versionadas em `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json` (`20 queries` alinhado ao schema). Em proteção agêntica e compliance (`TCK-0033` / `TCK-0036`), `lib/shared/agentic-guard.ts` encapsula contexto externo/de usuário com `<untrusted_user_context>` e `sanitizeUntrustedText` (`osint.ts`, `search-providers.ts`, `legal.ts` `parseProcuradosHtml`) e limita o tamanho de respostas MCP em `mcp-server.ts` e `cloudflare.ts` via `serializeBoundedToolOutput` (`MCP_MAX_TOOL_OUTPUT_CHARS`, default `100000`); `PRIVACY.md`, `.archagents/10-runbooks.md` (Art. 48 ANPD), `GET /`/`openapi.json` (`MCP_DPO_CONTACT`, Art. 41) e `lib/shared/compliance-notices.ts` (`HOMONYM_HUMAN_REVIEW_NOTICE`, Art. 20 em `procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos`) reforçam a governança LGPD (permanecendo pendentes em `raw` os tickets `TCK-0030`–`TCK-0032` referentes a `FND-0015`–`FND-0017`, adiados por instrução do operador). O histórico de `sequentialthinking` é isolado por sessão via `ToolExecutionContext` (`lib/core/mcp-server.ts`, `lib/tools/core.ts` — sem singleton de módulo; `tokens.ts` e `smithery.config.js` removidos em `TCK-0037`), usa `Map` seguro contra colisão de protótipo com tetos FIFO (`100/20/50`) e mantém logging de pensamentos desligado por padrão; logs de `search.ts`, `intelligence.ts`, `rate-limit.ts` e `tools.ts` (`tool.executed` em `INFO`) emitem JSON em `stderr` via `createLogger` com redação em `lib/shared/log-redaction.ts`; o dispatcher MCP (`lib/core/mcp-server.ts`) aplica rate limit configurável por sessão (`MCP_TOOL_RATE_LIMIT_MAX`, default `120` chamadas/janela) inclusive em `stdio`. Em dependências de produção (`package.json` / `package-lock.json`), foram removidas `@smithery/sdk`, `agents`, `workers-mcp` e `async-mutex`, atualizados `zod` (`^4.6.7`) e `express` (`^5.3.0`), e adicionado o gate `npm audit --omit=dev --audit-level=high` em `.github/workflows/ci.yml:L116-L117`. `readCnpjProfile` rejeita credenciais embutidas na URL do provedor, e `scripts/build-apps.mjs` bloqueia fechamentos inline `</script`/`</style` ao empacotar os MCP Apps. Exposição efetiva, controles ativos no host e conformidade ficam **a confirmar** por ambiente. Credenciais e evidências de execução ficam fora do Git.

## Fontes

- `lib/workers/auth.ts:L12-L89`
- `lib/workers/oauth.ts:L1-L47`
- `lib/workers/rest.ts:L1-L323`
- `lib/workers/rate-limit.ts:L1-L163`
- `lib/adapters/cloudflare.ts:L1-L441`
- `lib/workers/worker.ts:L1-L236`
- `lib/adapters/cli-http.ts:L1-L700`
- `lib/adapters/cli.ts:L1-L174`
- `.github/workflows/cloudflare-deploy.yml:L27-L157`
- `lib/config/index.ts:L7-L219`
- `lib/adapters/smithery.ts:L1-L53`
- `lib/tools/financial.ts:L68-L103`
- `lib/core/tool-schemas.ts:L1-L273`
- `lib/core/registry.ts:L8-L101`
- `package.json:L82-L88`
- `.github/workflows/ci.yml:L113-L118`
- `lib/core/intelligence.ts:L1-L610`
- `lib/core/search.ts:L1-L177`
- `lib/core/search-providers.ts:L1-L300`
- `lib/core/sequential-thinking.ts:L1-L185`
- `lib/shared/log-redaction.ts:L1-L32`
- `lib/shared/agentic-guard.ts:L1-L151`
- `lib/shared/compliance-notices.ts:L1-L20`
- `lib/infrastructure/rate-limiter.ts:L8-L135`
- `lib/core/mcp-server.ts:L1-L262`
- `lib/core/tools.ts:L1-L203`
- `lib/tools/osint.ts:L1-L148`
- `lib/tools/legal.ts:L1-L523`
- `lib/tools/government.ts:L1-L489`
- `.archagents/_capabilities.json`
- `.archagents/mcp-tool-allowlist.json`
- `.archagents/10-runbooks.md`
- `PRIVACY.md:L1-L78`
- `lib/shared/cnpj-profile.ts:L92-L100`
- `scripts/build-apps.mjs:L30-L35`
