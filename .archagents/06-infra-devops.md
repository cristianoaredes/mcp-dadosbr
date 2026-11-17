# CI, ambientes e publicação

Base inicial: `037dae4c`.

O snapshot inicial contém workflows de CI, release por tag e Cloudflare. As definições usam runners hospedados no GitHub. A API retornou Actions desativado e zero runners próprios registrados na coleta. Consulte o runbook para a configuração proposta depois do Bootstrap.

## Fontes no snapshot inicial

- `.github/workflows/ci.yml:L1-L26`
- `.github/workflows/release.yml:L1-L12`
- `.github/workflows/cloudflare-deploy.yml:L1-L23`

## Alteração preparada para o runner próprio

As definições da branch usam `self-hosted`, `linux`, `x64` e `dadosbr-ubuntu-24.04`. O CI é elegível em push para `main` e disparo manual em `main`. PRs públicos ficam sem gatilho automático nesta configuração. A publicação de desenvolvimento continua exigindo push para a `main`. Cloudflare é elegível em `main` e o workflow de release continua por tag `v*`.

A API do repositório continua retornando Actions desativado e nenhum runner registrado. O YAML fica pronto antes da ativação do ambiente.
