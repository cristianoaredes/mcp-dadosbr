#!/usr/bin/env python3
"""Unit and security negative tests for infra/runner/supervisor.py."""

from __future__ import annotations

import datetime as dt
import io
import subprocess
import unittest
from typing import Any

import supervisor as sup


def _iso(ts: dt.datetime) -> str:
    return ts.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class _FakeProcess:
    def __init__(self, rc: int | None = None, *, fail_write: bool = False, hang_wait: bool = False) -> None:
        self.stdin = io.BytesIO()
        self.rc = rc
        self.killed = False
        self.waits = 0
        self.hang_wait = hang_wait
        self.written_data = b""

        if fail_write:
            def _broken_write(_b: bytes) -> int:
                raise BrokenPipeError("docker exited early")

            self.stdin.write = _broken_write  # type: ignore[method-assign]

        orig_close = self.stdin.close

        def _capture_close() -> None:
            if not self.stdin.closed:
                self.written_data = self.stdin.getvalue()
                orig_close()

        self.stdin.close = _capture_close  # type: ignore[method-assign]

    def poll(self) -> int | None:
        return self.rc

    def wait(self, timeout: int | None = None) -> int:
        self.waits += 1
        if self.hang_wait and not self.killed:
            raise subprocess.TimeoutExpired(cmd="docker", timeout=timeout or 10)
        self.rc = 0 if self.rc is None else self.rc
        return self.rc

    def kill(self) -> None:
        self.killed = True
        self.rc = -9


class _FakeGitHub:
    def __init__(self) -> None:
        self.runs: list[dict[str, Any]] = []
        self.jobs_by_run: dict[int, list[dict[str, Any]]] = {}
        self.runners: list[dict[str, Any]] = []
        self.deleted_runners: list[int] = []
        self.token_requests = 0

    def list_active_runs(self) -> list[dict[str, Any]]:
        return list(self.runs)

    def list_run_jobs(self, run_id: int) -> list[dict[str, Any]]:
        return list(self.jobs_by_run.get(run_id, []))

    def create_registration_token(self) -> str:
        self.token_requests += 1
        return f"EPHEMERAL_REG_TOKEN_{self.token_requests}"

    def list_runners(self) -> list[dict[str, Any]]:
        return list(self.runners)

    def delete_runner(self, runner_id: int) -> None:
        self.deleted_runners.append(runner_id)


class PolicyTests(unittest.TestCase):
    REPO = "cristianoaredes/mcp-dadosbr"
    NOW = dt.datetime(2026, 11, 19, 18, 0, 0, tzinfo=dt.timezone.utc)

    def _base_run(self, **overrides: Any) -> dict[str, Any]:
        run: dict[str, Any] = {
            "id": 44547297557,
            "path": ".github/workflows/ci.yml",
            "event": "push",
            "head_branch": "main",
            "created_at": _iso(self.NOW - dt.timedelta(minutes=2)),
            "repository": {"full_name": self.REPO},
            "head_repository": {"full_name": self.REPO},
        }
        run.update(overrides)
        return run

    def test_allows_main_ci_push(self) -> None:
        label, reason = sup.evaluate_run_policy(
            self._base_run(),
            repo=self.REPO,
            now=self.NOW,
            max_age_minutes=30,
        )
        self.assertEqual(label, "dadosbr-ci-44547297557")
        self.assertEqual(reason, "ok")

    def test_allows_same_repo_pull_request(self) -> None:
        label, _ = sup.evaluate_run_policy(
            self._base_run(event="pull_request", head_branch="feat/demo"),
            repo=self.REPO,
            now=self.NOW,
            max_age_minutes=30,
        )
        self.assertEqual(label, "dadosbr-pr-44547297557")

    def test_allows_main_release_workflow_dispatch(self) -> None:
        label, _ = sup.evaluate_run_policy(
            self._base_run(
                path=".github/workflows/release.yml",
                event="workflow_dispatch",
                head_branch="main",
            ),
            repo=self.REPO,
            now=self.NOW,
            max_age_minutes=30,
        )
        self.assertEqual(label, "dadosbr-release-44547297557")

    def test_rejects_fork_pull_request(self) -> None:
        label, reason = sup.evaluate_run_policy(
            self._base_run(
                event="pull_request",
                head_branch="attacker-branch",
                head_repository={"full_name": "attacker/mcp-dadosbr"},
            ),
            repo=self.REPO,
            now=self.NOW,
            max_age_minutes=30,
        )
        self.assertIsNone(label)
        self.assertIn("fork", reason)

    def test_rejects_pull_request_target(self) -> None:
        label, _ = sup.evaluate_run_policy(
            self._base_run(event="pull_request_target", head_branch="main"),
            repo=self.REPO,
            now=self.NOW,
            max_age_minutes=30,
        )
        self.assertIsNone(label)

    def test_rejects_crafted_workflow_path_at_suffix(self) -> None:
        for bad_path in (
            ".github/workflows/ci.yml@evil.yml",
            ".github/workflows/ci.yml@refs/heads/attacker",
        ):
            label, _ = sup.evaluate_run_policy(
                self._base_run(path=bad_path),
                repo=self.REPO,
                now=self.NOW,
                max_age_minutes=30,
            )
            self.assertIsNone(label)

    def test_rejects_pull_request_with_missing_head_repository(self) -> None:
        label, _ = sup.evaluate_run_policy(
            self._base_run(event="pull_request", head_repository=None),
            repo=self.REPO,
            now=self.NOW,
            max_age_minutes=30,
        )
        self.assertIsNone(label)

    def test_rejects_cloudflare_deploy_workflow(self) -> None:
        label, reason = sup.evaluate_run_policy(
            self._base_run(path=".github/workflows/cloudflare-deploy.yml"),
            repo=self.REPO,
            now=self.NOW,
            max_age_minutes=30,
        )
        self.assertIsNone(label)
        self.assertIn("not allowlisted", reason)

    def test_rejects_release_on_non_main_branch_or_push(self) -> None:
        for override in (
            {"path": ".github/workflows/release.yml", "event": "push", "head_branch": "main"},
            {"path": ".github/workflows/release.yml", "event": "workflow_dispatch", "head_branch": "feat/x"},
        ):
            label, _ = sup.evaluate_run_policy(
                self._base_run(**override),
                repo=self.REPO,
                now=self.NOW,
                max_age_minutes=30,
            )
            self.assertIsNone(label)

    def test_rejects_stale_run_older_than_window(self) -> None:
        label, reason = sup.evaluate_run_policy(
            self._base_run(created_at=_iso(self.NOW - dt.timedelta(minutes=31))),
            repo=self.REPO,
            now=self.NOW,
            max_age_minutes=30,
        )
        self.assertIsNone(label)
        self.assertIn("older than", reason)

    def test_rejects_other_repository_or_non_dict(self) -> None:
        for bad_repo in ({"full_name": "other/mcp-dadosbr"}, None, "invalid"):
            label, _ = sup.evaluate_run_policy(
                self._base_run(repository=bad_repo),
                repo=self.REPO,
                now=self.NOW,
                max_age_minutes=30,
            )
            self.assertIsNone(label)


class JobSelectionAndDockerArgsTests(unittest.TestCase):
    def test_select_eligible_queued_jobs_enforces_exact_case_folded_set(self) -> None:
        expected = "dadosbr-ci-123"
        jobs = [
            {"id": 1, "status": "queued", "labels": ["self-hosted", "linux", "x64", expected]},
            {"id": 2, "status": "queued", "labels": ["self-hosted", "linux", "x64", "dadosbr-ubuntu-24.04"]},
            {"id": 3, "status": "queued", "labels": ["self-hosted", "linux", "x64", expected, "DADOSBR-ubuntu-24.04"]},
            {"id": 4, "status": "queued", "labels": ["self-hosted", "linux", "x64", expected, "gpu"]},
            {"id": 5, "status": "in_progress", "labels": ["self-hosted", "linux", "x64", expected]},
            {"id": 6, "status": "queued", "labels": ["self-hosted"]},
            {"id": 7, "status": "queued", "labels": ["Self-Hosted", "Linux", "X64", "DADOSBR-CI-123"]},
        ]
        selected = sup.select_eligible_queued_jobs(jobs, expected)
        self.assertEqual([j["id"] for j in selected], [1, 7])

    def test_find_hijackable_queued_jobs_detects_default_label_subsets(self) -> None:
        jobs = [
            {"id": 1, "status": "queued", "labels": ["self-hosted"]},
            {"id": 2, "status": "queued", "labels": ["Self-Hosted", "Linux", "X64"]},
            {"id": 3, "status": "queued", "labels": ["self-hosted", "linux", "x64", "dadosbr-ubuntu-24.04"]},
            {"id": 4, "status": "queued", "labels": ["ubuntu-latest"]},
            {"id": 5, "status": "in_progress", "labels": ["self-hosted"]},
        ]
        hijackable = sup.find_hijackable_queued_jobs(jobs)
        self.assertEqual([j["id"] for j in hijackable], [1, 2])

    def test_docker_args_are_hardened_disable_ipv6_and_contain_no_secrets(self) -> None:
        cfg = sup.Config(github_token="SECRET_PAT_SHOULD_NEVER_APPEAR")
        self.assertNotIn("SECRET_PAT_SHOULD_NEVER_APPEAR", repr(cfg))
        argv = sup.build_docker_run_args(
            cfg,
            runner_name="dadosbr-sup-123-deadbeef",
            run_id=123,
            label="dadosbr-ci-123",
        )
        joined = " ".join(argv)
        self.assertNotIn("SECRET_PAT_SHOULD_NEVER_APPEAR", joined)
        self.assertNotIn("GITHUB_TOKEN", joined)
        self.assertNotIn("docker.sock", joined)
        self.assertNotIn("-v", argv)
        self.assertNotIn("--volume", argv)
        self.assertNotIn("--mount", argv)
        self.assertIn("--rm", argv)
        self.assertIn("--cap-drop=ALL", argv)
        self.assertIn("--security-opt=no-new-privileges:true", argv)
        self.assertIn("--memory-swap=3g", argv)
        self.assertIn("net.ipv6.conf.all.disable_ipv6=1", argv)
        self.assertIn("net.ipv6.conf.default.disable_ipv6=1", argv)
        self.assertIn("--network", argv)
        self.assertIn("dadosbr-ci-isolated", argv)

    def test_build_child_env_strips_github_token(self) -> None:
        env = sup.build_child_env({
            "PATH": "/usr/bin",
            "GITHUB_TOKEN": "SECRET_PAT",
            "UNRELATED_SECRET": "NOPE",
        })
        self.assertEqual(env, {"PATH": "/usr/bin"})

    def test_docker_args_reject_malformed_runner_name(self) -> None:
        cfg = sup.Config(github_token="PAT_OK")
        with self.assertRaises(ValueError):
            sup.build_docker_run_args(
                cfg,
                runner_name="dadosbr-sup-bad-name",
                run_id=123,
                label="dadosbr-ci-123",
            )

    def test_config_rejects_missing_or_placeholder_token(self) -> None:
        for val in ("", "   ", "CHANGE_ME_FINE_GRAINED_PAT"):
            with self.assertRaises(ValueError):
                sup.Config.from_env({"GITHUB_TOKEN": val})


class SupervisorLoopTests(unittest.TestCase):
    NOW = dt.datetime(2026, 11, 19, 18, 0, 0, tzinfo=dt.timezone.utc)

    def test_spawns_up_to_max_concurrent_and_passes_token_only_on_stdin(self) -> None:
        cfg = sup.Config(github_token="PAT_NEVER_IN_DOCKER", max_concurrent=2)
        gh = _FakeGitHub()
        gh.runs = [
            {
                "id": 999,
                "path": ".github/workflows/ci.yml",
                "event": "push",
                "head_branch": "main",
                "created_at": _iso(self.NOW - dt.timedelta(minutes=1)),
                "repository": {"full_name": cfg.repo},
                "head_repository": {"full_name": cfg.repo},
            },
            {
                "id": 1000,
                "path": ".github/workflows/cloudflare-deploy.yml",
                "event": "push",
                "head_branch": "main",
                "created_at": _iso(self.NOW - dt.timedelta(minutes=1)),
                "repository": {"full_name": cfg.repo},
                "head_repository": {"full_name": cfg.repo},
            },
        ]
        gh.jobs_by_run[999] = [
            {"id": i, "status": "queued", "labels": ["self-hosted", "linux", "x64", "dadosbr-ci-999"]}
            for i in range(1, 5)
        ]
        gh.jobs_by_run[1000] = [
            {"id": 10, "status": "queued", "labels": ["self-hosted", "linux", "x64", "dadosbr-ubuntu-24.04"]}
        ]

        launched: list[tuple[list[str], dict[str, Any], _FakeProcess]] = []

        def fake_popen(argv: list[str], **kwargs: Any) -> Any:
            proc = _FakeProcess()
            launched.append((argv, kwargs, proc))
            return proc

        docker_calls: list[list[str]] = []
        clock = [100.0]
        supervisor = sup.Supervisor(
            cfg,
            gh,
            popen_fn=fake_popen,
            docker_cmd_fn=lambda args: (docker_calls.append(args) or subprocess.CompletedProcess(args, 0, "", "")),
            now_fn=lambda: self.NOW,
            monotonic_fn=lambda: clock[0],
        )

        self.assertEqual(supervisor.poll_once(), 2)
        self.assertEqual(len(launched), 2)
        for idx, (argv, kwargs, proc) in enumerate(launched, start=1):
            joined = " ".join(argv)
            self.assertNotIn("PAT_NEVER_IN_DOCKER", joined)
            self.assertNotIn("EPHEMERAL_REG_TOKEN", joined)
            self.assertNotIn("GITHUB_TOKEN", kwargs.get("env", {}))
            self.assertEqual(proc.written_data, f"EPHEMERAL_REG_TOKEN_{idx}\n".encode("utf-8"))

        # Second poll while both containers are still running spawns 0 duplicates
        clock[0] = 115.0
        self.assertEqual(supervisor.poll_once(), 0)
        self.assertEqual(len(launched), 2)

        # One container completes -> next poll spawns 1 replacement
        launched[0][2].rc = 0
        clock[0] = 130.0
        self.assertEqual(supervisor.poll_once(), 1)
        self.assertEqual(len(launched), 3)

    def test_refuses_to_spawn_when_fork_pr_has_hijackable_default_label_job(self) -> None:
        cfg = sup.Config(github_token="PAT_OK", max_concurrent=2)
        gh = _FakeGitHub()
        gh.runs = [
            {
                "id": 999,
                "path": ".github/workflows/ci.yml",
                "event": "push",
                "head_branch": "main",
                "created_at": _iso(self.NOW - dt.timedelta(minutes=1)),
                "repository": {"full_name": cfg.repo},
                "head_repository": {"full_name": cfg.repo},
            },
            {
                "id": 666,
                "path": ".github/workflows/ci.yml",
                "event": "pull_request",
                "head_branch": "evil-fork",
                "created_at": _iso(self.NOW - dt.timedelta(minutes=45)),
                "repository": {"full_name": cfg.repo},
                "head_repository": {"full_name": "attacker/mcp-dadosbr"},
            },
        ]
        gh.jobs_by_run[999] = [
            {"id": 1, "status": "queued", "labels": ["self-hosted", "linux", "x64", "dadosbr-ci-999"]}
        ]
        gh.jobs_by_run[666] = [
            {"id": 2, "status": "queued", "labels": ["self-hosted"]}
        ]

        spawned = []
        supervisor = sup.Supervisor(
            cfg,
            gh,
            popen_fn=lambda argv, **_kw: (spawned.append(argv) or _FakeProcess()),
            docker_cmd_fn=lambda args: subprocess.CompletedProcess(args, 0, "", ""),
            now_fn=lambda: self.NOW,
            monotonic_fn=lambda: 100.0,
        )

        with self.assertLogs(level="CRITICAL") as logs:
            self.assertEqual(supervisor.poll_once(), 0)
        self.assertEqual(spawned, [])
        self.assertTrue(any("SECURITY ALERT" in m for m in logs.output))

    def test_active_claimed_runner_is_not_killed_when_run_ages_past_window(self) -> None:
        cfg = sup.Config(github_token="PAT_OK", max_concurrent=2, max_run_age_minutes=30, idle_grace_seconds=60)
        gh = _FakeGitHub()
        now_box = [self.NOW]
        gh.runs = [{
            "id": 888,
            "path": ".github/workflows/ci.yml",
            "event": "push",
            "head_branch": "main",
            "created_at": _iso(self.NOW - dt.timedelta(minutes=28)),
            "repository": {"full_name": cfg.repo},
            "head_repository": {"full_name": cfg.repo},
        }]
        gh.jobs_by_run[888] = [
            {"id": 1, "status": "queued", "labels": ["self-hosted", "linux", "x64", "dadosbr-ci-888"]}
        ]

        docker_calls: list[list[str]] = []
        clock = [100.0]
        supervisor = sup.Supervisor(
            cfg,
            gh,
            popen_fn=lambda _argv, **_kw: _FakeProcess(),
            docker_cmd_fn=lambda args: (docker_calls.append(args) or subprocess.CompletedProcess(args, 0, "", "")),
            now_fn=lambda: now_box[0],
            monotonic_fn=lambda: clock[0],
        )

        self.assertEqual(supervisor.poll_once(), 1)
        rname = next(iter(supervisor.active.keys()))

        # 5 minutes later: run is now 33m old (> max_run_age_minutes=30), runner is actively executing job 1
        now_box[0] = self.NOW + dt.timedelta(minutes=5)
        clock[0] = 400.0
        gh.jobs_by_run[888] = [
            {"id": 1, "status": "in_progress", "runner_name": rname, "labels": ["self-hosted", "linux", "x64", "dadosbr-ci-888"]}
        ]
        gh.runners = [{"id": 55, "name": rname, "busy": True, "status": "online"}]

        self.assertEqual(supervisor.poll_once(), 0)
        self.assertIn(rname, supervisor.active)
        self.assertTrue(supervisor.active[rname].claimed_ever)
        self.assertEqual(docker_calls, [])

    def test_reaps_unclaimed_idle_runner_when_run_disappears(self) -> None:
        cfg = sup.Config(github_token="PAT_OK", max_concurrent=2, idle_grace_seconds=60)
        gh = _FakeGitHub()
        gh.runs = [{
            "id": 777,
            "path": ".github/workflows/ci.yml",
            "event": "push",
            "head_branch": "main",
            "created_at": _iso(self.NOW - dt.timedelta(minutes=1)),
            "repository": {"full_name": cfg.repo},
            "head_repository": {"full_name": cfg.repo},
        }]
        gh.jobs_by_run[777] = [
            {"id": 1, "status": "queued", "labels": ["self-hosted", "linux", "x64", "dadosbr-ci-777"]}
        ]

        launched: list[_FakeProcess] = []
        docker_calls: list[list[str]] = []
        clock = [100.0]

        supervisor = sup.Supervisor(
            cfg,
            gh,
            popen_fn=lambda _argv, **_kw: (launched.append(_FakeProcess()) or launched[-1]),
            docker_cmd_fn=lambda args: (docker_calls.append(args) or subprocess.CompletedProcess(args, 0, "", "")),
            now_fn=lambda: self.NOW,
            monotonic_fn=lambda: clock[0],
        )

        self.assertEqual(supervisor.poll_once(), 1)
        spawned_name = next(iter(supervisor.active.keys()))
        gh.runners = [{"id": 42, "name": spawned_name, "busy": False, "status": "online"}]
        # Run gets cancelled before runner claims job
        gh.runs = []
        gh.jobs_by_run[777] = []
        clock[0] = 165.0
        self.assertEqual(supervisor.poll_once(), 0)
        self.assertEqual(len(supervisor.active), 0)
        self.assertTrue(any(c[:3] == ["docker", "rm", "-f"] for c in docker_calls))
        self.assertEqual(gh.deleted_runners, [42])

    def test_spawn_pipe_failure_cleans_up_container_and_reaps_process(self) -> None:
        cfg = sup.Config(github_token="PAT_OK")
        gh = _FakeGitHub()
        broken_proc = _FakeProcess(fail_write=True)
        docker_calls: list[list[str]] = []

        supervisor = sup.Supervisor(
            cfg,
            gh,
            popen_fn=lambda _argv, **_kw: broken_proc,
            docker_cmd_fn=lambda args: (docker_calls.append(args) or subprocess.CompletedProcess(args, 0, "", "")),
        )

        with self.assertRaises(BrokenPipeError):
            supervisor.spawn_runner(123, "dadosbr-ci-123")
        self.assertEqual(len(supervisor.active), 0)
        self.assertTrue(broken_proc.killed)
        self.assertGreaterEqual(broken_proc.waits, 1)
        self.assertTrue(any(c[:3] == ["docker", "rm", "-f"] for c in docker_calls))

    def test_job_timeout_and_shutdown_wait_after_kill(self) -> None:
        cfg = sup.Config(github_token="PAT_OK", job_timeout_seconds=120)
        gh = _FakeGitHub()
        hanging_proc = _FakeProcess(hang_wait=True)
        docker_calls: list[list[str]] = []
        clock = [100.0]

        supervisor = sup.Supervisor(
            cfg,
            gh,
            popen_fn=lambda _argv, **_kw: hanging_proc,
            docker_cmd_fn=lambda args: (docker_calls.append(args) or subprocess.CompletedProcess(args, 0, "", "")),
            monotonic_fn=lambda: clock[0],
        )

        supervisor.spawn_runner(123, "dadosbr-ci-123")
        clock[0] = 250.0
        supervisor.reap_finished()
        self.assertEqual(len(supervisor.active), 0)
        self.assertTrue(hanging_proc.killed)
        self.assertEqual(hanging_proc.waits, 2)  # initial timeout wait + post-SIGKILL wait
        self.assertTrue(any(c[:3] == ["docker", "rm", "-f"] for c in docker_calls))


if __name__ == "__main__":
    unittest.main()
