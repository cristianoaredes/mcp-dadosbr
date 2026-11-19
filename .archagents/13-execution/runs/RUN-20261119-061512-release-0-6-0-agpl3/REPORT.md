---
status: completed
run_id: RUN-20261119-061512-release-0-6-0-agpl3
ticket: TCK-0010
design: DES-0010
start_time: 2026-11-19T06:15:12Z
end_time: 2026-11-19T06:17:04Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - package.json
  - package-lock.json
  - smithery.yaml
  - CHANGELOG.md
  - README.md
  - NOTICE.md
  - .archagents/00-overview.md
  - .archagents/_meta.json
test_result:
  status: pass
  summary: "Candidata npm 0.6.0 (AGPL-3.0-only) empacotada, instalada em diretório limpo e validada em stdio/HTTP-SSE (23 ferramentas, 5 MCP Apps, 101 chamadas), 286 testes Vitest, Worker build e criteria-check 2/2 aprovados"
---
# RUN-20261119-061512-release-0-6-0-agpl3 - TCK-0010

## Resumo executivo

- Versão incrementada de `0.5.0` para `0.6.0` (bump minor SemVer para impedir auto-upgrade silencioso de consumidores `^0.5.0` sob MIT para `AGPL-3.0-only`) em `package.json`, `package-lock.json` (`version` e `packages[""].version`) e `smithery.yaml`.
- Seção `## [0.6.0] - 2026-11-19` adicionada em `CHANGELOG.md` documentando o relicenciamento MIT → `AGPL-3.0-only`, `NOTICE.md`, a reescrita do `README.md` no padrão `orqo.pro` e a sincronização AS-IS.
- Notas de transição `<= 0.5.0` (MIT) → `0.6.0+` (`AGPL-3.0-only`) alinhadas em `NOTICE.md` e `README.md` sem afirmar que `0.6.0` já está publicado no npm.
- `.archagents/00-overview.md` e `.archagents/_meta.json` atualizados (`baseline_commit: 9e74ba5baed5803d7cd668f15ab182a1e0c3f062`, 0 hash drift).
- Tarball candidato `aredes.me-mcp-dadosbr-0.6.0.tgz` (`sha512-ugxpY/5QKWLgj/NXl8dCCj7K28pFpaqtxg8zIUxL34PGg2nKrZKWFC8NFbiPoDj9kBSQDmHU0Etj6SMOx1ymtg==`) instalado em diretório temporário limpo e testado ponta a ponta contra `npm run test:transport`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| Manifestos e changelog `0.6.0` | `0.6.0` + `AGPL-3.0-only` em `package.json`, `package-lock.json`, `smithery.yaml`; `## [0.6.0]` em `CHANGELOG.md`; `LICENSE` verbatim AGPL-3.0 | Verificado via `criteria-check.py` (check 1/2) | PASS |
| Guarda SemVer (`release.yml`) | `0.6.0 > 0.5.0` (`latest` atual no npm) | `PASS SemVer guard: 0.6.0 > 0.5.0` | PASS |
| Instalação limpa do tarball `0.6.0` | `package.json` (`0.6.0` / `AGPL-3.0-only`), `LICENSE`, `NOTICE.md`, `README.md` e 5 HTMLs instalados + `test:transport` verde | 23 ferramentas, 5 MCP Apps e 101 chamadas `stdio` + `HTTP/SSE` aprovados sobre o pacote instalado | PASS |
| `npm run build` + `npm test` + `npm run test:transport` + `npm run build:worker` + `git diff --check` | Todos verdes | Verificado via `criteria-check.py` (check 2/2) | PASS |
