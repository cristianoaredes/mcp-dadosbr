# Segurança e limites

Base revisada: `c4bbd4f` + remediação `TCK-0015` (em worktree sobre `v0.6.0` / `4199d0a`; base inicial: `037dae4c`).

O Worker define rotas públicas explícitas (`PUBLIC_PATHS`: `/health`, `/`, `/openapi.json`, `/.well-known/*`) e exige `MCP_API_KEY` com comparação constant-time em `/mcp`, `/sse` e rotas REST quando configurada, mantendo `/oauth/*` e descoberta OAuth desabilitados em modo fail-closed (`501 oauth_not_supported`) e aplicando CORS restritivo via `MCP_ALLOWED_ORIGINS` (sem `*` em rotas autenticadas). O transporte HTTP/SSE local do CLI (`lib/adapters/cli.ts` + `lib/adapters/cli-http.ts`) realiza bind padrão em `127.0.0.1` (`MCP_HTTP_HOST`), desativa `x-powered-by`, impõe headers defensivos (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, `Referrer-Policy: no-referrer`), valida `Host` (anti-DNS-rebinding) e `Origin` (CORS loopback/allowlist explícito, nunca `*`, com `Vary: Origin`), aplica rate limit por IP, valida `sessionId` (`^[A-Za-z0-9_-]{1,128}$`) e armazena sessões SSE em `Map` com teto configurável (`MCP_MAX_SSE_SESSIONS`, default `100`). `.github/workflows/cloudflare-deploy.yml` restringe o token com `permissions: { contents: read }` e `persist-credentials: false`. URLs configuráveis de CNPJ e CEP passam por allowlist de hosts HTTPS e normalização (`validateAndNormalizeApiConfig`), tanto em `loadApiConfiguration()` quanto em `resolveApiConfig(overrides)` e no adaptador Smithery (`configSchema` / `createServer`), restringindo loopback (`localhost`, `127.0.0.1` exatos via HTTP/HTTPS) exclusivamente a `NODE_ENV` `development`/`test` (fail-closed quando ausente ou `production`), rejeitando credenciais embutidas (`username`/`password`) e sanitizando URLs em logs/erros. A tool `fipe_veiculos` valida `tipo` contra `ALLOWED_FIPE_TYPES` e `codigo_fipe` contra regex estrito antes de chamar `httpJson`. Todas as **23** ferramentas MCP registradas exigem `zodSchema` em tempo de compilação e passam por `zodSchema.safeParse(...)` centralizado em `executeRegisteredTool` (`lib/core/registry.ts` + `lib/core/tool-schemas.ts`, Zod `v4`) antes de qualquer chamada externa, com limites explícitos de paginação/tamanho; `cnpj_intelligence` removeu `api_key` do schema e rejeita argumentos extras (`.strict()`). As capacidades e a allowlist agêntica (`SAFETY.md §SC-9`) estão versionadas em `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json`. O histórico de `sequentialthinking` é isolado por sessão via `ToolExecutionContext` (`lib/core/mcp-server.ts`, `lib/tools/core.ts` — sem singleton de módulo; o arquivo morto `lib/workers/mcp-agent.ts` foi removido em `TCK-0021`), usa `Map` seguro contra colisão de protótipo com tetos FIFO (`100/20/50`) e mantém logging de pensamentos desligado por padrão; logs de `search.ts` e `intelligence.ts` redigem/resumem queries, CNPJ (`***XXXX`), razão social, dorks e PII via `lib/shared/log-redaction.ts`; o dispatcher MCP (`lib/core/mcp-server.ts`) aplica rate limit configurável por sessão (`MCP_TOOL_RATE_LIMIT_MAX`, default `120` chamadas/janela) inclusive em `stdio`. Em dependências de produção (`package.json` / `package-lock.json`), foram removidas `@smithery/sdk`, `agents`, `workers-mcp` e `async-mutex`, atualizados `zod` (`^4.6.7`) e `express` (`^5.3.0`), e adicionado o gate `npm audit --omit=dev --audit-level=high` em `.github/workflows/ci.yml:L116-L117`. `readCnpjProfile` rejeita credenciais embutidas na URL do provedor, e `scripts/build-apps.mjs` bloqueia fechamentos inline `</script`/`</style` ao empacotar os MCP Apps. Exposição efetiva, controles ativos no host e conformidade ficam **a confirmar** por ambiente. Credenciais e evidências de execução ficam fora do Git.

## Fontes

- `lib/workers/auth.ts:L12-L89`
- `lib/workers/oauth.ts:L1-L47`
- `lib/adapters/cloudflare.ts:L19-L170`
- `lib/workers/worker.ts:L156-L192`
- `lib/adapters/cli-http.ts:L1-L403`
- `lib/adapters/cli.ts:L1-L142`
- `.github/workflows/cloudflare-deploy.yml:L27-L41`
- `lib/config/index.ts:L7-L219`
- `lib/adapters/smithery.ts:L1-L53`
- `lib/tools/financial.ts:L68-L103`
- `lib/core/tool-schemas.ts:L1-L270`
- `lib/core/registry.ts:L8-L101`
- `package.json:L82-L88`
- `.github/workflows/ci.yml:L113-L118`
- `lib/core/intelligence.ts:L58-L523`
- `lib/core/search.ts:L17-L95`
- `lib/core/sequential-thinking.ts:L1-L185`
- `lib/shared/log-redaction.ts:L1-L32`
- `lib/infrastructure/rate-limiter.ts:L8-L135`
- `lib/core/mcp-server.ts:L11-L241`
- `lib/tools/core.ts:L52-L149`
- `.archagents/_capabilities.json`
- `.archagents/mcp-tool-allowlist.json`
- `lib/shared/cnpj-profile.ts:L92-L100`
- `scripts/build-apps.mjs:L30-L35`
