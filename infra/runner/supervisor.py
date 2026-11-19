#!/usr/bin/env python3
"""Ephemeral Docker GitHub Actions runner supervisor for cristianoaredes/mcp-dadosbr.

Security model:
- Outbound-only HTTPS polling against GitHub REST API (zero public inbound ports).
- Fail-closed workflow/branch/fork/label policy:
  - Only allows .github/workflows/ci.yml (main push/dispatch, same-repo PRs)
    and .github/workflows/release.yml (main workflow_dispatch).
  - Never runs fork PRs or cloudflare-deploy.yml / static labels.
  - Enforces exact case-folded per-run label set:
    {"self-hosted", "linux", "x64", "dadosbr-(ci|pr|release)-<run_id>"}.
  - Pre-spawn label-subset hijack guard: refuses to spawn if any rejected active
    run has a queued job whose labels are a subset of {"self-hosted","linux","x64"}.
  - Ignores runs older than MAX_RUN_AGE_MINUTES for spawning while never killing
    already-claimed active runners.
- Fine-grained PAT (GITHUB_TOKEN) stays strictly in supervisor memory, is omitted
  from child `docker` CLI process environments, and is never passed to containers.
  Only short-lived single-use registration tokens are piped over stdin and
  immediately unset inside the ephemeral container.
"""

from __future__ import annotations

import dataclasses
import datetime as dt
import json
import logging
import os
import re
import secrets
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Iterable

EXIT_CONFIG_ERROR = 78  # sysexits EX_CONFIG (pairs with RestartPreventExitStatus=78)

ALLOWED_WORKFLOWS = frozenset({
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
})
DEFAULT_RUNNER_LABELS = frozenset({"self-hosted", "linux", "x64"})
CHILD_ENV_ALLOWLIST = (
    "PATH",
    "HOME",
    "DOCKER_HOST",
    "DOCKER_CERT_PATH",
    "DOCKER_TLS_VERIFY",
    "DOCKER_CONFIG",
)

REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
LABEL_RE = re.compile(r"^dadosbr-(ci|pr|release)-([0-9]+)$")
RUNNER_PREFIX = "dadosbr-sup-"
RUNNER_NAME_RE = re.compile(r"^dadosbr-sup-[0-9]+-[0-9a-f]{8}$")
IMAGE_RE = re.compile(r"^[A-Za-z0-9._:/@-]+$")
NETWORK_RE = re.compile(r"^[A-Za-z0-9_.-]+$")
MEM_RE = re.compile(r"^[0-9]+[kmgKMG]$")
CPU_RE = re.compile(r"^[0-9]+(\.[0-9]+)?$")

CONTAINER_ENTRYPOINT = (
    "IFS= read -r T\n"
    "./config.sh --unattended --ephemeral --disableupdate --replace "
    '--url "$RUNNER_REPO_URL" '
    '--token "$T" '
    '--name "$RUNNER_NAME" '
    '--labels "$RUNNER_LABEL" >/dev/null\n'
    "unset T\n"
    "exec ./run.sh\n"
)


@dataclasses.dataclass(frozen=True)
class Config:
    github_token: str = dataclasses.field(repr=False)
    repo: str = "cristianoaredes/mcp-dadosbr"
    github_api_url: str = "https://api.github.com"
    runner_image: str = "dadosbr-runner:2.338.2"
    docker_network: str = "dadosbr-ci-isolated"
    poll_interval_seconds: int = 15
    max_concurrent: int = 2
    max_run_age_minutes: int = 30
    job_timeout_seconds: int = 1200
    idle_grace_seconds: int = 60
    container_memory: str = "3g"
    container_cpus: str = "2"
    container_pids_limit: int = 512

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Config":
        src = os.environ if env is None else env
        token = (src.get("GITHUB_TOKEN") or "").strip()
        if not token or token.upper().startswith("CHANGE_ME"):
            raise ValueError(
                "GITHUB_TOKEN is missing or placeholder. Set a fine-grained PAT "
                "scoped to the repository with Actions:Read and Administration:Write."
            )

        repo = (src.get("GITHUB_REPO") or "cristianoaredes/mcp-dadosbr").strip()
        if not REPO_RE.fullmatch(repo):
            raise ValueError(f"Invalid GITHUB_REPO: {repo!r}")

        api_url = (src.get("GITHUB_API_URL") or "https://api.github.com").strip().rstrip("/")
        if not api_url.startswith("https://"):
            raise ValueError("GITHUB_API_URL must use https://")

        image = (src.get("RUNNER_IMAGE") or "dadosbr-runner:2.338.2").strip()
        if not IMAGE_RE.fullmatch(image):
            raise ValueError(f"Invalid RUNNER_IMAGE: {image!r}")

        network = (src.get("DOCKER_NETWORK") or "dadosbr-ci-isolated").strip()
        if not NETWORK_RE.fullmatch(network):
            raise ValueError(f"Invalid DOCKER_NETWORK: {network!r}")

        poll_interval = max(5, int(src.get("POLL_INTERVAL_SECONDS", "15")))
        max_concurrent = max(1, min(4, int(src.get("MAX_CONCURRENT", "2"))))
        max_run_age = max(1, int(src.get("MAX_RUN_AGE_MINUTES", "30")))
        job_timeout = max(60, int(src.get("JOB_TIMEOUT_SECONDS", "1200")))
        idle_grace = max(30, int(src.get("IDLE_GRACE_SECONDS", "60")))

        memory = (src.get("CONTAINER_MEMORY") or "3g").strip()
        if not MEM_RE.fullmatch(memory):
            raise ValueError(f"Invalid CONTAINER_MEMORY: {memory!r}")

        cpus = (src.get("CONTAINER_CPUS") or "2").strip()
        if not CPU_RE.fullmatch(cpus):
            raise ValueError(f"Invalid CONTAINER_CPUS: {cpus!r}")

        pids_limit = max(64, int(src.get("CONTAINER_PIDS_LIMIT", "512")))

        return cls(
            github_token=token,
            repo=repo,
            github_api_url=api_url,
            runner_image=image,
            docker_network=network,
            poll_interval_seconds=poll_interval,
            max_concurrent=max_concurrent,
            max_run_age_minutes=max_run_age,
            job_timeout_seconds=job_timeout,
            idle_grace_seconds=idle_grace,
            container_memory=memory,
            container_cpus=cpus,
            container_pids_limit=pids_limit,
        )


@dataclasses.dataclass
class ManagedRunner:
    runner_name: str
    run_id: int
    label: str
    started_monotonic: float
    process: subprocess.Popen[bytes]
    claimed_ever: bool = False


def build_child_env(source_env: dict[str, str] | None = None) -> dict[str, str]:
    """Return a minimal environment for child `docker` CLI processes (never includes PAT)."""
    src = os.environ if source_env is None else source_env
    env = {k: src[k] for k in CHILD_ENV_ALLOWLIST if k in src}
    env.setdefault("PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin")
    return env


def parse_iso_utc(raw: Any) -> dt.datetime | None:
    if not isinstance(raw, str) or not raw:
        return None
    normalized = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
    try:
        parsed = dt.datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(dt.timezone.utc)


def _normalize_workflow_path(raw_path: Any) -> str | None:
    if not isinstance(raw_path, str):
        return None
    if raw_path in ALLOWED_WORKFLOWS:
        return raw_path
    if "@" in raw_path:
        base, ref = raw_path.split("@", 1)
        if base in ALLOWED_WORKFLOWS and ref == "refs/heads/main":
            return base
    return None


def evaluate_run_policy(
    run: dict[str, Any],
    *,
    repo: str,
    now: dt.datetime,
    max_age_minutes: int,
) -> tuple[str | None, str]:
    """Return (expected_label, reason). Fail-closed: None means reject."""
    if not isinstance(run, dict):
        return None, "malformed run object"

    run_id = run.get("id")
    if not isinstance(run_id, int) or isinstance(run_id, bool) or run_id <= 0:
        return None, "invalid run id"

    repo_obj = run.get("repository")
    run_repo = repo_obj.get("full_name") if isinstance(repo_obj, dict) else None
    if run_repo != repo:
        return None, f"repository mismatch ({run_repo!r})"

    workflow_path = _normalize_workflow_path(run.get("path"))
    if workflow_path is None:
        return None, f"workflow not allowlisted ({run.get('path')!r})"

    created_at = parse_iso_utc(run.get("created_at"))
    if created_at is None:
        return None, "missing or invalid created_at"
    age = now - created_at
    if age > dt.timedelta(minutes=max_age_minutes):
        return None, f"run older than {max_age_minutes}m ({int(age.total_seconds())}s)"
    if age < dt.timedelta(minutes=-5):
        return None, "run created_at too far in the future"

    event = run.get("event")
    head_branch = run.get("head_branch")

    if workflow_path == ".github/workflows/release.yml":
        if event != "workflow_dispatch" or head_branch != "main":
            return None, f"release requires main workflow_dispatch (got {event!r} on {head_branch!r})"
        prefix = "dadosbr-release-"
    else:  # .github/workflows/ci.yml
        if event == "pull_request":
            head_repo = run.get("head_repository")
            head_full_name = head_repo.get("full_name") if isinstance(head_repo, dict) else None
            if head_full_name != repo:
                return None, f"fork pull_request rejected (head_repository={head_full_name!r})"
            prefix = "dadosbr-pr-"
        elif event in {"push", "workflow_dispatch"}:
            if head_branch != "main":
                return None, f"ci {event} requires main branch (got {head_branch!r})"
            prefix = "dadosbr-ci-"
        else:
            return None, f"unsupported ci event ({event!r})"

    expected_label = f"{prefix}{run_id}"
    match = LABEL_RE.fullmatch(expected_label)
    if not match or match.group(2) != str(run_id):
        return None, f"invalid derived label ({expected_label!r})"

    return expected_label, "ok"


def select_eligible_queued_jobs(
    jobs: Iterable[dict[str, Any]],
    expected_label: str,
) -> list[dict[str, Any]]:
    """Filter queued jobs whose case-folded label set equals exactly {self-hosted,linux,x64,expected_label}."""
    expected_set = DEFAULT_RUNNER_LABELS | {expected_label.lower()}
    eligible: list[dict[str, Any]] = []
    for job in jobs:
        if not isinstance(job, dict) or job.get("status") != "queued":
            continue
        raw_labels = job.get("labels")
        if not isinstance(raw_labels, list) or not all(isinstance(x, str) for x in raw_labels):
            continue
        folded = {lbl.lower() for lbl in raw_labels}
        if folded != expected_set:
            continue
        eligible.append(job)
    return eligible


def find_hijackable_queued_jobs(jobs: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Detect queued jobs that could hijack a runner via default-label subset matching."""
    hijackable: list[dict[str, Any]] = []
    for job in jobs:
        if not isinstance(job, dict) or job.get("status") != "queued":
            continue
        raw_labels = job.get("labels")
        if not isinstance(raw_labels, list) or not all(isinstance(x, str) for x in raw_labels):
            continue
        folded = {lbl.lower() for lbl in raw_labels if lbl}
        if folded and folded <= DEFAULT_RUNNER_LABELS:
            hijackable.append(job)
    return hijackable


def compute_spawn_count(
    *,
    queued_count: int,
    expected_label: str,
    claimed_runner_names: set[str],
    active_runners: Iterable[ManagedRunner],
    max_concurrent: int,
) -> int:
    """Compute how many new ephemeral runners to launch without over-spawning."""
    active_list = list(active_runners)
    slots = max(0, max_concurrent - len(active_list))
    if slots == 0 or queued_count <= 0:
        return 0
    pending_for_label = sum(
        1
        for r in active_list
        if r.label == expected_label
        and not r.claimed_ever
        and r.runner_name not in claimed_runner_names
    )
    needed = max(0, queued_count - pending_for_label)
    return min(needed, slots)


def build_docker_run_args(
    config: Config,
    *,
    runner_name: str,
    run_id: int,
    label: str,
) -> list[str]:
    """Construct hardened `docker run` argv without any secrets or host mounts."""
    if not LABEL_RE.fullmatch(label):
        raise ValueError(f"Refusing unsafe runner label: {label!r}")
    if not RUNNER_NAME_RE.fullmatch(runner_name):
        raise ValueError(f"Refusing unexpected runner name: {runner_name!r}")

    repo_url = f"https://github.com/{config.repo}"
    return [
        "docker",
        "run",
        "--rm",
        "-i",
        "--name",
        runner_name,
        "--label",
        "dadosbr.managed=supervisor",
        "--label",
        f"dadosbr.run={run_id}",
        "--label",
        f"dadosbr.runner={runner_name}",
        "--network",
        config.docker_network,
        "--sysctl",
        "net.ipv6.conf.all.disable_ipv6=1",
        "--sysctl",
        "net.ipv6.conf.default.disable_ipv6=1",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true",
        f"--memory={config.container_memory}",
        f"--memory-swap={config.container_memory}",
        f"--cpus={config.container_cpus}",
        f"--pids-limit={config.container_pids_limit}",
        "-e",
        f"RUNNER_REPO_URL={repo_url}",
        "-e",
        f"RUNNER_NAME={runner_name}",
        "-e",
        f"RUNNER_LABEL={label}",
        config.runner_image,
        "bash",
        "-euo",
        "pipefail",
        "-c",
        CONTAINER_ENTRYPOINT,
    ]


class GitHubClient:
    def __init__(self, config: Config, timeout: int = 15) -> None:
        self._config = config
        self._timeout = timeout

    def _request(self, method: str, path: str) -> Any:
        url = f"{self._config.github_api_url}{path}"
        req = urllib.request.Request(
            url,
            method=method,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self._config.github_token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "dadosbr-runner-supervisor/1.0",
            },
        )
        with urllib.request.urlopen(req, timeout=self._timeout) as resp:
            if resp.status == 204:
                return None
            body = resp.read()
            return json.loads(body.decode("utf-8")) if body else None

    def list_active_runs(self, max_pages: int = 5) -> list[dict[str, Any]]:
        seen: dict[int, dict[str, Any]] = {}
        for status in ("queued", "in_progress"):
            for page in range(1, max_pages + 1):
                query = urllib.parse.urlencode({"status": status, "per_page": 100, "page": page})
                data = self._request("GET", f"/repos/{self._config.repo}/actions/runs?{query}")
                batch = (data or {}).get("workflow_runs") or []
                for run in batch:
                    run_id = run.get("id")
                    if isinstance(run_id, int):
                        seen[run_id] = run
                if len(batch) < 100:
                    break
        return sorted(seen.values(), key=lambda r: int(r.get("id", 0)))

    def list_run_jobs(self, run_id: int) -> list[dict[str, Any]]:
        data = self._request(
            "GET",
            f"/repos/{self._config.repo}/actions/runs/{run_id}/jobs?per_page=100",
        )
        return list((data or {}).get("jobs") or [])

    def create_registration_token(self) -> str:
        data = self._request(
            "POST",
            f"/repos/{self._config.repo}/actions/runners/registration-token",
        )
        token = (data or {}).get("token")
        if not isinstance(token, str) or not token:
            raise RuntimeError("GitHub API returned empty registration token")
        return token

    def list_runners(self) -> list[dict[str, Any]]:
        data = self._request("GET", f"/repos/{self._config.repo}/actions/runners?per_page=100")
        return list((data or {}).get("runners") or [])

    def delete_runner(self, runner_id: int) -> None:
        self._request("DELETE", f"/repos/{self._config.repo}/actions/runners/{runner_id}")


class Supervisor:
    def __init__(
        self,
        config: Config,
        gh: GitHubClient,
        *,
        popen_fn: Callable[..., subprocess.Popen[bytes]] = subprocess.Popen,
        docker_cmd_fn: Callable[[list[str]], subprocess.CompletedProcess[str]] | None = None,
        now_fn: Callable[[], dt.datetime] = lambda: dt.datetime.now(dt.timezone.utc),
        monotonic_fn: Callable[[], float] = time.monotonic,
    ) -> None:
        self.config = config
        self.gh = gh
        self._popen = popen_fn
        self._docker_cmd = docker_cmd_fn or self._default_docker_cmd
        self._now = now_fn
        self._monotonic = monotonic_fn
        self.active: dict[str, ManagedRunner] = {}
        self.stop_requested = False

    @staticmethod
    def _default_docker_cmd(args: list[str]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
            env=build_child_env(),
        )

    def _force_remove_container(self, container_name: str) -> None:
        self._docker_cmd(["docker", "rm", "-f", container_name])

    def _terminate_managed(self, name: str, managed: ManagedRunner) -> None:
        self._force_remove_container(name)
        try:
            managed.process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            managed.process.kill()
            try:
                managed.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logging.error("Process for runner %s did not exit after SIGKILL", name)

    def cleanup_orphaned_containers(self) -> None:
        res = self._docker_cmd([
            "docker",
            "ps",
            "-aq",
            "--filter",
            "label=dadosbr.managed=supervisor",
        ])
        for cid in (res.stdout or "").split():
            if cid:
                logging.warning("Removing leftover managed container %s", cid)
                self._docker_cmd(["docker", "rm", "-f", cid])

    def cleanup_stale_github_runners(self) -> None:
        try:
            runners = self.gh.list_runners()
        except Exception as exc:
            logging.warning("Could not list GitHub runners for cleanup: %s", exc)
            return
        for runner in runners:
            name = runner.get("name") or ""
            rid = runner.get("id")
            if not name.startswith(RUNNER_PREFIX) or not isinstance(rid, int):
                continue
            if name in self.active:
                continue
            if runner.get("busy") is True:
                continue
            try:
                self.gh.delete_runner(rid)
                logging.info("Deleted stale GitHub runner %s (id=%d)", name, rid)
            except Exception as exc:
                logging.warning("Failed to delete stale runner %s (id=%d): %s", name, rid, exc)

    def reap_finished(self) -> None:
        now_mono = self._monotonic()
        forced = False
        for name in list(self.active.keys()):
            managed = self.active[name]
            rc = managed.process.poll()
            if rc is not None:
                logging.info(
                    "Ephemeral runner %s exited (rc=%s, run=%d)",
                    name,
                    rc,
                    managed.run_id,
                )
                self.active.pop(name, None)
                continue
            elapsed = now_mono - managed.started_monotonic
            if elapsed > self.config.job_timeout_seconds:
                logging.warning(
                    "Runner %s exceeded job timeout (%ds); force removing",
                    name,
                    self.config.job_timeout_seconds,
                )
                self._terminate_managed(name, managed)
                self.active.pop(name, None)
                forced = True
        if forced:
            self.cleanup_stale_github_runners()

    def spawn_runner(self, run_id: int, label: str) -> ManagedRunner:
        runner_name = f"{RUNNER_PREFIX}{run_id}-{secrets.token_hex(4)}"
        argv = build_docker_run_args(
            self.config,
            runner_name=runner_name,
            run_id=run_id,
            label=label,
        )
        reg_token = self.gh.create_registration_token()
        proc: subprocess.Popen[bytes] | None = None
        try:
            proc = self._popen(
                argv,
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=build_child_env(),
            )
            if proc.stdin is None:
                raise RuntimeError("docker subprocess opened without stdin pipe")
            proc.stdin.write(f"{reg_token}\n".encode("utf-8"))
            proc.stdin.flush()
            proc.stdin.close()
        except Exception:
            if proc is not None:
                if proc.stdin is not None:
                    try:
                        proc.stdin.close()
                    except Exception:
                        pass
                self._force_remove_container(runner_name)
                try:
                    proc.kill()
                except Exception:
                    pass
                try:
                    proc.wait(timeout=5)
                except Exception:
                    pass
            raise
        finally:
            reg_token = ""

        managed = ManagedRunner(
            runner_name=runner_name,
            run_id=run_id,
            label=label,
            started_monotonic=self._monotonic(),
            process=proc,
        )
        self.active[runner_name] = managed
        logging.info("Spawned ephemeral runner %s for run=%d label=%s", runner_name, run_id, label)
        return managed

    def _has_hijackable_rejected_runs(self, rejected_runs: list[dict[str, Any]]) -> bool:
        """Fail closed if any rejected active run has a queued job matching default labels."""
        for run in rejected_runs:
            run_id = run.get("id")
            if not isinstance(run_id, int) or isinstance(run_id, bool) or run_id <= 0:
                continue
            try:
                jobs = self.gh.list_run_jobs(run_id)
            except Exception as exc:
                logging.error(
                    "Fail-closed: could not inspect rejected run %d for label-subset hijack: %s",
                    run_id,
                    exc,
                )
                return True
            hijackable = find_hijackable_queued_jobs(jobs)
            if hijackable:
                logging.critical(
                    "SECURITY ALERT: rejected run %d (path=%r, event=%r) has %d queued job(s) "
                    "matching default self-hosted labels; refusing to spawn any runner until cleared.",
                    run_id,
                    run.get("path"),
                    run.get("event"),
                    len(hijackable),
                )
                return True
        return False

    def _record_claimed_runners(self, run_id: int, jobs: list[dict[str, Any]]) -> set[str]:
        claimed_in_progress: set[str] = set()
        seen_assigned: set[str] = set()
        for job in jobs:
            if not isinstance(job, dict):
                continue
            rname = job.get("runner_name")
            if not isinstance(rname, str) or not rname:
                continue
            status = job.get("status")
            if status in {"in_progress", "completed"}:
                seen_assigned.add(rname)
            if status == "in_progress":
                claimed_in_progress.add(rname)
        for managed in self.active.values():
            if managed.run_id == run_id and managed.runner_name in seen_assigned:
                managed.claimed_ever = True
        return claimed_in_progress

    def poll_once(self) -> int:
        self.reap_finished()
        runs = self.gh.list_active_runs()
        now = self._now()

        eligible_runs: list[tuple[int, str]] = []
        rejected_runs: list[dict[str, Any]] = []
        for run in runs:
            expected_label, reason = evaluate_run_policy(
                run,
                repo=self.config.repo,
                now=now,
                max_age_minutes=self.config.max_run_age_minutes,
            )
            run_id = run.get("id")
            if expected_label is None or not isinstance(run_id, int):
                logging.debug("Skipping run %s: %s", run_id, reason)
                rejected_runs.append(run)
                continue
            eligible_runs.append((run_id, expected_label))

        eligible_run_ids = {rid for rid, _ in eligible_runs}
        claimed_by_run: dict[int, set[str]] = {}
        queued_by_run: dict[int, int] = {}
        planned_spawns: list[tuple[int, str, int]] = []
        inspected_runs: set[int] = set()

        for run_id, expected_label in eligible_runs:
            jobs = self.gh.list_run_jobs(run_id)
            inspected_runs.add(run_id)
            claimed = self._record_claimed_runners(run_id, jobs)
            queued_jobs = select_eligible_queued_jobs(jobs, expected_label)
            claimed_by_run[run_id] = claimed
            queued_by_run[run_id] = len(queued_jobs)
            if queued_jobs:
                planned_spawns.append((run_id, expected_label, len(queued_jobs)))

        # Still inspect runs for already-active managed runners even if run aged past max_run_age_minutes
        for managed in list(self.active.values()):
            if managed.run_id not in inspected_runs and not managed.claimed_ever:
                try:
                    jobs = self.gh.list_run_jobs(managed.run_id)
                    inspected_runs.add(managed.run_id)
                    claimed_by_run[managed.run_id] = self._record_claimed_runners(
                        managed.run_id,
                        jobs,
                    )
                except Exception as exc:
                    logging.warning(
                        "Could not refresh jobs for active runner %s (run=%d): %s",
                        managed.runner_name,
                        managed.run_id,
                        exc,
                    )

        spawned_total = 0
        if planned_spawns and len(self.active) < self.config.max_concurrent:
            if not self._has_hijackable_rejected_runs(rejected_runs):
                for run_id, expected_label, queued_count in planned_spawns:
                    to_spawn = compute_spawn_count(
                        queued_count=queued_count,
                        expected_label=expected_label,
                        claimed_runner_names=claimed_by_run.get(run_id, set()),
                        active_runners=self.active.values(),
                        max_concurrent=self.config.max_concurrent,
                    )
                    for _ in range(to_spawn):
                        self.spawn_runner(run_id, expected_label)
                        spawned_total += 1

        # Reap idle unclaimed runners only if never claimed, not busy in GitHub, and past grace period
        now_mono = self._monotonic()
        candidates = [
            (name, managed)
            for name, managed in list(self.active.items())
            if not managed.claimed_ever
            and (now_mono - managed.started_monotonic) >= self.config.idle_grace_seconds
            and (
                managed.run_id not in eligible_run_ids
                or queued_by_run.get(managed.run_id, 0) == 0
            )
        ]

        if candidates:
            busy_names: set[str] = set()
            runners_listed_ok = False
            try:
                for runner in self.gh.list_runners():
                    if runner.get("busy") is True and isinstance(runner.get("name"), str):
                        busy_names.add(runner["name"])
                runners_listed_ok = True
            except Exception as exc:
                logging.warning("Skipping idle reap (could not verify runner busy status): %s", exc)

            if runners_listed_ok:
                reaped_idle = False
                for name, managed in candidates:
                    if name in busy_names:
                        managed.claimed_ever = True
                        continue
                    logging.warning(
                        "Reaping idle unclaimed runner %s (run=%d, elapsed=%ds)",
                        name,
                        managed.run_id,
                        int(now_mono - managed.started_monotonic),
                    )
                    self._terminate_managed(name, managed)
                    self.active.pop(name, None)
                    reaped_idle = True
                if reaped_idle:
                    self.cleanup_stale_github_runners()

        return spawned_total

    def shutdown(self) -> None:
        logging.info("Shutting down supervisor; active runners=%d", len(self.active))
        for name, managed in list(self.active.items()):
            self._terminate_managed(name, managed)
            self.active.pop(name, None)
        self.cleanup_stale_github_runners()

    def run_forever(self) -> int:
        self.cleanup_orphaned_containers()
        self.cleanup_stale_github_runners()
        cleanup_counter = 0

        logging.info(
            "Supervisor started for %s (image=%s, network=%s, max_concurrent=%d, poll=%ds)",
            self.config.repo,
            self.config.runner_image,
            self.config.docker_network,
            self.config.max_concurrent,
            self.config.poll_interval_seconds,
        )

        try:
            while not self.stop_requested:
                try:
                    self.poll_once()
                except urllib.error.HTTPError as exc:
                    logging.error("GitHub API HTTP error: %d %s", exc.code, exc.reason)
                except Exception as exc:
                    logging.error("Poll cycle error: %s", exc)

                cleanup_counter += 1
                if cleanup_counter >= 20:
                    self.cleanup_stale_github_runners()
                    cleanup_counter = 0

                for _ in range(self.config.poll_interval_seconds):
                    if self.stop_requested:
                        break
                    time.sleep(1)
            logging.info("Stop signal observed; exiting main loop")
        finally:
            self.shutdown()

        return 0


def main() -> int:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    try:
        config = Config.from_env()
    except ValueError as exc:
        logging.error("Configuration error: %s", exc)
        return EXIT_CONFIG_ERROR

    # Scrub PAT from process environment now that it lives only in Config
    os.environ.pop("GITHUB_TOKEN", None)

    gh = GitHubClient(config)
    sup = Supervisor(config, gh)

    def _handle_signal(_signum: int, _frame: Any) -> None:
        sup.stop_requested = True

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    return sup.run_forever()


if __name__ == "__main__":
    sys.exit(main())
