# CI, ambientes e publicação

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

O snapshot inicial continha workflows de CI, release por tag e Cloudflare com runners hospedados no GitHub. A partir da versão `0.5.0`, o CI, o deploy do Worker e a publicação npm usam runners próprios na VPS conforme detalhado abaixo. O resultado efetivo de execuções em Actions, publicação no registro npm e estado de runners ativos permanece **a confirmar** em runtime.

## Fontes

- `.github/workflows/ci.yml:L1-L80`
- `.github/workflows/release.yml:L1-L80`
- `.github/workflows/cloudflare-deploy.yml:L1-L32`

## Alteração preparada para o runner próprio

As definições da branch usam `self-hosted`, `linux`, `x64` e `dadosbr-ubuntu-24.04`. O CI é elegível em push para `main` e disparo manual em `main`. PRs públicos ficam sem gatilho automático nesta configuração. A publicação de desenvolvimento continua exigindo push para a `main`. Cloudflare é elegível em `main` e o workflow de release continua por tag `v*`.

A API do repositório continua retornando Actions desativado e nenhum runner registrado. O YAML fica pronto antes da ativação do ambiente.

## CI do Explorador IBGE

Actions foi habilitado depois do Bootstrap. O [primeiro CI na VPS](https://github.com/cristianoaredes/mcp-dadosbr/actions/runs/44178962531) concluiu com sucesso após adicionar `libatomic1` à imagem do runner.

O CI de `main` usa a label `dadosbr-ubuntu-24.04`. PRs originados no próprio repositório solicitam instâncias efêmeras com a label `dadosbr-pr-<run_id>`. O supervisor deve registrar as instâncias do PR com essa label e as labels padrão de Linux x64. A label de `main` também é usada pelo deploy, então fica fora das instâncias do PR. O CI de PR executa a matriz Node 22/24/26, valida os dois transportes do CLI e verifica a presença do HTML do Explorador no pacote npm.

## CI e publicação npm a partir da versão 0.5.0

O CI de PR usa `dadosbr-pr-<run_id>` e o CI de main usa `dadosbr-ci-<run_id>`. O workflow manual Publish npm release usa `dadosbr-release-<run_id>`. Ele exige ID do CI aprovado em main para o SHA idêntico ao do release, instala o tarball candidato, publica o pacote e testa a versão pública. O job opcional dev exige disparo manual com `publish_dev` e a matriz, qualidade e build Worker aprovados. O workflow separado de deploy mantém o rótulo `dadosbr-ubuntu-24.04`.
