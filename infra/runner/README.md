# Ephemeral Docker Runner Supervisor (`mcp-dadosbr`)

Outbound-only polling supervisor that provisions one hardened, disposable Docker container per GitHub Actions job for `cristianoaredes/mcp-dadosbr`.

## Mandatory GitHub Repository Prerequisite (Public Repo)

Because this is a **public** repository and GitHub Actions runners register default labels (`self-hosted`, `Linux`, `X64`) alongside the per-run label, keep the repository setting enabled:

- **Settings → Actions → General → Fork pull request workflows from outside collaborators:**
  **Require approval for all outside collaborators** (`approval_policy: all_external_contributors`).

As defense-in-depth, `supervisor.py` also performs a fail-closed pre-spawn check and refuses to spawn any runner if any rejected active run has a queued job whose labels are a subset of `{"self-hosted", "linux", "x64"}`.

## Scope & Security Model

- **Zero public inbound ports:** polls GitHub REST API over HTTPS (`POLL_INTERVAL_SECONDS=15`).
- **Fail-closed workflow allowlist:**
  - `.github/workflows/ci.yml`: `main` (`push`, `workflow_dispatch`) and same-repository `pull_request` only — **fork PRs and `pull_request_target` are always rejected**.
  - `.github/workflows/release.yml`: `main` (`workflow_dispatch`) only.
  - `.github/workflows/cloudflare-deploy.yml` and static labels (`dadosbr-ubuntu-24.04`) are **excluded**.
  - Only runs created within `MAX_RUN_AGE_MINUTES` (default `30`) with exact case-folded job label set `{"self-hosted", "linux", "x64", "dadosbr-(ci|pr|release)-<run_id>"}` are spawned. Already-claimed active runners are never killed if a run ages past `MAX_RUN_AGE_MINUTES`.
- **Per-job container containment:**
  - Non-root `runner` user (`Dockerfile` pinned by upstream SHA-256 digest; pin `RUNNER_IMAGE` by digest in `/etc/dadosbr-runner/env`).
  - `--rm --ephemeral --cap-drop=ALL --security-opt=no-new-privileges:true --memory=3g --memory-swap=3g --cpus=2 --pids-limit=512`.
  - IPv6 disabled inside the container (`net.ipv6.conf.{all,default}.disable_ipv6=1`).
  - No host bind mounts and no Docker socket inside runner containers.
  - Fine-grained PAT stays only in supervisor memory (stripped from `os.environ` and child `docker` CLI environments); containers receive a single-use registration token via `stdin` that is `unset` before `./run.sh`.
- **Network containment (`setup-network-isolation.sh`):**
  - Dedicated bridge `br-dadosbr-ci` (`dadosbr-ci-isolated`, `172.30.240.0/24`, `enable_icc=false`).
  - IPv4 `DOCKER-USER` (`DADOSBR-RUNNER-FWD`) drops container egress to `0.0.0.0/8`, loopback, RFC1918, CGNAT, link-local/cloud metadata (`169.254.0.0/16`), multicast, and reserved (`240.0.0.0/4`).
  - IPv4 `INPUT` (`DADOSBR-RUNNER-IN`) drops runner-to-host connections (SSH, local services).
  - IPv6 `ip6tables` drops all `INPUT` and `DOCKER-USER` traffic on `br-dadosbr-ci` (blocks `fe80::/64` link-local access to dual-stack host sockets such as `[::]:22`).
  - Teardown refuses to remove firewall rules while any container remains attached to `dadosbr-ci-isolated`.

## Installation on a Linux Docker Host

1. Build the runner image:
   ```bash
   docker build -t dadosbr-runner:2.338.2 infra/runner
   ```
2. Install supervisor files under `/opt/dadosbr-runner`:
   ```bash
   install -d -m 0755 /opt/dadosbr-runner /etc/dadosbr-runner
   install -m 0755 infra/runner/supervisor.py /opt/dadosbr-runner/supervisor.py
   install -m 0755 infra/runner/setup-network-isolation.sh /opt/dadosbr-runner/setup-network-isolation.sh
   install -m 0644 infra/runner/dadosbr-runner-supervisor.service /etc/systemd/system/dadosbr-runner-supervisor.service
   ```
3. Create a least-privilege **Fine-Grained PAT** at `https://github.com/settings/personal-access-tokens/new`:
   - **Repository access:** Only select repositories → `cristianoaredes/mcp-dadosbr`
   - **Repository permissions:** `Actions: Read-only`, `Administration: Read and write`, `Metadata: Read-only`
   - **Expiration:** 90 days (rotate before expiry)
4. Write `/etc/dadosbr-runner/env` (`0600 root:root`, see `env.example`) and start the service:
   ```bash
   systemctl daemon-reload
   systemctl enable --now dadosbr-runner-supervisor.service
   systemctl status dadosbr-runner-supervisor.service
   journalctl -u dadosbr-runner-supervisor.service -f
   ```

## Teardown / Rollback

```bash
systemctl disable --now dadosbr-runner-supervisor.service
/opt/dadosbr-runner/setup-network-isolation.sh --teardown
```

## Local Verification

```bash
python3 -B -m unittest discover -s infra/runner -p "test_*.py" -v
bash -n infra/runner/setup-network-isolation.sh
```
