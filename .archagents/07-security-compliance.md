# Segurança e limites

Base revisada: `9308fe0` (em remediação no worktree sobre `v0.6.0` / `4199d0a`; base inicial: `037dae4c`).

O Worker define rotas públicas explícitas (`PUBLIC_PATHS`: `/health`, `/`, `/openapi.json`, `/.well-known/*`) e exige `MCP_API_KEY` com comparação constant-time em `/mcp`, `/sse` e rotas REST quando configurada, mantendo `/oauth/*` e descoberta OAuth desabilitados em modo fail-closed (`501 oauth_not_supported`) e aplicando CORS restritivo via `MCP_ALLOWED_ORIGINS` (sem `*` em rotas autenticadas). O CLI usa rate limit na entrada HTTP. URLs configuráveis de CNPJ e CEP passam por allowlist de hosts HTTPS e normalização (`validateAndNormalizeApiConfig`), tanto em `loadApiConfiguration()` quanto em `resolveApiConfig(overrides)` e no adaptador Smithery (`configSchema` / `createServer`), restringindo loopback (`localhost`, `127.0.0.1` exatos via HTTP/HTTPS) exclusivamente a `NODE_ENV` `development`/`test` (fail-closed quando ausente ou `production`), rejeitando credenciais embutidas (`username`/`password`) e sanitizando URLs em logs/erros. A tool `fipe_veiculos` valida `tipo` contra `ALLOWED_FIPE_TYPES` e `codigo_fipe` contra regex estrito antes de chamar `httpJson`. Todas as **23** ferramentas MCP registradas exigem `zodSchema` em tempo de compilação e passam por `zodSchema.safeParse(...)` centralizado em `executeRegisteredTool` (`lib/core/registry.ts` + `lib/core/tool-schemas.ts`) antes de qualquer chamada externa, com limites explícitos de paginação/tamanho; `cnpj_intelligence` removeu `api_key` do schema e rejeita argumentos extras (`.strict()`). As capacidades e a allowlist agêntica (`SAFETY.md §SC-9`) estão versionadas em `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json`. O histórico de `sequentialthinking` é isolado por sessão via `ToolExecutionContext` (`lib/core/mcp-server.ts`, `lib/workers/mcp-agent.ts`, `lib/tools/core.ts` — sem singleton de módulo), usa `Map` seguro contra colisão de protótipo com tetos FIFO (`100/20/50`) e mantém logging de pensamentos desligado por padrão; logs de `search.ts` e `intelligence.ts` redigem/resumem queries, CNPJ (`***XXXX`), razão social, dorks e PII via `lib/shared/log-redaction.ts`; o dispatcher MCP (`mcp-server.ts` / `mcp-agent.ts`) aplica rate limit configurável por sessão (`MCP_TOOL_RATE_LIMIT_MAX`, default `120` chamadas/janela) inclusive em `stdio`. `readCnpjProfile` rejeita credenciais embutidas na URL do provedor, e `scripts/build-apps.mjs` bloqueia fechamentos inline `</script`/`</style` ao empacotar os MCP Apps. Exposição efetiva, controles ativos no host e conformidade ficam **a confirmar** por ambiente. Credenciais e evidências de execução ficam fora do Git.

## Fontes

- `lib/workers/auth.ts:L12-L89`
- `lib/workers/oauth.ts:L1-L47`
- `lib/adapters/cloudflare.ts:L19-L170`
- `lib/workers/mcp-agent.ts:L29-L145`
- `lib/workers/worker.ts:L156-L192`
- `lib/adapters/cli.ts:L61-L246`
- `lib/config/index.ts:L7-L218`
- `lib/adapters/smithery.ts:L14-L53`
- `lib/tools/financial.ts:L68-L103`
- `lib/core/tool-schemas.ts:L1-L272`
- `lib/core/registry.ts:L8-L101`
- `lib/core/intelligence.ts:L58-L455`
- `lib/core/search.ts:L17-L95`
- `lib/core/sequential-thinking.ts:L1-L185`
- `lib/shared/log-redaction.ts:L1-L32`
- `lib/infrastructure/rate-limiter.ts:L8-L135`
- `lib/core/mcp-server.ts:L11-L175`
- `lib/tools/core.ts:L52-L149`
- `.archagents/_capabilities.json`
- `.archagents/mcp-tool-allowlist.json`
- `lib/shared/cnpj-profile.ts:L92-L100`
- `scripts/build-apps.mjs:L30-L35`
