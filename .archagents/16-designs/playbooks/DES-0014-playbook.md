---
id: DES-0014-playbook
created_at: 2026-11-20T16:27:12Z
status: approved
design: DES-0014
ticket: TCK-0014
approved_at: 2026-11-20T16:27:12Z
approved_by: codex
executed_at: null
executed_runs: []
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 30min-2h
branch_prefix: bugfix/
branch_name: bugfix/TCK-0014-ssrf-overrides-smithery-fipe
commit_per_step: false
commit_message_format: "[TCK-0014] passo N/4: <titulo>"
---
# Playbook - DES-0014

**Ticket:** TCK-0014
**Objetivo:** Endurecimento SSRF em resolveApiConfig(overrides), Smithery, loopback e fipe_veiculos

## Pre-requisitos

- [x] Worktree isolado com `TCK-0013` já commitado e branch empilhada `bugfix/TCK-0014-ssrf-overrides-smithery-fipe` criada.

## Modo dry-run

`/ops-execute DES-0014 --dry-run`

## Passos

1. **Passo 1 — Endurecer SSRF e loopback em `lib/config/index.ts`:**
   - Exportar `DEFAULT_CNPJ_URL`, `DEFAULT_CEP_URL`, `ALLOWED_CNPJ_HOSTS`, `ALLOWED_CEP_HOSTS` (sem loopback), `validateUrl`, `isAllowedCnpjUrl`, `isAllowedCepUrl`; adicionar `isLocalhostAllowed()`, `sanitizeUrlForLog()`, `validateAndNormalizeApiConfig()`; aplicar validação e normalização em `resolveApiConfig(overrides)`.
2. **Passo 2 — Alinhar Smithery (`lib/adapters/smithery.ts`) e validar entradas FIPE (`lib/tools/financial.ts`):**
   - Atualizar defaults e `.refine(...)` no `configSchema` de `smithery.ts`; validar `tipo` contra `ALLOWED_FIPE_TYPES` e `codigo_fipe` contra `/^[0-9]+(?:-[0-9]+)?$/` em `executeFipe`.
3. **Passo 3 — Expandir testes (`test/unit/config.test.ts`, `test/unit/smithery-fipe-security.test.ts`) e atualizar `.archagents/07-security-compliance.md`:**
   - Cobrir bypass de `overrides`, restrição de `localhost`/`127.0.0.1` em `production` e `NODE_ENV` ausente, subdomínios `.localhost`, `user:pass@`, Smithery `configSchema`/`createServer`, e FIPE path traversal; atualizar documentação de segurança com linhas verificadas.
4. **Passo 4 — Verificação completa e encerramento:**
   - Executar `vitest`, `npm test`, `tsc` (Node e Worker), `npm run build && npm run build:worker`, `git diff --check`, `secret-scan.sh`, `verify-run.py`, `criteria-check.py`, revisão adversarial independente e `pipeline-judge.py`.

## Criterios de sucesso do playbook

- [ ] Acceptance do ticket passa (`criteria-check.py`).
- [ ] Suite completa e builds Node/Worker passam sem regressões.

## Log de execucoes

- *(aguardando registro do RUN)*
