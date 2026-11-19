---
status: completed
run_id: RUN-20261119-052343-readme-orqo-agpl3
ticket: TCK-0009
design: DES-0009
start_time: 2026-11-19T05:23:43Z
end_time: 2026-11-19T05:30:30Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - LICENSE
  - NOTICE.md
  - package.json
  - package-lock.json
  - smithery.yaml
  - README.md
  - .archagents/00-overview.md
  - .archagents/08-conventions.md
  - .archagents/10-runbooks.md
  - .archagents/_meta.json
test_result:
  status: pass
  summary: "AGPL-3.0-only em todos os manifestos, README validado (31 links, 4 JSONs, 23 ferramentas), 286 testes unitários, stdio+HTTP/SSE (101 chamadas), build Worker e npm pack dry-run aprovados"
---
# RUN-20261119-052343-readme-orqo-agpl3 - TCK-0009

## Resumo executivo

- `LICENSE` substituído pelo texto oficial verbatim da GNU AGPL-3.0 (`AGPL-3.0-only`, 34.020 bytes) para detecção SPDX fiel no GitHub.
- `NOTICE.md` criado preservando as atribuições de terceiros (OpenCNPJ, OpenCEP, MCP SDK e fontes públicas brasileiras) e incluído em `package.json#files`.
- `package.json`, `package-lock.json` (`packages[""].license`) e `smithery.yaml` atualizados para `AGPL-3.0-only`.
- `README.md` reescrito no padrão editorial e técnico de `orqo.pro` (`MCP DadosBR by Orqo`): abertura e pilares, o problema, os 5 MCP Apps interativos, catálogo completo das 23 ferramentas por domínio, perímetro de execução (`stdio`, `HTTP/SSE`, Cloudflare Worker), instalação via `npx @aredes.me/mcp-dadosbr` (`0.5.0` confirmado ao vivo no npm com os 5 HTMLs) e código-fonte, referência completa de variáveis de ambiente e allowlist SSRF, arquitetura e controles, seção Honestidade, licença GNU AGPL-3.0, governança Codebase OPS by Orqo, perguntas diretas, contribuição e resumo completo em inglês.
- `.archagents/00-overview.md`, `08-conventions.md`, `10-runbooks.md` e `_meta.json` atualizados para manter 0 drift de hashes (preservando na worktree os ajustes anteriores de `/ops-config docs` em `01`–`07` e `_drift-log.md`).
- **Iteração pós-verificação independente:** corrigidos 4 achados bloqueantes no `README.md` (`cnpj_search`/`cnpj_intelligence` sem DuckDuckGo fantasma e exigindo `TAVILY_API_KEY`/`PERPLEXITY_API_KEY`; aspas nos rótulos Mermaid; substituição de `LOG_LEVEL` pelo comportamento real de `NODE_ENV`; escopo preciso da proveniência aos 5 MCP Apps e CNPJ/CEP) + ajustes de defaults (`256`, `3600000` ms, `8000` ms) e códigos retentáveis (`429`, `500`, `502`, `503`, `504` e falhas de rede), com reexecução limpa do `criteria-check.py` (2/2 PASS).

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| Manifestos e licença AGPL-3.0 | `AGPL-3.0-only` em `package.json`, `package-lock.json`, `smithery.yaml`, `LICENSE` verbatim AGPL-3.0, `NOTICE.md` presente e em `package.json#files` | Todos verificados via `criteria-check.py` (check 1/2) | PASS |
| README links, JSON e catálogo | Links locais válidos, JSON parseável, 23/23 ferramentas citadas | 31 links/âncoras de linha válidos, 4 blocos JSON válidos, 23/23 ferramentas presentes | PASS |
| `npm ci` + `npm run build` | Dependências íntegras, `tsc` + 5 HTMLs dos MCP Apps | 598 pacotes instalados; build Node e 5 apps concluídos sem erro | PASS |
| `npm test` | Suíte Vitest verde | 17 arquivos, 286/286 testes aprovados | PASS |
| `npm run test:transport` | 23 ferramentas, 5 MCP Apps e 101 chamadas `stdio` + `HTTP/SSE` | PASS `stdio` (23 tools, 5 apps, 101 chamadas sem erro JSON-RPC) + PASS `HTTP/SSE` | PASS |
| `npm run build:worker` | Compilação Worker sem erro | PASS (`tsc -p tsconfig.worker.json`) | PASS |
| `npm pack --dry-run` | Tarball contém `LICENSE`, `NOTICE.md`, `README.md` e 5 HTMLs | Todos presentes (`LICENSE` 34.020 B, `NOTICE.md` 2.686 B, `README.md` 30.169 B, 5 apps HTML) | PASS |
| `git diff --check` | Zero erro de whitespace/conflito | PASS (via `criteria-check.py`, check 2/2) | PASS |
