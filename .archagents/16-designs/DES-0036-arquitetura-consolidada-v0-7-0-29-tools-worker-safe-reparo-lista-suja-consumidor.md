---
id: DES-0036
slug: arquitetura-consolidada-v0-7-0-29-tools-worker-safe-reparo-lista-suja-consumidor
title: "Arquitetura consolidada v0.7.0 (29 tools Worker-safe + reparo Lista Suja/Consumidor)"
created_at: 2026-11-21T16:24:37Z
status: approved
ticket: TCK-0040
type: design
scope_files_new:
  - lib/shared/mte-lista-suja.ts
  - lib/shared/tcu-schema.ts
  - lib/tools/tcu.ts
  - lib/shared/fiscal-banking-schemas.ts
  - lib/tools/fiscal-banking.ts
  - lib/shared/olinda-ibge-schemas.ts
  - lib/tools/olinda.ts
  - lib/tools/ibge-indicadores.ts
scope_files_modified:
  - package.json
  - lib/tools/index.ts
  - lib/core/tool-schemas.ts
  - lib/tools/legal.ts
  - lib/tools/company.ts
  - lib/shared/utils/constants.ts
  - .archagents/mcp-tool-allowlist.json
  - .archagents/_capabilities.json
scope_files_deleted: []
blast_radius: medium
playbook: .archagents/16-designs/playbooks/DES-0036-playbook.md
acceptance_delta: unchanged
---
# DES-0036 - Arquitetura consolidada v0.7.0 (29 tools Worker-safe + reparo Lista Suja/Consumidor)

## Problema

Épico `TCK-0040` compilado de `SPC-0001`. Consolida a entrega de 29 ferramentas MCP compatíveis com Node e Cloudflare Worker (`ADR-0002`), reparando `lista_suja_lookup` (MTE CSV ~76 KB) e `consumidor_reclamacoes` (fallback honesto sem requisição contra challenge anti-bot F5) e adicionando `tcu_certidoes`, `cnae_ncm_lookup`, `sistema_financeiro_lookup`, `feriados_ddd_lookup`, `bcb_olinda` e `ibge_indicadores`.

## Solucao

Execução em duas ondas isoladas por superfície de arquivos:
- **Wave 1 (paralela):** `TCK-0041` (`DES-0037`), `TCK-0042` (`DES-0038`) e `TCK-0043` (`DES-0039`). Durante a Wave 1, cada módulo novo expõe função explícita `register*()` sem execução top-level, preservando `getToolCount() === 23` em cada worktree.
- **Wave 2 (integração, `blocked_by: [TCK-0041, TCK-0042, TCK-0043]`):** `TCK-0044` registra todas as 6 tools em `lib/tools/index.ts` e `lib/core/tool-schemas.ts`, atualiza versão `0.7.0`, `.archagents/mcp-tool-allowlist.json` (`SC-9`), testes de catálogo/transporte e docs `.archagents/`.

## Threat Model

- **Boundary acíclico (`ADR-0001`):** `lib/shared/*` nunca importa `lib/core/*`, `lib/tools/*` ou `node:*`, garantindo compilação `tsconfig.worker.json`.
- **Superfície agêntica & LGPD:** sanitização de conteúdo externo não confiável (`agentic-guard.ts`), `lgpd_notice` em consultas de sanção/integridade (`lista_suja_lookup`, `tcu_certidoes`), zero parâmetros `api_key` e atualização obrigatória de `.archagents/mcp-tool-allowlist.json` (`SC-9`).
- **Conformidade anti-bot:** proibição explícita de bypass/automação em `consumidor.gov.br`, `oab_advogado` e `bnmp_mandados`.

## Mudancas

- Agregação via subtickets `TCK-0041`, `TCK-0042`, `TCK-0043` e `TCK-0044`.

## Criterios de sucesso

- [ ] Todos os subtickets `TCK-0041`..`TCK-0044` concluídos e verificados (`P10`).
- [ ] `SPC-0001` 6/6 critérios de aceitação aprovados no estado integrado `0.7.0`.
