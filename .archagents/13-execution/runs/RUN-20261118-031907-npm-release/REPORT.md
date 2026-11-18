---
run_id: RUN-20261118-031907-npm-release
ticket: TCK-0008
design: DES-0008
status: completed
operator: codex
start_time: "2026-11-18T03:19:07Z"
end_time: 2026-11-18T03:30:11+00:00
commits:
  - sha: c5daa7f3a3ec110c19eb8496344c1cf60fffeff5
    message: "[TCK-0008] Prepare MCP Apps package and exact-SHA release workflow"
    files: [".archagents/06-infra-devops.md", ".archagents/10-runbooks.md", ".github/workflows/ci.yml", ".github/workflows/release.yml", "CHANGELOG.md", "README.md", "package-lock.json", "package.json", "test/integration/transports.mjs"]
  - sha: db50d26c60a4f7bfdc47085902f37f932878e7e5
    message: "[TCK-0008] Fail explicitly when opt-in dev publication lacks credentials"
    files: [".github/workflows/ci.yml"]
files_modified: [".archagents/06-infra-devops.md", ".archagents/10-runbooks.md", ".github/workflows/ci.yml", ".github/workflows/release.yml", "CHANGELOG.md", "README.md", "package-lock.json", "package.json", "test/integration/transports.mjs"]
test_result:
  status: pass
  summary: "Lint, gates de CI/semver, build e tarball instalado com os cinco Apps"
---
# TCK-0008 — Candidata 0.5.0 e workflow npm

- Instalação do tarball local em diretório limpo passou no smoke de stdio/HTTP-SSE com 23 ferramentas, cinco recursos e 101 chamadas sem erro JSON-RPC.
- Gate do CI aceitou a revisão de main e reprovou seis estados incompatíveis em fixtures.
- Teste da guarda semver aceitou igualdade e avanço e reprovou downgrade e versão instável.
- Actionlint estrito do workflow npm e lint estrutural do CI passaram. O ShellCheck integral do CI ainda tem avisos anteriores a este diff.
- Revisão independente conferiu concorrência, labels isoladas, autenticação e integridade da reinstalação.
- O CI real e a publicação do pacote serão aferidos após integrar a candidata.
