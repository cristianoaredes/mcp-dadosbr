# Segurança e limites

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

O Worker define rotas públicas explícitas (`PUBLIC_PATHS`: `/health`, `/`, `/openapi.json`, `/.well-known/*`) e exige `MCP_API_KEY` com comparação constant-time em `/mcp`, `/sse` e rotas REST quando configurada, mantendo `/oauth/*` e descoberta OAuth desabilitados em modo fail-closed (`501 oauth_not_supported`) e aplicando CORS restritivo via `MCP_ALLOWED_ORIGINS` (sem `*` em rotas autenticadas). O CLI usa rate limit na entrada HTTP. URLs configuráveis de CNPJ e CEP passam por allowlist de hosts HTTPS e normalização (`validateAndNormalizeApiConfig`), tanto em `loadApiConfiguration()` quanto em `resolveApiConfig(overrides)` e no adaptador Smithery (`configSchema` / `createServer`), restringindo loopback (`localhost`, `127.0.0.1` exatos via HTTP/HTTPS) exclusivamente a `NODE_ENV` `development`/`test` (fail-closed quando ausente ou `production`), rejeitando credenciais embutidas (`username`/`password`) e sanitizando URLs em logs/erros. A tool `fipe_veiculos` valida `tipo` contra `ALLOWED_FIPE_TYPES` e `codigo_fipe` contra regex estrito antes de chamar `httpJson`. `readCnpjProfile` rejeita credenciais embutidas na URL do provedor, e `scripts/build-apps.mjs` bloqueia fechamentos inline `</script`/`</style` ao empacotar os MCP Apps. Exposição efetiva, controles ativos no host e conformidade ficam **a confirmar** por ambiente. Credenciais e evidências de execução ficam fora do Git.

## Fontes

- `lib/workers/auth.ts:L12-L89`
- `lib/workers/oauth.ts:L1-L47`
- `lib/adapters/cloudflare.ts:L19-L130`
- `lib/workers/worker.ts:L156-L192`
- `lib/adapters/cli.ts:L95-L127`
- `lib/adapters/cli.ts:L165-L205`
- `lib/config/index.ts:L7-L218`
- `lib/adapters/smithery.ts:L14-L53`
- `lib/tools/financial.ts:L68-L101`
- `lib/shared/cnpj-profile.ts:L92-L100`
- `scripts/build-apps.mjs:L30-L35`
