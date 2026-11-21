---
id: DES-0029-playbook
created_at: 2026-11-21T13:45:30Z
status: completed
design: DES-0029
ticket: TCK-0033
approved_at: 2026-11-21T13:45:30Z
approved_by: ops
executed_at: 2026-11-21T13:51:00Z
executed_runs:
  - RUN-20261121-134533-tck-0033
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 15min-45min
branch_prefix: feat/
branch_name: feat/TCK-0033-lgpd-privacy-dpo-homonym-notice
commit_per_step: false
commit_message_format: "feat(compliance): <titulo> (TCK-0033)"
---
# Playbook - DES-0029

**Ticket:** TCK-0033
**Objetivo:** Publicar aviso LGPD/DPO, plano ANPD e ressalva de homônimo em ferramentas jurídicas e sancionatórias (`FND-0018`).

## Pre-requisitos

- [x] Worktree isolada criada a partir de `8bf9673` (`feature/audit-remediation-wave2`) na branch `feat/TCK-0033-lgpd-privacy-dpo-homonym-notice`.
- [x] Sem edição concorrente em `lib/adapters/cloudflare.ts` nem em `parseProcuradosHtml` (`lib/tools/legal.ts`).

## Passos

1. **Passo 1/4 — Documentação LGPD, DPO e Runbook ANPD:** Criar `PRIVACY.md`, adicionar seção `## Privacidade e LGPD` no `README.md` e anexar seção de resposta a incidentes ANPD (Art. 48 / Resolução CD/ANPD nº 15/2024) em `.archagents/10-runbooks.md`.
2. **Passo 2/4 — Metadados de Privacidade/DPO no Worker e OpenAPI:** Atualizar `GET /` em `lib/workers/worker.ts` (suportando `MCP_DPO_CONTACT`) e `info` em `lib/workers/openapi.ts`.
3. **Passo 3/4 — Módulo Web-standard de Ressalva e Tools Sensíveis:** Criar `lib/shared/compliance-notices.ts` com `HOMONYM_HUMAN_REVIEW_NOTICE` e anexar `lgpd_notice` aos payloads retornados por `executeDatajud`, `executeBnmp`, `executeProcurados` e `executeCeisCnep`.
4. **Passo 4/4 — Testes Unitários e Validação:** Criar `test/unit/compliance-lgpd-notice.test.ts` e executar `npm run test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit` e `secret-scan.sh`.

## Criterios de aceite

- [x] `PRIVACY.md` publicado com escopo de dados, bases legais (Art. 6º/7º), direitos (Art. 18), provedores externos, salvaguarda Art. 20 e canal DPO/Art. 41 (`MCP_DPO_CONTACT`).
- [x] `README.md` referencia `PRIVACY.md` e `MCP_DPO_CONTACT`; `.archagents/10-runbooks.md` documenta protocolo de notificação à ANPD (Art. 48).
- [x] `GET /` (`worker.ts`) e `generateOpenAPISchema` (`openapi.ts`) expõem política de privacidade e contato do DPO.
- [x] `procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos` incluem `lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE` sem regressão nas chaves existentes.
- [x] `npm run test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit` e `secret-scan.sh` passam sem falhas.

## Rollback

- Executar `git revert <commit_sha>` na branch `feat/TCK-0033-lgpd-privacy-dpo-homonym-notice` (ou restaurar os 6 arquivos modificados e remover os 3 novos arquivos). Impacto zero em estado persistido ou bindings de produção.

## Log de execucoes

- `RUN-20261121-134533-tck-0033` (`2026-11-21`): `5/5` testes em `test/unit/compliance-lgpd-notice.test.ts`, `447/447` Vitest (`32` arquivos), V8 `91.38% Stmts | 83.75% Branch | 93.26% Funcs | 92.11% Lines >= 85/85/80/85`, `tsc --noEmit` + `tsc -p tsconfig.worker.json --noEmit` exit `0`, `secret-scan.sh` limpo.
