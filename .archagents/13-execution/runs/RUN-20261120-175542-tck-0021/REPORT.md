---
status: completed
run_id: RUN-20261120-175542-tck-0021
ticket: TCK-0021
design: DES-0019
start_time: 2026-11-20T17:55:42Z
end_time: 2026-11-20T17:59:00Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - package.json
  - package-lock.json
  - lib/adapters/smithery.ts
  - lib/core/registry.ts
  - lib/core/tool-schemas.ts
  - .github/workflows/ci.yml
  - test/unit/dependency-hygiene.test.ts
  - .archagents/06-infra-devops.md
  - .archagents/07-security-compliance.md
test_result:
  status: pass
  summary: "npm audit --omit=dev 0 vulns, npm ci OK, 375/375 Vitest (24 arquivos), tsc + tsc.worker TYPECHECK_OK, build + build:worker BUILD_OK, test:transport PASS, npm pack OK (206 arquivos), criteria-check 3/3 pass"
---
# RUN-20261120-175542-tck-0021 - TCK-0021

## Resumo executivo

- Removido o módulo morto `lib/workers/mcp-agent.ts` (`DadosBRMCP` já havia sido deletada em `wrangler.toml:L9`) e removidas de `package.json` as 4 dependências de produção não utilizadas (`agents`, `@smithery/sdk`, `workers-mcp`, `async-mutex`).
- Atualizadas `zod` (`^4.6.7`) e `express` (`^5.3.0`) em `dependencies` (preservando `devDependencies` intacto para `TCK-0022`), com adaptação Zod v4 em `lib/adapters/smithery.ts` (`z.record(z.string(), z.string())`), `lib/core/registry.ts` (`ZodType`) e `lib/core/tool-schemas.ts` (`ZodType` e `{ error: ... }` em `FipeSchema`).
- Removido o symlink `WT/node_modules` antes do `npm install` + `npm audit fix --omit=dev` (mantendo `$MAIN` 100% intacto), zerando todas as 20 vulnerabilidades de produção (`0C / 0H / 0M / 0L`, `found 0 vulnerabilities`) com `npm ci` verde.
- Adicionado o step `npm audit --omit=dev --audit-level=high` no job `lint` de `.github/workflows/ci.yml:L116-L117`, adicionados testes em `test/unit/dependency-hygiene.test.ts` (`4` testes) e atualizadas `.archagents/06-infra-devops.md` e `.archagents/07-security-compliance.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npm audit --omit=dev --audit-level=high` | Exit 0 (`0` high/critical) | `found 0 vulnerabilities` (`0C / 0H / 0M / 0L`) | PASS |
| `npm test` | `passed` | **24/24** arquivos, **375/375** testes (`3.55s`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `npm run test:transport` | `PASS: both transports expose the expected catalogue` | 23 tools em `stdio` (`101` chamadas) + HTTP/SSE | PASS |
| `npm pack --dry-run --json` | 5 MCP Apps HTML e sem `mcp-agent` | `206` arquivos, 5 HTML presentes, zero `mcp-agent` | PASS |
| `criteria-check.py --ticket TCK-0021 --json` | `verdict: pass` | 3/3 critérios pass | PASS |
