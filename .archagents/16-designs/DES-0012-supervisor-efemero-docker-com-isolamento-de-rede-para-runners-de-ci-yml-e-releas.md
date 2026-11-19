---
id: DES-0012
slug: supervisor-efemero-docker-com-isolamento-de-rede-para-runners-de-ci-yml-e-releas
title: "Supervisor efêmero Docker com isolamento de rede para runners de ci.yml e release.yml"
created_at: 2026-11-19T17:45:55Z
status: approved
ticket: TCK-0012
type: design
scope_files_new:
  - infra/runner/Dockerfile
  - infra/runner/supervisor.py
  - infra/runner/test_supervisor.py
  - infra/runner/setup-network-isolation.sh
  - infra/runner/dadosbr-runner-supervisor.service
  - infra/runner/env.example
  - infra/runner/README.md
scope_files_modified:
  - .gitignore
  - .archagents/06-infra-devops.md
  - .archagents/10-runbooks.md
scope_files_deleted: []
blast_radius: medium
security_sensitive: true
playbook: .archagents/16-designs/playbooks/DES-0012-playbook.md
acceptance_delta: unchanged
---
# DES-0012 - Supervisor efêmero Docker com isolamento de rede para runners de ci.yml e release.yml

## Problema

Os workflows `.github/workflows/ci.yml` e `.github/workflows/release.yml` exigem runners `self-hosted` com rótulos dinâmicos por execução (`dadosbr-ci-<run_id>`, `dadosbr-pr-<run_id>`, `dadosbr-release-<run_id>`). Sem um supervisor dedicado na VPS, cada push/PR/release permanece em `queued` até lançamento manual. Ao mesmo tempo, como `cristianoaredes/mcp-dadosbr` é um repositório público rodando em VPS compartilhada com outros containers, um runner persistente bare-metal introduziria superfície de persistência e pivoteamento lateral.

## Solução

1. **Supervisor de polling outbound-only (`infra/runner/supervisor.py`, Python 3.12 stdlib-only):**
   - Consulta `GET /repos/cristianoaredes/mcp-dadosbr/actions/runs?status=queued` (e `in_progress` para jobs downstream como `cloudflare` e `summary`) a cada `POLL_INTERVAL_SECONDS` (padrão `15` s).
   - **Zero porta HTTP pública aberta** (elimina superfície de webhook público).
   - **Allowlist fail-closed:**
     - `repository.full_name == "cristianoaredes/mcp-dadosbr"`.
     - `workflow_path` restrito a `{".github/workflows/ci.yml", ".github/workflows/release.yml"}` (exclui `cloudflare-deploy.yml` / `dadosbr-ubuntu-24.04`).
     - Para `event == "pull_request"`: exige `head_repository.full_name == "cristianoaredes/mcp-dadosbr"` (bloqueia forks fail-closed).
     - Para `release.yml`: exige `event == "workflow_dispatch"` e `head_branch == "main"`.
     - Para `ci.yml` em `push`/`workflow_dispatch`: exige `head_branch == "main"`.
     - Janela temporal: ignora runs mais antigos que `MAX_RUN_AGE_MINUTES` (padrão `30` min) para impedir reprocessamento de runs obsoletos na fila.
     - Cada job em `queued` precisa possuir exatamente o conjunto case-insensitive `{"self-hosted", "linux", "x64", "dadosbr-(ci|pr|release)-<run_id>"}` (sem labels extras nem `dadosbr-ubuntu-24.04`).
     - Guarda pré-spawn contra label-subset hijacking: antes de lançar qualquer runner, inspeciona runs ativos rejeitados e recusa o spawn (fail-closed com alerta `CRITICAL`) se houver qualquer job `queued` cujos labels sejam subconjunto de `{"self-hosted", "linux", "x64"}`, somado ao pré-requisito `approval_policy: all_external_contributors` no GitHub.
     - Runners já reivindicados (`claimed_ever` ou `busy`) nunca são abatidos pelo reaper de ociosidade se o run ultrapassar `MAX_RUN_AGE_MINUTES`.
   - **Lançamento efêmero por job (`docker run --rm -i`):**
     - Imagem pinada por digest (`Dockerfile` com base `@sha256:...` e `RUNNER_IMAGE` pinável por digest em `/etc/dadosbr-runner/env`).
     - Controles de container: usuário não-root `runner`, `--cap-drop=ALL`, `--security-opt=no-new-privileges:true`, `--sysctl net.ipv6.conf.{all,default}.disable_ipv6=1`, `--memory=3g`, `--memory-swap=3g`, `--cpus=2`, `--pids-limit=512`, `--network=dadosbr-ci-isolated`, sem socket Docker, sem mounts do host.
     - Token de registro de uso único (`POST /actions/runners/registration-token`) entregue exclusivamente via `stdin` ao container e descartado com `unset` antes de `exec ./run.sh`. O Fine-Grained PAT (`GITHUB_TOKEN`) é removido de `os.environ` e nunca entra no ambiente de processos filhos `docker` nem no container.
     - Concorrência limitada (`MAX_CONCURRENT`, padrão `2`), timeout por container (`JOB_TIMEOUT_SECONDS`, padrão `1200` s) e faxina automática de containers órfãos, processos filhos (sem zombies) e registros offline `dadosbr-sup-*`.
2. **Isolamento de rede IPv4 + IPv6 (`infra/runner/setup-network-isolation.sh`):**
   - Cria rede Docker dedicada `dadosbr-ci-isolated` (`172.30.240.0/24`, bridge `br-dadosbr-ci`, `enable_icc=false`) verificando drift de subnet, bridge e `enable_icc`.
   - Regras `iptables` + `ip6tables` idempotentes (com guarda fail-closed durante atualização e `--teardown` recusado se houver containers anexados) escopadas exclusivamente a `br-dadosbr-ci`:
     - IPv4 `INPUT` (`DADOSBR-RUNNER-IN`): permite apenas `ESTABLISHED,RELATED` e descarta conexões do runner ao host.
     - IPv4 `DOCKER-USER` (`DADOSBR-RUNNER-FWD`): permite retorno `ESTABLISHED,RELATED` e bloqueia `0.0.0.0/8`, loopback (`127.0.0.0/8`), RFC1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), CGNAT (`100.64.0.0/10`), link-local/metadata (`169.254.0.0/16`), multicast (`224.0.0.0/4`) e reservado (`240.0.0.0/4`).
     - IPv6 `INPUT` + `DOCKER-USER`: `DROP` total em `br-dadosbr-ci` (bloqueia `fe80::/64` link-local contra sockets dual-stack do host como `[::]:22`).
3. **Unidade systemd endurecida (`infra/runner/dadosbr-runner-supervisor.service`):**
   - `EnvironmentFile=/etc/dadosbr-runner/env` (`0600 root:root`), `ExecStart=/usr/bin/python3 -B /opt/dadosbr-runner/supervisor.py`, `TimeoutStopSec=60`, `KillMode=mixed`, `ReadWritePaths=-/run/xtables.lock`, `ProtectHome=yes`, `ProtectSystem=strict`, `PrivateTmp=yes`, `ProtectKernelTunables=yes`, `ProtectKernelModules=yes`, `ProtectControlGroups=yes`, `RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6 AF_NETLINK`, `NoNewPrivileges=yes`, `RestartPreventExitStatus=78`.
   - Credencial de mínimo privilégio: Fine-Grained PAT criado pelo operador escopado exclusivamente a `cristianoaredes/mcp-dadosbr` (`Actions: Read`, `Administration: Read & write`, `Metadata: Read`), gravado diretamente na VPS sem transitar em chat ou Git.

## Threat Model (`SAFETY.md` SC-3 & `secure-cloud-runtime`)

| Ameaça | Controle (`FBI-CLOUD-*`) | Mitigação | Teste negativo |
|---|---|---|---|
| PR malicioso de fork tentando executar código na VPS | `FBI-CLOUD-03` | Bloqueio duplo: `if:` no `ci.yml` + política fail-closed no supervisor rejeitando qualquer `head_repository.full_name != REPO` ou ausente | `test_supervisor.py`: PR de fork / `head_repository=None` rejeitado com 0 containers lançados |
| Exfiltração do PAT ou credenciais do host pelo job | `FBI-CLOUD-03`, `FBI-CLOUD-07` | PAT permanece apenas no processo supervisor (`/etc/dadosbr-runner/env` `0600`); container recebe só token efêmero de registro via `stdin` (nunca `argv`/env), sem mounts nem Docker socket | `test_supervisor.py` verifica ausência de PAT e token em `argv`/env + teste live no container sem `/var/run/docker.sock` e `CapEff=0` |
| Pivoteamento lateral para outros containers, host ou metadata cloud | `FBI-CLOUD-04`, `FBI-CLOUD-05`, `FBI-CLOUD-07` | Rede dedicada `br-dadosbr-ci` (`enable_icc=false`) + regras `DOCKER-USER` e `INPUT` bloqueando RFC1918, metadata `169.254.169.254`, gateway do host e outras bridges Docker | Teste negativo live no container na VPS provando bloqueio para `169.254.169.254`, gateway `:22`/`:8080` e subnet Docker vizinha, mantendo HTTPS para GitHub/npm |
| Execução não autorizada de deploy ou runs antigos da fila | `FBI-CLOUD-01`, `FBI-CLOUD-03` | Allowlist de workflows (`ci.yml`, `release.yml`), regex estrito de label `dadosbr-(ci|pr|release)-<run_id>` e janela `MAX_RUN_AGE_MINUTES=30` | `test_supervisor.py`: `cloudflare-deploy.yml`, label `dadosbr-ubuntu-24.04`, `run_id` divergente e runs antigos rejeitados |
| Exaustão de CPU/RAM/PIDs ou vazamento de containers/runners | `FBI-CLOUD-07` | Limites `--memory=3g --cpus=2 --pids-limit=512`, `MAX_CONCURRENT=2`, `JOB_TIMEOUT_SECONDS=1200`, limpeza automática de containers e runners offline | `test_supervisor.py` valida limite de concorrência + verificação live na VPS |

## Mudanças

- Novos arquivos em `infra/runner/`: `Dockerfile`, `supervisor.py`, `test_supervisor.py`, `setup-network-isolation.sh`, `dadosbr-runner-supervisor.service`, `env.example`, `README.md`.
- Documentação atualizada em `.archagents/06-infra-devops.md` e `.archagents/10-runbooks.md`.
- Instalação operacional na VPS Linux dedicada (fora do Git: `/opt/dadosbr-runner/`, `/etc/dadosbr-runner/env`, unidade systemd ativa/pronta aguardando Fine-Grained PAT).

## Critérios de sucesso

- [ ] `python3 -m unittest discover -s infra/runner -p "test_*.py" -v` passa 100% (`OK`).
- [ ] `bash -n infra/runner/setup-network-isolation.sh` e varredura de higiene/segredos sem achados.
- [ ] `git diff --check && npm test` (286/286) passam sem regressão.
- [ ] Testes negativos reais de contenção de rede/container aprovados na VPS (`169.254.169.254`, host gateway e rede Docker vizinha bloqueados; DNS/HTTPS públicos operacionais).
- [ ] Verificação adversarial independente (`VER-*`) aprovada em contexto fresco.
