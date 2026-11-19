---
status: completed
run_id: RUN-20261119-174741-ephemeral-runner-supervisor
ticket: TCK-0012
design: DES-0012
start_time: 2026-11-19T17:47:41Z
end_time: 2026-11-19T18:08:35Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - .gitignore
  - infra/runner/Dockerfile
  - infra/runner/supervisor.py
  - infra/runner/test_supervisor.py
  - infra/runner/setup-network-isolation.sh
  - infra/runner/dadosbr-runner-supervisor.service
  - infra/runner/env.example
  - infra/runner/README.md
  - .archagents/06-infra-devops.md
  - .archagents/10-runbooks.md
test_result:
  status: pass
  summary: "23/23 testes unitários/negativos Python aprovados (local + VPS com -B, sem __pycache__), criteria-check 3/3 PASS (286/286 Vitest), sonda negativa live IPv4+IPv6 aprovada na VPS"
---
# RUN-20261119-174741-ephemeral-runner-supervisor - TCK-0012

## Resumo executivo

- Criado o pacote IaC/supervisor em `infra/runner/` (Python 3.12 stdlib-only, sem portas públicas, fail-closed para `ci.yml` e `release.yml`, rejeitando forks, `pull_request_target`, workflows fora da allowlist, caminhos `@` forjados, rótulos extras/case-folded, rótulos estáticos e runs obsoletos).
- Aplicada a remediação completa dos 6 achados bloqueantes e notas da verificação adversarial (Pass 1):
  1. Bloqueio total de IPv6 (`--sysctl net.ipv6.conf.{all,default}.disable_ipv6=1` no container + cadeias `ip6tables` `DROP` em `DOCKER-USER` e `INPUT` para `br-dadosbr-ci`).
  2. Proteção contra label-subset hijacking: confirmado ao vivo `approval_policy: all_external_contributors` no repositório GitHub + guarda fail-closed pré-spawn em `supervisor.py` bloqueando spawns caso qualquer run rejeitado tenha job `queued` compatível com `{"self-hosted","linux","x64"}`.
  3. Preservação de runners ativos (`claimed_ever`, `per_page=100` paginado, conferência de `busy` via API) para nunca abater jobs legítimos quando o run ultrapassa `MAX_RUN_AGE_MINUTES`.
  4. Igualdade exata case-folded de labels em `select_eligible_queued_jobs`.
  5. Limpeza sem zombies/órfãos em `BrokenPipeError` e após `SIGKILL` (`wait()` após `kill()`).
  6. Remoção de `__pycache__/`, adição de `__pycache__/` e `*.py[cod]` em `.gitignore`, execução com `python3 -B`, remoção de `GITHUB_TOKEN` do ambiente de processos filhos `docker`, `field(repr=False)`, `--memory-swap=3g`, `Dockerfile` pinado por digest SHA-256, checagem de `enable_icc=false`, recusa de `--teardown` com containers anexados e atualização sem janela aberta das regras `iptables`/`ip6tables`.
- Instalado em `/opt/dadosbr-runner/` na VPS Linux dedicada com unidade `dadosbr-runner-supervisor.service` habilitada (`ExecStartPre` validado com `ProtectKernelModules=yes`, saída limpa `78/CONFIG` aguardando gravação do Fine-Grained PAT pelo operador em `/etc/dadosbr-runner/env`).

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `python3 -B -m unittest discover -s infra/runner -p "test_*.py" -v` | 23/23 `OK` sem `__pycache__` | 23/23 `OK` (local e VPS Python 3.12.3, sem `__pycache__`) | PASS |
| `bash -n infra/runner/setup-network-isolation.sh` + hygiene scan | Exit 0, zero segredos/hostnames privados | Exit 0, limpo | PASS |
| `git diff --check && npm test` | Exit 0, 286/286 testes | 286/286 PASS (`criteria-check.py` 3/3 PASS) | PASS |
| Sonda negativa live IPv4+IPv6 no container isolado na VPS | Zero endereços IPv6 (`fe80::` ausente), `disable_ipv6=1`, bloqueio a metadata/host/bridges vizinhas, HTTPS público OK, `CapEff=0`, `NoNewPrivs=1` | Todos os alvos bloqueados + `ip6tables` ativo + HTTPS público HTTP 200; 0 containers remanescentes | PASS |

## Matriz de controles (`secure-cloud-runtime`)

| Control ID | Recurso | Implementação | Teste negativo / evidência | Risco residual | Dono |
|---|---|---|---|---|---|
| `FBI-CLOUD-01` | Supervisor + `dadosbr-runner-supervisor.service` | Polling outbound-only; zero porta pública; `cloudflare-deploy.yml` excluído; `MAX_RUN_AGE_MINUTES=30` | `test_supervisor.py` rejeita `cloudflare-deploy.yml`, labels estáticos/extras e runs antigos; `systemctl show` confirma unit habilitada | Novos workflows futuros exigem revisão da allowlist | Operador |
| `FBI-CLOUD-02` | Acesso administrativo da VPS | Zero endpoint HTTP exposto; ativação de PAT feita apenas via SSH | Sem listeners novos em `ss -tulpn`; `DADOSBR-RUNNER-IN` (IPv4 + IPv6) descarta tráfego do container ao host | Acesso SSH da VPS segue gerido pelo firewall UFW do host | Operador |
| `FBI-CLOUD-03` | Identidade GitHub do supervisor e do container | Fine-Grained PAT escopado só ao repo (`Actions:Read`, `Administration:Write`) em `/etc/dadosbr-runner/env` `0600`, removido de `os.environ` e de processos filhos; container recebe só token efêmero via `stdin`; `approval_policy: all_external_contributors` + guarda pré-spawn contra label-subset hijacking | API GitHub confirmou `approval_policy: all_external_contributors`; `test_supervisor.py` comprova rejeição de forks, `pull_request_target`, hijack por `runs-on: self-hosted` e remoção do PAT do env filho; serviço sai `78/CONFIG` sem PAT | Rotação periódica (90 dias) do Fine-Grained PAT e verificação do escopo do PAT criado sob responsabilidade do operador (**a confirmar** após criação) | Operador |
| `FBI-CLOUD-04` | Egresso IPv4 + IPv6 da rede `dadosbr-ci-isolated` (`br-dadosbr-ci`) | `DADOSBR-RUNNER-FWD` (IPv4) bloqueia `0.0.0.0/8`, loopback, RFC1918, CGNAT, link-local, multicast e `240.0.0.0/4`; `ip6tables` descarta todo IPv6 em `br-dadosbr-ci`; `enable_icc=false` | Sonda live no container bloqueada para `<host-gateway>:22/8080`, `<neighbor-docker-bridge>:<port>` e zero endereços IPv6 no container; `api.github.com` e `registry.npmjs.org` HTTP 200 | Egresso público 443 necessário para Actions/npm/Node; sem proxy L7 por domínio | Operador |
| `FBI-CLOUD-05` | Metadata cloud (`169.254.169.254`) | `DADOSBR-RUNNER-FWD` bloqueia `169.254.0.0/16` | Sonda live no container bloqueada para `169.254.169.254:80` | Baixo; revalidar após mudanças de firewall no host | Operador |
| `FBI-CLOUD-07` | Runtime do container efêmero | `Dockerfile` pinado por digest SHA-256, `uid=1001(runner)`, `--rm --ephemeral --cap-drop=ALL --security-opt=no-new-privileges:true --sysctl net.ipv6.conf.{all,default}.disable_ipv6=1 --memory=3g --memory-swap=3g --cpus=2 --pids-limit=512`, sem socket Docker nem bind mounts | Sonda live confirmou `uid=1001(runner)`, `CapEff=0000000000000000`, `NoNewPrivs=1`, `disable_ipv6=1`, zero endereços IPv6, ausência de `docker.sock`/`env` do host e `0` containers remanescentes | Container compartilha kernel Linux com o host (isolamento de VM exigiria Kata/Firecracker) | Operador |
