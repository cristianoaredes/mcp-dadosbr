# Segurança e limites

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

O Worker define rotas públicas e autenticação no seu adapter. O CLI usa rate limit na entrada HTTP. URLs configuráveis de CNPJ e CEP passam por allowlist de hosts HTTPS (proteção SSRF em `lib/config/index.ts`), `readCnpjProfile` rejeita credenciais embutidas na URL do provedor, e `scripts/build-apps.mjs` bloqueia fechamentos inline `</script`/`</style` ao empacotar os MCP Apps. Exposição efetiva, controles ativos no host e conformidade ficam **a confirmar** por ambiente. Credenciais e evidências de execução ficam fora do Git.

## Fontes

- `lib/workers/auth.ts:L22-L58`
- `lib/adapters/cli.ts:L95-L127`
- `lib/adapters/cli.ts:L165-L205`
- `lib/config/index.ts:L15-L70`
- `lib/shared/cnpj-profile.ts:L92-L100`
- `scripts/build-apps.mjs:L30-L35`
