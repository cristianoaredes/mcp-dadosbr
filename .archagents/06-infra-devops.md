# CI, ambientes e publicação

Base inicial: `037dae4c`.

O snapshot inicial contém workflows de CI, release por tag e Cloudflare. As definições usam runners hospedados no GitHub. A API retornou Actions desativado e zero runners próprios registrados na coleta. Consulte o runbook para a configuração proposta depois do Bootstrap.

## Fontes no snapshot inicial

- `.github/workflows/ci.yml:L1-L26`
- `.github/workflows/release.yml:L1-L12`
- `.github/workflows/cloudflare-deploy.yml:L1-L23`
