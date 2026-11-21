---
status: completed
run_id: RUN-20261121-170002-tck-0044
ticket: TCK-0044
design: DES-0040
start_time: 2026-11-21T17:00:02Z
end_time: 2026-11-21T17:11:36Z
environment: dev
mode: live
operator: ops
commits:
  - c6ba490
files_modified:
  - .archagents/00-overview.md
  - .archagents/01-business-domain.md
  - .archagents/02-architecture.md
  - .archagents/03-modules.md
  - .archagents/05-integrations.md
  - .archagents/07-security-compliance.md
  - .archagents/08-conventions.md
  - .archagents/16-designs/DES-0040-integrar-catalogo-29-tools-v0-7-0-allowlists-sc-9-worker-e-docs.md
  - .archagents/_capabilities.json
  - .archagents/mcp-tool-allowlist.json
  - README.md
  - lib/core/tool-schemas.ts
  - lib/shared/utils/constants.ts
  - lib/tools/company.ts
  - lib/tools/index.ts
  - package.json
  - test/integration/transports.mjs
  - test/unit/architecture-hygiene.test.ts
  - test/unit/fiscal-banking-v070.test.ts
  - test/unit/mcp-server-handlers.test.ts
  - test/unit/tcu-mte-v070.test.ts
  - test/unit/tool-validation-allowlist.test.ts
test_result:
  status: pass
  summary: "536/536 Vitest tests (39 files, 94.67% stmts / 86.32% branch / 97.1% funcs / 95.25% lines), build + build:worker + tsc PASS, test:transport PASS (29 tools stdio/HTTP+SSE, 5 MCP Apps, 101 stdio calls), secret-scan PASS"
  details: "Integrates 6 new Worker-safe tools from TCK-0041..0043 into lib/tools/index.ts & lib/core/tool-schemas.ts (29 total), bumps package/constants to 0.7.0, updates SC-9 allowlist & _capabilities.json, and syncs README + .archagents documentation."
---
# RUN-20261121-170002-tck-0044 - TCK-0044

## Resumo executivo

Execução completa do `TCK-0044` (`DES-0040`, `SPC-0001` Wave 2) sobre `feature/SPC-0001-v0.7.0-transversal-sources` (commit `c6ba490`):

1. **Catálogo MCP & Worker parity (29 tools):** integração das 6 novas tools Worker-safe (`tcu_certidoes`, `cnae_ncm_lookup`, `sistema_financeiro_lookup`, `feriados_ddd_lookup`, `bcb_olinda`, `ibge_indicadores`) em `lib/core/tool-schemas.ts` e `lib/tools/index.ts`, além de atualização de descrição de `company_deep_profile` em `lib/tools/company.ts`.
2. **Versão `0.7.0` e Governança (`SC-9`):** bump para `0.7.0` em `package.json` e `lib/shared/utils/constants.ts`; `.archagents/mcp-tool-allowlist.json` (`MCP-TOOL-01`..`MCP-TOOL-29`) e `.archagents/_capabilities.json` (`tool_count: 29`) alinhados.
3. **Documentação & AS-IS:** sincronização de `README.md` e `.archagents/{00-overview,01-business-domain,02-architecture,03-modules,05-integrations,07-security-compliance,08-conventions}.md`.
4. **Suite de testes e transportes:** atualização de `tool-validation-allowlist.test.ts`, `architecture-hygiene.test.ts`, `mcp-server-handlers.test.ts`, `tcu-mte-v070.test.ts`, `fiscal-banking-v070.test.ts` e `test/integration/transports.mjs`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npm run build && npm run build:worker` + `tsc --noEmit` + `tsc -p tsconfig.worker.json --noEmit` | Exit `0` | Exit `0` | PASS |
| Catálogo `TOOL_DEFINITIONS` + `.archagents/mcp-tool-allowlist.json` + `0.7.0` | `29` tools, versão `0.7.0` | `TOOLS_OK:29`, `ALLOWLIST_AND_VERSION_OK` | PASS |
| `npx vitest run --coverage` | Pass 100% | `39 passed (39)`, `536 passed (536)`, Stmts `94.67%` / Branch `86.32%` / Funcs `97.1%` / Lines `95.25%` | PASS |
| `npm run test:transport` | stdio + HTTP/SSE (`29` tools, `5` MCP Apps) | `101` chamadas stdio ok, HTTP/SSE `29 tools` + `5` Apps ok | PASS |
| `criteria-check.py --ticket TCK-0044 --no-record --json` | `6/6` pass | `6/6` pass | PASS |
| `secret-scan.sh` (staged changes) | Exit `0` | `No secrets detected` | PASS |
