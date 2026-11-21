---
id: DES-0015
slug: validacao-zod-em-runtime-nas-23-tools-mcp-remocao-de-api-key-e-governanca-agenti
title: "Validacao Zod em runtime nas 23 tools MCP, remocao de api_key e governanca agentica"
created_at: 2026-11-20T16:46:06Z
status: approved
ticket: TCK-0016
type: design
scope_files_new:
  - lib/core/tool-schemas.ts
  - test/unit/tool-validation-allowlist.test.ts
  - .archagents/_capabilities.json
  - .archagents/mcp-tool-allowlist.json
scope_files_modified:
  - lib/core/registry.ts
  - lib/core/intelligence.ts
  - lib/tools/core.ts
  - lib/tools/company.ts
  - lib/tools/government.ts
  - lib/tools/legal.ts
  - lib/tools/financial.ts
  - lib/tools/health.ts
  - lib/tools/osint.ts
  - .archagents/07-security-compliance.md
scope_files_deleted: []
blast_radius: medium
security_sensitive: true
playbook: .archagents/16-designs/playbooks/DES-0015-playbook.md
acceptance_delta: unchanged
---
# DES-0015 - Validacao Zod em runtime nas 23 tools MCP, remocao de api_key e governanca agentica

## Problema (`FND-0004`)

1. Apenas 2 de 23 ferramentas MCP (`cnpj_lookup` e `cep_lookup`) validam inputs em runtime via Zod (`lib/tools/core.ts:L54,L70`); as demais 21 utilizam type assertions (`args as ...`), permitindo `null`, tipos inválidos, crashes por `.replace`/`.toUpperCase`, enums arbitrários e parâmetros numéricos sem limites superiores/inferiores (amplificação de `max_results`, `max_queries`, `size`, `tamanho`, `ultimos`, `pagina`).
2. `cnpj_intelligence` anuncia o parâmetro `api_key` em `inputSchema` (`lib/tools/core.ts:L96` e `lib/core/intelligence.ts:L441-L444`) e na interface `IntelligenceOptions` (`lib/core/intelligence.ts:L64`), contradizendo a política explícita em `lib/core/search.ts:L39` de usar exclusivamente credenciais configuradas no servidor.
3. Ausência dos artefatos de governança agêntica verificáveis em máquina (`.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json`) exigidos por `SAFETY.md §SC-9`.

## Solução & Arquitetura

1. **Validação centralizada obrigatória no Registry (`lib/core/registry.ts` + `lib/core/tool-schemas.ts`):**
   - Criar `lib/core/tool-schemas.ts` com schemas Zod individuais e bounds estritos para todas as **23** ferramentas registradas, preservando contratos existentes (ex.: `cpf_validate` aceitando `"00000000000"` para devolver `valid: false`, `pncp_licitacoes` e `querido_diario` aceitando `query: ""` para consultas por filtro/edições recentes).
   - Tornar `zodSchema: ZodTypeAny` campo obrigatório em `ToolHandler` (`lib/core/registry.ts`), garantindo em compile-time que nenhuma tool possa ser registrada sem schema Zod; exportar `hasToolSchema(name)`.
   - Em `executeRegisteredTool(name, args, apiConfig, cache)`, executar `tool.zodSchema.safeParse(args === undefined ? {} : args)` antes de chamar `tool.execute`, retornando `{ ok: false, error: "Invalid parameters for <name>: ..." }` (compatível com `formatErrorResponse` / JSON-RPC `-32602` / MCP `isError: true`) sem disparar requisições HTTP upstream.
2. **Remoção de `api_key` e alinhamento de `cnpj_intelligence` (`lib/core/intelligence.ts` + `lib/tools/core.ts`):**
   - Remover `apiKey?: string` de `IntelligenceOptions` e remover `api_key` dos `inputSchema` em `lib/core/intelligence.ts` (`CNPJ_INTELLIGENCE_TOOL`) e `lib/tools/core.ts`; marcar `CnpjIntelligenceSchema` com `.strict()` para rejeitar explicitamente chamadas que tentem injetar `api_key` ou campos extras.
   - Sincronizar `categories` (com os 10 valores de `DorkCategory`) e `provider` (`["tavily", "perplexity"]`), e adicionar `minimum`/`maximum` nos `inputSchema` de paginação/limite (`government.ts`, `legal.ts`, `financial.ts`).
3. **Artefatos de governança `SAFETY.md §SC-9`:**
   - Versionar `.archagents/_capabilities.json` (`"enabled": false` para manter espelho de tracker externo opt-in OFF conforme ADR-0005, `"agentic": { "mcp": true, "tool_count": 23, ... }`) e `.archagents/mcp-tool-allowlist.json` listando `mcp-dadosbr` em `mcp_servers.allowed` e todas as 23 tools em `entries[]` com as chaves obrigatórias de `verify-tool-allowlist.py` (`id`, `name`, `risk_level`, `destructive`, `requires_approval`).

## Threat Model (`T1`–`T5`)

| ID | Ameaça | Vetor / Superfície | Controle / Mitigação | Verificação |
|---|---|---|---|---|
| `T1` | Type confusion e crashes em runtime | Chamador envia `null`, array, número ou campo ausente em 21/23 tools que usavam `args as ...` | `zodSchema` obrigatório em `ToolHandler` + `safeParse` centralizado em `executeRegisteredTool` | Testes unitários negativos para todas as 23 tools em `tool-validation-allowlist.test.ts` |
| `T2` | Amplificação de recursos e upstream | Valores negativos, `NaN`, float ou gigantes em `max_results`, `max_queries`, `size`, `tamanho`, `ultimos`, `pagina`, `page`, `thoughtNumber` | `z.number().int().min(...).max(...)` e `.max(...)` em strings nos 23 schemas Zod + `inputSchema` JSON | Testes negativos fora de faixa garantindo `{ ok: false }` e `fetch` não chamado |
| `T3` | Exposição/envio de credencial pelo LLM em `cnpj_intelligence` | LLM envia `{ cnpj: "...", api_key: "..." }` incentivado pelo schema | Remoção de `api_key`/`apiKey` de `core.ts` e `intelligence.ts` + `.strict()` rejeitando `api_key` em runtime | Asserção nos schemas exportados e teste negativo passando `{ api_key: "secret" }` |
| `T4` | Parameter smuggling / bypass de formatos | Datas inválidas (`since`/`until`/`dataInicio`), `tribunal` desconhecido, `territory_id` não numérico, `uf`/`tipo`/`codigo_fipe` arbitrários | Enums explícitos, regexes estritos (`YYYY-MM-DD`, `DD/MM/YYYY`, UF, IBGE, FIPE) e allowlist de 17 tribunais Datajud | Testes negativos cobrindo datas, enums, tribunais, UF e códigos inválidos antes de qualquer `fetch` |
| `T5` | Superfície MCP sem governança verificável em máquina (`§SC-9`) | Falta de `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json` ou deriva frente ao registry | Artefatos JSON versionados, validados por `verify-tool-allowlist.py` e testados em CI local contra `TOOL_DEFINITIONS` (23/23) | `verify-tool-allowlist.py` (0 violações) + teste comparando `allowlist.entries` com `TOOL_DEFINITIONS` |

## Criterios de sucesso

- [ ] Todos os 3 critérios de `acceptance:` do `TCK-0016` passam via `criteria-check.py`.
- [ ] `npm test`, `tsc` (Node e Worker), `npm run build && npm run build:worker`, `verify-tool-allowlist.py` e revisão adversarial independente passam sem bloqueantes.
