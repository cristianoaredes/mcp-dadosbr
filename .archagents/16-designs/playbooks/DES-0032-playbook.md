---
id: DES-0032-playbook
created_at: 2026-11-21T13:47:00Z
status: approved
design: DES-0032
ticket: TCK-0037
approved_at: 2026-11-21T13:47:00Z
approved_by: self
executed_at: 2026-11-21T13:51:14Z
executed_runs:
  - RUN-20261121-134716-tck-0037
dry_run_supported: true
total_steps: 4
destructive_steps: 0
environments:
  - dev
estimated_duration: 15min-30min
branch_prefix: refactor/
branch_name: refactor/TCK-0037-worker-rest-openapi-cleanup
commit_per_step: false
---
# Playbook - DES-0032

**Ticket:** TCK-0037
**Objetivo:** Alinhar contrato REST/OpenAPI do Worker, corrigir 404/decodeURIComponent e limpar legados (`FND-0022`).

## Pre-requisitos

- [x] Worktree isolado na base `8bf9673` e branch `refactor/TCK-0037-worker-rest-openapi-cleanup`.
- [x] `TCK-0037` triado com critérios de aceite e `DES-0032` aprovado.

## Passos

1. **Passo 1/4 — Contratos REST/OpenAPI (`types.ts`, `openapi.ts`, `rest.ts`, `worker.ts`):**
   - Importar `DORK_CATEGORIES` e `SEARCH_PROVIDERS` em `types.ts` e `openapi.ts`, alinhar `IntelligenceRequestBody`, `ThinkingRequestBody`, `/intelligence` e `/thinking` (sem tocar `info`).
   - Corrigir `404` (`/not found/i`) e args opcionais estritos em `rest.ts`; adicionar `decodeURIComponent` seguro (`400` em encoding inválido) em `worker.ts` (sem tocar `GET /`).
2. **Passo 2/4 — Remoção de artefatos e exports mortos:**
   - Remover `lib/workers/tokens.ts`, `smithery.config.js`, `getDorksByCategory`/`getPrioritizedDorks` (`lib/core/dork-templates.ts`) e `logTimeoutConfig` (`lib/config/timeouts.ts`) após confirmar zero callers vivos via `rg`.
3. **Passo 3/4 — Sincronização de docs, script manual e workflow:**
   - Atualizar `.archagents/03-modules.md`, `docs/CONFIGURATION.md`, `CLAUDE.md`, `test/manual/test-manual.js` e `.github/workflows/cloudflare-deploy.yml` preservando todas as permissões e checks de segurança.
4. **Passo 4/4 — Testes unitários e gates de verificação:**
   - Atualizar e expandir `test/unit/worker-rest-cloudflare.test.ts`; rodar `npm run test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit` e `secret-scan.sh`.

## Criterios de sucesso do playbook

- [x] `npx vitest run test/unit/worker-rest-cloudflare.test.ts test/unit/worker-auth-oauth-cors.test.ts test/unit/architecture-hygiene.test.ts test/unit/dependency-hygiene.test.ts` passa 100%.
- [x] `npm run test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit` passam sem erros.
- [x] `git ls-files lib apps scripts infra .github | xargs bash "$CBOPS/secret-scan.sh"` passa limpo.
- [x] `lib/workers/tokens.ts` e `smithery.config.js` removidos, referências obsoletas sincronizadas e `REPORT.md` preenchido.

## Rollback

Caso qualquer regressão ocorra antes do merge na branch de integração:
1. Reverter alterações já commitadas com `git revert <commit-sha>` (reversível, conforme `SAFETY.md`).
2. Restaurar eventuais arquivos deletados (`lib/workers/tokens.ts`, `smithery.config.js`) via `git checkout 8bf9673 -- lib/workers/tokens.ts smithery.config.js`.
3. Reverter o status do ticket via `transition.py` se necessário antes de nova tentativa.
