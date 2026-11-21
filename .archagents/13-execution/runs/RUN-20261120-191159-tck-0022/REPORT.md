---
status: completed
run_id: RUN-20261120-191159-tck-0022
ticket: TCK-0022
design: DES-0022
start_time: 2026-11-20T19:11:59Z
end_time: 2026-11-20T19:13:48Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - package.json
  - package-lock.json
  - .github/workflows/cloudflare-deploy.yml
  - test/unit/dependency-hygiene.test.ts
  - .archagents/06-infra-devops.md
test_result:
  status: pass
  summary: "npm audit (prod + dev) 0 vulnerabilities (0C/0H/0M/0L), npm ci OK, 7/7 dependency-hygiene.test.ts, npm test passed, tsc + tsc.worker TYPECHECK_OK, build + build:worker + test:transport PASS, criteria-check 4/4 pass"
---
# RUN-20261120-191159-tck-0022 - TCK-0022

## Resumo executivo

- **`package.json` e `package-lock.json`:** Elevadas `devDependencies` vulneráveis (`@cloudflare/workers-types@^5.20261120.1`, `@vitest/ui@^4.1.12`, `vite@^7.3.8`, `vitest@^4.1.12`, `wrangler@^4.166.0`) e saneadas transitivas via `npm install && npm audit fix` dentro do worktree isolado (`node_modules` não-symlink), validado em instalação limpa com `npm ci` (`499` pacotes adicionados, `500` auditados, `0 vulnerabilities`).
- **`.github/workflows/cloudflare-deploy.yml:L71`:** Alinhado `wranglerVersion: "3.95.0"` → `"4.166.0"` com `package.json`.
- **`test/unit/dependency-hygiene.test.ts` e `.archagents/06-infra-devops.md`:** Adicionados `3` novos testes para os pisos de versão de `TCK-0022` e alinhamento de `wranglerVersion` (`7/7` no arquivo), e documentada a atualização marcando execução remota em GitHub Actions como *a confirmar*.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npm ci` | Exit `0` | `added 499 packages, audited 500 packages, found 0 vulnerabilities` | PASS |
| `npm audit --omit=dev --audit-level=high && npm audit --audit-level=high` (`+ --json`) | Exit `0` (`AUDIT_ZERO_HIGH_CRIT`) | `0` vulnerabilidades (`0C / 0H / 0M / 0L`) | PASS |
| `npx vitest run test/unit/dependency-hygiene.test.ts` | `passed` | **7/7** testes passed (`vitest v4.1.12`) | PASS |
| `npm test` | `passed` | Exit `0` (`passed`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit `0` (`TYPECHECK_OK`) | Exit `0` (`TYPECHECK_OK` com `@cloudflare/workers-types@5.20261120.1`) | PASS |
| `npm run build && npm run build:worker && npm run test:transport` | `PASS: both transports expose the expected catalogue` | Build + `stdio` (`101` chamadas) + `HTTP/SSE` | PASS |
| `criteria-check.py --root "$WT" --ticket TCK-0022 --json` | `verdict: pass` | **4/4** critérios `pass` | PASS |
