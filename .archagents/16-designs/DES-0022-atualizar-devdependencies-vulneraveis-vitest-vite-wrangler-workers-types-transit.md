---
id: DES-0022
slug: atualizar-devdependencies-vulneraveis-vitest-vite-wrangler-workers-types-transit
title: "Atualizar devDependencies vulneraveis (vitest, vite, wrangler, workers-types, transitivas) e alinhar wranglerVersion no CI"
created_at: 2026-11-20T19:11:30Z
status: approved
ticket: TCK-0022
type: design
scope_files_new: []
scope_files_modified:
  - package.json
  - package-lock.json
  - .github/workflows/cloudflare-deploy.yml
  - test/unit/dependency-hygiene.test.ts
  - .archagents/06-infra-devops.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0022-playbook.md
acceptance_delta: unchanged
---
# DES-0022 - Atualizar devDependencies vulneraveis (vitest, vite, wrangler, workers-types, transitivas) e alinhar wranglerVersion no CI

## Problema

Após o saneamento das dependências de runtime em `TCK-0021`, `npm audit --json` ainda reporta `22` vulnerabilidades na árvore de `devDependencies` (`3 critical`: `vitest@4.0.8`, `@vitest/ui@4.0.8`, `handlebars@4.7.8`; `17 high`: `vite@7.2.2`, `wrangler@4.40.2`, `miniflare`, `rollup`, `postcss`, `nanoid`, `picomatch`, `source-map-js`, `sharp`, `undici`, `ws`, `defu`, `flatted`, `lodash`, `minimatch`, `brace-expansion`, `zod` em `miniflare`; `2 moderate`: `@vitest/mocker`, `fflate`). Em paralelo, `.github/workflows/cloudflare-deploy.yml:L71` fixa `wranglerVersion: "3.95.0"` enquanto `package.json` declara `wrangler` `4.x`, e `npm audit fix` falha em `ERESOLVE` porque `wrangler@4.166.0` requer `peerOptional @cloudflare/workers-types@^5.20261119.1`.

## Threat Model (Supply Chain)

| ID | Ameaça | Vetor | Contramedida | Risco Residual |
|---|---|---|---|---|
| T1 | Leitura arbitrária / RCE / protótipo poluído em ambiente dev/CI | Versões vulneráveis de `vitest`, `@vitest/ui`, `vite`, `wrangler` e transitivas (`handlebars`, `lodash`, `flatted`, `miniflare`, `undici`, etc.) | Atualizar `vitest@^4.1.12`, `@vitest/ui@^4.1.12`, `vite@^7.3.8`, `wrangler@^4.166.0` (sem breaking upgrade de major em `vitest`/`vite`) + `npm install && npm audit fix` para sanear transitivas | Execução remota em runners CI permanece *a confirmar* |
| T2 | Conflito de peer dependency no `npm ci` / Typecheck Worker | `wrangler@4.166.0` declara `peerOptional @cloudflare/workers-types@^5.20261119.1` | Elevar `@cloudflare/workers-types` para `^5.20261120.1` e validar `npx tsc -p tsconfig.worker.json --noEmit` + `npm run build:worker` + `npm ci` | — |
| T3 | Divergência entre deploy automatizado e CLI local | `.github/workflows/cloudflare-deploy.yml:L71` fixando `wranglerVersion: "3.95.0"` | Alinhar `wranglerVersion: "4.166.0"` com `package.json` e validar via teste unitário estático em `test/unit/dependency-hygiene.test.ts` | Deploy real no Cloudflare Workers permanece *a confirmar* |

## Solucao

- Atualizar `devDependencies` em `package.json`: `@cloudflare/workers-types` (`^5.20261120.1`), `@vitest/ui` (`^4.1.12`), `vite` (`^7.3.8`), `vitest` (`^4.1.12`), `wrangler` (`^4.166.0`).
- Executar `npm install && npm audit fix` e validar reprodutibilidade com `npm ci` dentro do `$WT` isolado (`node_modules` não-symlink).
- Alinhar `.github/workflows/cloudflare-deploy.yml:L71` para `wranglerVersion: "4.166.0"`.
- Estender `test/unit/dependency-hygiene.test.ts` com invariantes de `TCK-0022` (`package.json`, `package-lock.json` e `cloudflare-deploy.yml`) e atualizar `.archagents/06-infra-devops.md`.

## Mudancas

- `package.json`, `package-lock.json`
- `.github/workflows/cloudflare-deploy.yml`
- `test/unit/dependency-hygiene.test.ts`
- `.archagents/06-infra-devops.md`

## Criterios de sucesso

- [ ] `npm audit --omit=dev --audit-level=high && npm audit --audit-level=high && echo AUDIT_ZERO_HIGH_CRIT`
- [ ] `npx vitest run test/unit/dependency-hygiene.test.ts`
- [ ] `npm test`
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport && echo FULL_VERIFY_OK`
