# Segurança e limites

Base inicial: `037dae4c`.

O Worker define rotas públicas e autenticação no seu adapter. O CLI usa rate limit na entrada HTTP. Exposição efetiva, controles ativos no host e conformidade ficam a confirmar por ambiente. Credenciais e evidências de execução ficam fora do Git.

## Fontes no snapshot inicial

- `lib/workers/auth.ts:L22-L58`
- `lib/adapters/cli.ts:L95-L127`
- `lib/adapters/cli.ts:L165-L205`
