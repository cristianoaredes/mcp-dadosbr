---
id: DES-0009-playbook
created_at: 2026-11-19T05:23:43Z
status: approved
design: DES-0009
ticket: TCK-0009
approved_at: 2026-11-19T05:23:43Z
approved_by: operator
executed_at: null
executed_runs:
  - RUN-20261119-052343-readme-orqo-agpl3
dry_run_supported: true
total_steps: 3
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: ops/
branch_name: ops/TCK-0009-readme-no-padrao-orqo-e-migracao-para-gnu-agpl-3-0
commit_per_step: false
commit_message_format: "[TCK-0009] passo N/3: <titulo>"
---
# Playbook - DES-0009

**Ticket:** TCK-0009
**Objetivo:** README no padrão Orqo e migração para GNU AGPL-3.0

## Pré-requisitos

- [x] Worktree verificada; edições anteriores de `/ops-config docs` em `.archagents/` preservadas.
- [x] Versão `0.5.0` confirmada no registro npm (`latest`) contendo os 5 HTMLs dos MCP Apps.

## Modo dry-run

`/ops-execute DES-0009 --dry-run`

## Passos

1. **Passo 1/3 — Migração de licença para GNU AGPL-3.0:** gravar texto verbatim da GNU AGPL-3.0 em `LICENSE`, criar `NOTICE.md` preservando atribuições de terceiros e atualizar `package.json`, `package-lock.json` e `smithery.yaml` para `AGPL-3.0-only`.
2. **Passo 2/3 — Reescrita detalhada do `README.md` no padrão Orqo:** reescrever `README.md` com posicionamento `MCP DadosBR by Orqo`, 5 MCP Apps, catálogo das 23 ferramentas, perímetro de execução, instalação `0.5.0`/fonte, configuração completa, arquitetura/resiliência, seção Honestidade, explicação da AGPL-3.0, governança Codebase OPS by Orqo, FAQ e resumo em inglês.
3. **Passo 3/3 — Sincronização AS-IS e validação:** atualizar `.archagents/00-overview.md` e `_meta.json` (`package.json` `sha1`), executar `criteria-check.py` (`npm run build && npm test && npm run test:transport`), checagem de links/JSON e verificação independente em contexto limpo.

## Critérios de sucesso do playbook

- [ ] Acceptance do ticket passa via `criteria-check.py`.
- [ ] Build, suíte Vitest e testes de transporte (`stdio` + `HTTP/SSE`) passam.
- [ ] Verificação independente (`VER-*`) aprova sem bloqueadores.

## Log de execuções

- `RUN-20261119-052343-readme-orqo-agpl3` (em execução)
