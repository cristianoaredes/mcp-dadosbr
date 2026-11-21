---
id: DES-0040
slug: integrar-catalogo-29-tools-v0-7-0-allowlists-sc-9-worker-e-docs
title: "Integrar catalogo 29 tools v0.7.0, allowlists SC-9, Worker e docs"
created_at: 2026-11-21T16:57:23Z
status: approved
ticket: TCK-0044
type: design
scope_files_new: []
scope_files_modified:
  - lib/core/tool-schemas.ts
  - lib/tools/index.ts
  - lib/tools/company.ts
  - lib/shared/utils/constants.ts
  - package.json
  - .archagents/_capabilities.json
  - .archagents/mcp-tool-allowlist.json
  - test/unit/tool-validation-allowlist.test.ts
  - test/unit/architecture-hygiene.test.ts
  - test/unit/mcp-server-handlers.test.ts
  - test/integration/transports.mjs
  - README.md
  - .archagents/00-overview.md
  - .archagents/01-business-domain.md
  - .archagents/02-architecture.md
  - .archagents/03-modules.md
  - .archagents/05-integrations.md
  - .archagents/07-security-compliance.md
  - .archagents/08-conventions.md
scope_files_deleted: []
blast_radius: medium
playbook: .archagents/16-designs/playbooks/DES-0040-playbook.md
acceptance_delta: unchanged
---
# DES-0040 - Integrar catalogo 29 tools v0.7.0, allowlists SC-9, Worker e docs

## Problema

As 6 ferramentas da Wave 1 (`tcu_certidoes`, `cnae_ncm_lookup`, `sistema_financeiro_lookup`, `feriados_ddd_lookup`, `bcb_olinda`, `ibge_indicadores`) foram implementadas em módulos isolados (`TCK-0041..0043`) sem auto-registro top-level. Falta conectá-las ao barrel `lib/tools/index.ts` e `TOOL_SCHEMAS`, elevar a versão para `0.7.0`, sincronizar allowlist `SC-9` (`29` entradas), atualizar testes de catálogo/transporte e refletir o estado real na documentação.

## Solucao

1. **`lib/core/tool-schemas.ts` & `lib/tools/index.ts`:**
   - Importar/re-exportar os 6 schemas Zod de `../shared/{tcu-schema,fiscal-banking-schemas,olinda-ibge-schemas}.js` e adicioná-los em `TOOL_SCHEMAS`.
   - Importar e invocar `registerTcuTool()`, `registerFiscalBankingTools()`, `registerOlindaTool()` e `registerIbgeIndicadoresTool()` no barrel `lib/tools/index.ts` (elevando o catálogo para `29` ferramentas em Node e Cloudflare Worker).
   - Atualizar a descrição de `company_deep_profile` em `lib/tools/company.ts` para citar também as certidões TCU (`tcu_certidoes`).
2. **Versão `0.7.0` e Governança `SC-9`:**
   - Atualizar `"version": "0.7.0"` em `package.json` e `SERVER.VERSION` em `lib/shared/utils/constants.ts`.
   - Atualizar `.archagents/_capabilities.json` (`tool_count: 29`) e `.archagents/mcp-tool-allowlist.json` (`MCP-TOOL-24`..`MCP-TOOL-29` para todas as 29 tools).
3. **Testes de Catálogo & Transporte (`29` tools):**
   - Atualizar `test/unit/tool-validation-allowlist.test.ts` (29 tools + `invalidCases` cobrindo todas as 6 novas tools sem chamar `fetch`), `test/unit/architecture-hygiene.test.ts`, `test/unit/mcp-server-handlers.test.ts` e `test/integration/transports.mjs` (`29` tools + `5` MCP Apps).
4. **Documentação Canônica:**
   - Atualizar `README.md` e `.archagents/{00-overview,01-business-domain,02-architecture,03-modules,05-integrations,07-security-compliance,08-conventions}.md`.

## Threat Model

- **Allowlist `SC-9` (`SAFETY.md`):** nenhuma ferramenta entra em produção sem registro revisado em `.archagents/mcp-tool-allowlist.json`, schema Zod `.strict()` em `TOOL_SCHEMAS` e proibição de `api_key` no schema público.
- **Boundary acíclico & Worker parity (`ADR-0001`, `ADR-0002`):** `lib/core/tool-schemas.ts` importa somente `lib/shared/*` (nunca `lib/tools/*`); `build:worker` e `tsc -p tsconfig.worker.json --noEmit` permanecem limpos com zero imports `node:*`.
- **Integridade do transporte `stdio`:** `npm run test:transport` garante zero vazamento em `stdout` e catálogo completo de 29 ferramentas + 5 MCP Apps em `stdio` e `HTTP/SSE`.

## Mudancas

- Código/Testes/Config: `lib/core/tool-schemas.ts`, `lib/tools/index.ts`, `lib/tools/company.ts`, `lib/shared/utils/constants.ts`, `package.json`, `test/unit/tool-validation-allowlist.test.ts`, `test/unit/architecture-hygiene.test.ts`, `test/unit/mcp-server-handlers.test.ts`, `test/integration/transports.mjs`.
- Docs/Governança: `.archagents/_capabilities.json`, `.archagents/mcp-tool-allowlist.json`, `README.md`, `.archagents/{00,01,02,03,05,07,08}-*.md`.

## Criterios de sucesso

- [ ] `npm run build && npm run build:worker` e `tsc` Node/Worker passam.
- [ ] `TOOL_DEFINITIONS` e `.archagents/mcp-tool-allowlist.json` listam exatamente 29 tools e versão `0.7.0`.
- [ ] `npx vitest run --coverage` e `npm run test:transport` passam 100%.
- [ ] `secret-scan.sh` passa sem alertas.
