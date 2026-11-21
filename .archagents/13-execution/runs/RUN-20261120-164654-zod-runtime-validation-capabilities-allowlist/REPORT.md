---
status: completed
run_id: RUN-20261120-164654-zod-runtime-validation-capabilities-allowlist
ticket: TCK-0016
design: DES-0015
start_time: 2026-11-20T16:46:54Z
end_time: 2026-11-20T16:53:03Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/core/tool-schemas.ts
  - lib/core/registry.ts
  - lib/core/intelligence.ts
  - lib/tools/core.ts
  - lib/tools/company.ts
  - lib/tools/government.ts
  - lib/tools/legal.ts
  - lib/tools/financial.ts
  - lib/tools/health.ts
  - lib/tools/osint.ts
  - test/unit/tool-validation-allowlist.test.ts
  - .archagents/_capabilities.json
  - .archagents/mcp-tool-allowlist.json
  - .archagents/07-security-compliance.md
test_result:
  status: pass
  summary: "3/3 testes tool-validation-allowlist.test.ts (23/23 tools), 318/318 Vitest (20 arquivos), tsc + tsc.worker TYPECHECK_OK, npm run build + build:worker BUILD_OK, verify-tool-allowlist.py ok: true, git diff --check e secret-scan.sh limpos"
---
# RUN-20261120-164654-zod-runtime-validation-capabilities-allowlist - TCK-0016

## Resumo executivo

- Criado `lib/core/tool-schemas.ts` definindo schemas Zod explícitos com bounds (`min`/`max`, enums, regexes de data/tribunal/UF/FIPE/IBGE) para todas as **23** tools MCP registradas (`TOOL_SCHEMAS`), mantendo compatibilidade com contratos existentes (ex.: `cpf_validate` para `"00000000000"` e `query: ""` em `pncp_licitacoes` e `querido_diario`).
- Endurecido `lib/core/registry.ts`: campo `zodSchema: ZodTypeAny` agora é obrigatório em `ToolHandler` (garantia em compile-time), com helper `hasToolSchema(name)` e execução centralizada de `tool.zodSchema.safeParse(...)` em `executeRegisteredTool` retornando `{ ok: false, error: "Invalid parameters for <name>: ..." }` antes de chamar `tool.execute`.
- Removido `apiKey`/`api_key` de `IntelligenceOptions`, `CNPJ_INTELLIGENCE_TOOL` (`lib/core/intelligence.ts`) e `cnpj_intelligence` (`lib/tools/core.ts`), com `.strict()` no `CnpjIntelligenceSchema` rejeitando tentativas de envio de `api_key`. Conectados `zodSchema` e bounds JSON Schema nas 23 tools em `core.ts`, `company.ts`, `government.ts`, `legal.ts`, `financial.ts`, `health.ts` e `osint.ts`.
- Versionados `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json` (`SAFETY.md §SC-9`), cobrindo todas as 23 tools com chaves válidas para `verify-tool-allowlist.py` e `claude-hook-adapter.sh`; criado `test/unit/tool-validation-allowlist.test.ts` e atualizado `.archagents/07-security-compliance.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/tool-validation-allowlist.test.ts` | All passed | 1 arquivo, 3/3 passed (225 ms) | PASS |
| `npm test` | All tests pass | 20 arquivos, 318/318 passed (3.54 s) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `verify-tool-allowlist.py --json` | `ok: true`, `violations: []` | `ok: true`, `violations_count: 0` | PASS |
| `git diff --check && secret-scan.sh` | Exit 0, zero segredos | Exit 0, limpo | PASS |

## Matriz de Controles (`DES-0015` Threat Model)

| Threat ID | Recurso | Implementação | Evidência / Teste | Risco residual |
|---|---|---|---|---|
| `T1` | Todas as 23 tools em `registry.ts` | `zodSchema: ZodTypeAny` obrigatório em `ToolHandler` + `safeParse` em `executeRegisteredTool` | `tool-validation-allowlist.test.ts` confirma `hasToolSchema` = `true` (23/23) e rejeição de tipos inválidos/`null` | Callers internos diretos (`executeTransparencia` via `company_deep_profile`) recebem CNPJ já validado por `DeepProfileSchema` |
| `T2` | Bounds de paginação e tamanho | `.int().min(...).max(...)` e limites de string em `TOOL_SCHEMAS` e JSON Schemas | Testes negativos para `max_results: 999`, `max_queries: 100`, `pagina: 0`/`5000`, `size: 500`/`0`, `tamanho: -5`, `ultimos: 0`, `thoughtNumber: 0` | Sem rate limit por chamada CLI/`stdio` até `TCK-0017` |
| `T3` | `cnpj_intelligence` sem `api_key` | Removido `api_key`/`apiKey` de `intelligence.ts` e `core.ts`; `.strict()` em `CnpjIntelligenceSchema` | Assert sobre `TOOL_DEFINITIONS` + `CNPJ_INTELLIGENCE_TOOL` + rejeição em runtime com `{ api_key: "client-key" }` | N/A |
| `T4` | Enums & formatos (`dataInicio`, `since`, `tribunal`, `uf`, FIPE) | Regexes de data/IBGE/UF/FIPE + allowlist de 17 tribunais Datajud + enums | Testes negativos sem chamada `fetch` para cada formato inválido | Semântica avançada de data calendário no PNCP continua validada em `pncpDate` |
| `T5` | Artefatos agênticos `§SC-9` | `.archagents/_capabilities.json` + `.archagents/mcp-tool-allowlist.json` (23 tools) | `verify-tool-allowlist.py` (`0` violações) + teste comparando `allowlist.entries` com `TOOL_DEFINITIONS` | Enforcement de hooks runtime requer `CODEBASE_OPS_MCP_ENFORCE=1` no ambiente do harness |
