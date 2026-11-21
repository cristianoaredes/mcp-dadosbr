---
id: TCK-0022
slug: atualizar-devdependencies-com-cves-criticos-high-vitest-vite-wrangler-handlebars
title: "Atualizar devDependencies com CVEs criticos/high (vitest, vite, wrangler, handlebars) e alinhar wranglerVersion no CI"
source: audit
created_at: 2026-11-20T15:16:20Z
created_by: ops
updated_at: 2026-11-20T19:17:30Z
status: done
severity: medium
category: dependency
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0010
linked_designs:
  - DES-0022
linked_runs:
  - RUN-20261120-191159-tck-0022
linked_verifications:
  - VER-20261120-191658-tck-0022
linked_docs:
  - .archagents/06-infra-devops.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npm audit --omit=dev --audit-level=high && npm audit --audit-level=high && echo AUDIT_ZERO_HIGH_CRIT"
    expect: AUDIT_ZERO_HIGH_CRIT
  - check: "npx vitest run test/unit/dependency-hygiene.test.ts"
    expect: passed
  - check: "npm test"
    expect: passed
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport && echo FULL_VERIFY_OK"
    expect: FULL_VERIFY_OK
depth_decision:
  workflow: inline
  design: skip
  verify: lightweight
  source: routing-classifier
  classified_at: 2026-11-20T19:11:30Z
---
# TCK-0022 - Atualizar devDependencies com CVEs criticos/high (vitest, vite, wrangler, handlebars) e alinhar wranglerVersion no CI

## Contexto

Originado por **FND-0010** (`dependency` / `medium`, auditoria na revisão `6c74db6`).

- **Evidências:** `package.json:L60-L74`, `package-lock.json`, `.github/workflows/cloudflare-deploy.yml:L66`, `npm audit --json` (38 vulns totais: `3C / 27H / 4M / 4L`).
- **Problema:** `devDependencies` trazem 3 CVEs `critical` (`vitest`, `@vitest/ui`, `handlebars`) e 13 `high` adicionais (`vite`, `wrangler`, `rollup`, `miniflare`, `undici`, `ws`, `sharp`, `postcss`), além de `cloudflare-deploy.yml:L66` fixar `wranglerVersion: "3.95.0"` frente a `^4.40.2` em `package.json:L73`.
- **Mitigação:** Atualizar `vitest`, `@vitest/ui`, `vite`, `wrangler` e transitivas no lockfile (revalidando `npm test` e `npm run build`) e alinhar `wranglerVersion` em `cloudflare-deploy.yml`.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

Evidências pré-fix observadas na revisão de trabalho (`08ce71f`):

1. **`npm audit --json` (estado pós-`TCK-0021` em `devDependencies`):** reporta `22` vulnerabilidades totais (`3 critical`, `17 high`, `2 moderate`), reprovando `npm audit --audit-level=high` (exit `1`):
   - `critical` (`3`): `vitest@4.0.8`, `@vitest/ui@4.0.8`, `handlebars@4.7.8` (transitiva de `standard-version`).
   - `high` (`17`): `vite@7.2.2`, `wrangler@4.40.2`, `miniflare@4.20250924.0`, `rollup@4.53.2`, `postcss@8.5.6`, `nanoid@3.3.11`, `picomatch@4.0.3`, `source-map-js`, `sharp@0.33.5`, `undici@7.14.0`, `ws@8.18.0`, `defu@6.1.4`, `flatted@3.3.3`, `lodash@4.17.21`, `minimatch@3.1.2`, `brace-expansion@1.1.12` e `zod` aninhado em `miniflare`.
   - `moderate` (`2`): `@vitest/mocker`, `fflate@0.8.2`.
2. **`.github/workflows/cloudflare-deploy.yml:L71`:** fixa `wranglerVersion: "3.95.0"` enquanto `package.json:L103` declara `"wrangler": "^4.40.2"` (divergência de major 3.x vs 4.x).
3. **`npm audit fix --dry-run`:** falha com `ERESOLVE` porque `wrangler@4.166.0` declara `peerOptional @cloudflare/workers-types@"^5.20261119.1"` em conflito com `"@cloudflare/workers-types": "^4.20250927.0"` em `package.json:L90`.

Comando falsificador pré-fix:
- `cd "$WT" && npm audit --audit-level=high` (falha com exit `1` devido a 3 `critical` e 17 `high` em `devDependencies`).

## Log de transicoes

- 2026-11-20T15:16:20Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T19:11:30Z - **noted** - body:falsifier (append): Registrar falsificador FND-0010 na triagem
- 2026-11-20T19:11:30Z - **triaged** - Triagem FND-0010 com falsificador e criterios machine-verifiable [depth_decision do routing-classifier: workflow inline, design skip, verify lightweight]
- 2026-11-20T19:11:59Z - **designed** - Design DES-0022 e playbook aprovados
- 2026-11-20T19:11:59Z - **executing** - Executando DES-0022 / RUN-20261120-191159-tck-0022
- 2026-11-20T19:14:20Z - **verifying** - Execucao TCK-0022 concluida com 0 vulnerabilidades em npm audit (prod+dev), npm ci OK e 4/4 criteria-check; abrindo verificacao adversarial independente
- 2026-11-20T19:17:30Z - **done** - TCK-0022 aprovado por verificador independente (b74dc5ce), npm audit com 0 vulnerabilidades e wranglerVersion alinhado
