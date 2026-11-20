# CI, ambientes e publicação

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

O snapshot inicial continha workflows de CI, release por tag e Cloudflare com runners hospedados no GitHub. A partir da versão `0.5.0`, o CI, o deploy do Worker e a publicação npm usam runners próprios na VPS conforme detalhado abaixo. O resultado efetivo de execuções em Actions, publicação no registro npm e estado de runners ativos permanece **a confirmar** em runtime.

## Fontes

- `.github/workflows/ci.yml:L1-L142`
- `.github/workflows/release.yml:L1-L80`
- `.github/workflows/cloudflare-deploy.yml:L1-L42`
- `package.json:L82-L88`

## Gate de auditoria de dependências em produção (`TCK-0021`) & Workflow Cloudflare (`TCK-0015`)

- O job `lint` (`Code Quality`) de `.github/workflows/ci.yml:L116-L117` executa `npm audit --omit=dev --audit-level=high` após `npm ci`.
- `.github/workflows/cloudflare-deploy.yml:L27-L41` declara `permissions: { contents: read }` no nível do workflow (menor privilégio para `GITHUB_TOKEN`) e `persist-credentials: false` em `actions/checkout@v4`.
- Dependências de runtime mortas (`agents`, `@smithery/sdk`, `workers-mcp`, `async-mutex`) e o módulo obsoleto `lib/workers/mcp-agent.ts` foram removidos em `TCK-0021`; `zod` (`^4.6.7`) e `express` (`^5.3.0`) + transitivas foram saneados com `package-lock.json` validado via `npm ci`. A execução efetiva dos pipelines no GitHub Actions após essas alterações permanece **a confirmar**.
- Em `TCK-0022`, as `devDependencies` diretas vulneráveis foram atualizadas (`vitest@^4.1.12`, `@vitest/ui@^4.1.12`, `vite@^7.3.8`, `wrangler@^4.166.0`, `@cloudflare/workers-types@^5.20261120.1`) e as transitivas saneadas no `package-lock.json` via `npm install && npm audit fix` (validado com `npm ci`), alinhando `wranglerVersion: "4.166.0"` em `.github/workflows/cloudflare-deploy.yml:L71`. A execução remota do deploy Cloudflare com `wrangler@4.166.0` no GitHub Actions permanece **a confirmar**.

## Alteração preparada para o runner próprio

As definições da branch usam `self-hosted`, `linux`, `x64` e `dadosbr-ubuntu-24.04`. O CI é elegível em push para `main` e disparo manual em `main`. PRs públicos ficam sem gatilho automático nesta configuração. A publicação de desenvolvimento continua exigindo push para a `main`. Cloudflare é elegível em `main` e o workflow de release continua por tag `v*`.

A API do repositório continua retornando Actions desativado e nenhum runner registrado. O YAML fica pronto antes da ativação do ambiente.

## CI do Explorador IBGE

Actions foi habilitado depois do Bootstrap. O [primeiro CI na VPS](https://github.com/cristianoaredes/mcp-dadosbr/actions/runs/44178962531) concluiu com sucesso após adicionar `libatomic1` à imagem do runner.

O CI de `main` usa a label `dadosbr-ubuntu-24.04`. PRs originados no próprio repositório solicitam instâncias efêmeras com a label `dadosbr-pr-<run_id>`. O supervisor deve registrar as instâncias do PR com essa label e as labels padrão de Linux x64. A label de `main` também é usada pelo deploy, então fica fora das instâncias do PR. O CI de PR executa a matriz Node 22/24/26, valida os dois transportes do CLI e verifica a presença do HTML do Explorador no pacote npm.

## CI e publicação npm a partir da versão 0.5.0

O CI de PR usa `dadosbr-pr-<run_id>` e o CI de main usa `dadosbr-ci-<run_id>`. O workflow manual Publish npm release usa `dadosbr-release-<run_id>`. Ele exige ID do CI aprovado em main para o SHA idêntico ao do release, instala o tarball candidato, publica o pacote e testa a versão pública. O job opcional dev exige disparo manual com `publish_dev` e a matriz, qualidade e build Worker aprovados. O workflow separado de deploy mantém o rótulo `dadosbr-ubuntu-24.04`.

## Supervisor efêmero Docker (`infra/runner/`, `TCK-0012`)

- **Fontes adicionais:** `infra/runner/supervisor.py`, `infra/runner/setup-network-isolation.sh`, `infra/runner/dadosbr-runner-supervisor.service`, `infra/runner/Dockerfile`, `infra/runner/README.md`.
- **Modelo operacional:** serviço `systemd` de polling outbound-only (zero porta pública exposta) em VPS Linux com Docker. Atende exclusivamente `.github/workflows/ci.yml` (`main` e PRs do próprio repositório, rejeitando forks e `pull_request_target` fail-closed) e `.github/workflows/release.yml` (`workflow_dispatch` em `main`), exigindo conjunto exato de rótulos `{"self-hosted", "linux", "x64", "dadosbr-(ci|pr|release)-<run_id>"}`, janela `MAX_RUN_AGE_MINUTES=30`, pré-requisito GitHub `approval_policy: all_external_contributors` e guarda pré-spawn contra label-subset hijacking. `.github/workflows/cloudflare-deploy.yml` (`dadosbr-ubuntu-24.04`) fica fora do supervisor automático.
- **Contenção:** 1 container efêmero descartado por job (`infra/runner/Dockerfile` pinado por digest, usuário `runner`, `--rm --ephemeral --cap-drop=ALL --security-opt=no-new-privileges:true --sysctl net.ipv6.conf.{all,default}.disable_ipv6=1 --memory=3g --memory-swap=3g --cpus=2 --pids-limit=512`, sem socket Docker nem bind mounts), em rede dedicada `dadosbr-ci-isolated` (`172.30.240.0/24`, `br-dadosbr-ci`, `enable_icc=false`) com regras `iptables` + `ip6tables` (`DADOSBR-RUNNER-FWD` em `DOCKER-USER` e `DADOSBR-RUNNER-IN` em `INPUT`) bloqueando IPv6 link-local, `0.0.0.0/8`, loopback, RFC1918, CGNAT, metadata (`169.254.0.0/16`), multicast/reservado e acesso ao host.
- **Credencial:** Fine-Grained PAT restrito a `cristianoaredes/mcp-dadosbr` (`Actions: Read-only`, `Administration: Read and write`, `Metadata: Read-only`) mantido apenas em `/etc/dadosbr-runner/env` (`0600 root:root`), nunca injetado no container (o container recebe apenas o token de registro efêmero via `stdin` com `unset` imediato). Estado de ativação em runtime na VPS fica **a confirmar** após gravação do PAT pelo operador.
