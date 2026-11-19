---
id: DES-0009
slug: readme-no-padrao-orqo-e-migracao-para-gnu-agpl-3-0
title: "README no padrão Orqo e migração para GNU AGPL-3.0"
created_at: 2026-11-19T05:23:43Z
status: approved
ticket: TCK-0009
type: design
scope_files_new:
  - NOTICE.md
scope_files_modified:
  - LICENSE
  - package.json
  - package-lock.json
  - smithery.yaml
  - README.md
  - .archagents/00-overview.md
  - .archagents/_meta.json
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0009-playbook.md
acceptance_delta: unchanged
---
# DES-0009 - README no padrão Orqo e migração para GNU AGPL-3.0

## Problema

1. O projeto precisa passar de MIT para GNU Affero General Public License v3.0 (`AGPL-3.0-only`) de forma consistente em `LICENSE`, `package.json`, `package-lock.json`, `smithery.yaml` e documentação, sem perder as atribuições de terceiros (OpenCNPJ, OpenCEP, MCP SDK) nem quebrar a detecção SPDX do GitHub (`licensee`).
2. O `README.md` foi escrito antes da publicação efetiva da `v0.5.0` no npm e no GitHub Releases, mantendo instruções que tratam `0.5.0` como futuro e sem o nível de detalhe, catálogo completo das 23 ferramentas, perímetro de execução e clareza editorial do [orqo.pro](https://orqo.pro/) para um projeto público **by Orqo**.

## Solução

- Substituir `LICENSE` pelo texto oficial verbatim da GNU AGPL-3.0 (`https://www.gnu.org/licenses/agpl-3.0.txt`) para detecção SPDX exata pelo GitHub e ferramentas de compliance.
- Preservar as atribuições de terceiros (OpenCNPJ, OpenCEP, MCP) e o aviso de autoria (`Copyright (c) 2024-2026 Cristiano Arêdes / Orqo`) em `NOTICE.md`, incluído em `package.json#files`.
- Atualizar a declaração de licença para `AGPL-3.0-only` em `package.json`, `package-lock.json` (`packages[""].license`) e `smithery.yaml`.
- Reescrever `README.md` no estilo direto, técnico e transparente de [orqo.pro](https://orqo.pro/) (`MCP DadosBR by Orqo`): abertura e pilares, o problema (*the gap*), os 5 MCP Apps interativos com prompts verificáveis, catálogo completo das 23 ferramentas por domínio, perímetro de execução (CLI stdio / HTTP+SSE / Cloudflare Worker), instalação via `npx @aredes.me/mcp-dadosbr` (`0.5.0`, confirmado ao vivo no npm com os 5 HTMLs) e código-fonte, configuração (`.mcprc.json` e todas as variáveis de ambiente verificadas em `lib/`), arquitetura e controles (diagrama Mermaid, proveniência, cache/retry/circuit breaker/SSRF/rate limit/`stdout` puro), seção **Honestidade — O que não faz**, licença AGPL-3.0 explicada sem juridiquês, governança **Codebase OPS by Orqo**, **Perguntas diretas**, contribuição e resumo completo em inglês.
- Sincronizar `.archagents/00-overview.md` e `.archagents/_meta.json` com a nova licença e o novo `sha1` de `package.json`.

## Alternativas consideradas e recusadas

- **Anexar atribuições de terceiros no fim de `LICENSE`:** recusado — texto extra degrada a detecção automática `AGPL-3.0` do GitHub (`licensee`). Separar em `NOTICE.md` preserva 100% dos créditos e mantém `LICENSE` verbatim.
- **Usar `AGPL-3.0-or-later`:** recusado — o pedido especificou `agpl-3`; `AGPL-3.0-only` é o identificador SPDX preciso e explícito.

## Mudanças

- Criar `NOTICE.md`.
- Substituir `LICENSE` pelo texto oficial GNU AGPL-3.0.
- Atualizar `package.json`, `package-lock.json` e `smithery.yaml` para `AGPL-3.0-only`.
- Reescrever `README.md`.
- Atualizar `.archagents/00-overview.md` e `.archagents/_meta.json`.

## Critérios de sucesso

- [ ] `package.json`, `package-lock.json`, `smithery.yaml`, `LICENSE`, `NOTICE.md` consistentes em `AGPL-3.0-only`.
- [ ] `git diff --check`, `npm run build`, `npm test` e `npm run test:transport` passam.
- [ ] Revisão independente valida links, exemplos JSON, atribuições, veracidade técnica contra `lib/` e conformidade AGPL-3.0.
