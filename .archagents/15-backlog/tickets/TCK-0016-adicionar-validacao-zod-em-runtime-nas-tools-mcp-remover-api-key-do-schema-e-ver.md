---
id: TCK-0016
slug: adicionar-validacao-zod-em-runtime-nas-tools-mcp-remover-api-key-do-schema-e-ver
title: "Adicionar validacao Zod em runtime nas tools MCP, remover api_key do schema e versionar _capabilities.json e allowlist"
source: audit
created_at: 2026-11-20T15:16:13Z
created_by: ops
updated_at: 2026-11-20T16:59:49Z
status: done
severity: high
category: security
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0004
linked_designs:
  - DES-0015
linked_runs:
  - RUN-20261120-164654-zod-runtime-validation-capabilities-allowlist
linked_verifications:
  - VER-20261120-165846-tck-0016
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/tool-validation-allowlist.test.ts"
    expect: passed
    note: "All 23 MCP tools carry runtime Zod schemas rejecting invalid/unbounded inputs without upstream fetch, api_key is absent from cnpj_intelligence, and _capabilities/allowlist match"
  - check: "npm test && npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
    note: "Full test suite and Node + Worker TypeScript typechecks pass without regressions"
  - check: "python3 -c 'import json,pathlib; cap=json.loads(pathlib.Path(\".archagents/_capabilities.json\").read_text()); al=json.loads(pathlib.Path(\".archagents/mcp-tool-allowlist.json\").read_text()); req={\"id\",\"name\",\"risk_level\",\"destructive\",\"requires_approval\"}; assert cap.get(\"agentic\",{}).get(\"mcp\") is True; assert len(al.get(\"entries\",[]))==23; assert all(req.issubset(e) for e in al[\"entries\"]); assert any(s.get(\"server\")==\"mcp-dadosbr\" for s in al.get(\"mcp_servers\",{}).get(\"allowed\",[])); print(\"GOVERNANCE_ARTIFACTS_OK\")'"
    expect: GOVERNANCE_ARTIFACTS_OK
    note: "Governance artifacts .archagents/_capabilities.json and .archagents/mcp-tool-allowlist.json exist and satisfy schema requirements"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T16:46:05Z
---
# TCK-0016 - Adicionar validacao Zod em runtime nas tools MCP, remover api_key do schema e versionar _capabilities.json e allowlist

## Contexto

Originado por **FND-0004** (`agentic-security` / `high`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/tools/core.ts:L79-L104`, `lib/core/intelligence.ts:L441-L444`, `lib/tools/government.ts:L60`, `lib/tools/government.ts:L80-L81`, `lib/tools/government.ts:L300-L302`, `lib/tools/company.ts:L40-L41`, `lib/tools/company.ts:L71-L72`, `lib/tools/company.ts:L149-L150`, `lib/tools/legal.ts:L28-L29`, `lib/tools/legal.ts:L100`, `lib/tools/legal.ts:L138`, `lib/tools/legal.ts:L190`, `.archagents/07-security-compliance.md:L1-L14`.
- **Problema:** 21 de 23 tools confiam em `args as ...` sem validação Zod em runtime, `cnpj_intelligence` anuncia `api_key` no schema em desacordo com `lib/core/search.ts:L39`, e faltam `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json` (`SAFETY.md §SC-9`).
- **Mitigação:** Validar inputs com Zod em runtime para todas as 23 tools (com bounds explícitos), remover `api_key` do schema de `cnpj_intelligence` e versionar `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json`.

## Falsificador

Evidências verificáveis no commit base `6e04d1b` antes do fix:
- `lib/core/registry.ts:L10-L15,L44-L55`: `ToolHandler` não exige `zodSchema` e `executeRegisteredTool` invoca `tool.execute(args, ...)` sem validação em runtime.
- `lib/tools/core.ts:L79-L82,L96,L100-L103` e `lib/core/intelligence.ts:L64,L441-L444`: `cnpj_search` e `cnpj_intelligence` fazem type assertion `args as ...` sem Zod em runtime e expõem `api_key` no schema, contrariando `lib/core/search.ts:L39`.
- `lib/tools/company.ts:L40-L41,L71-L72,L149-L150`, `lib/tools/government.ts:L60,L80-L81,L300-L302`, `lib/tools/legal.ts:L28-L29,L100,L138,L190`, `lib/tools/health.ts:L45`, `lib/tools/osint.ts:L137`: 21/23 tools aceitam argumentos sem validação Zod nem limites de paginação/tamanho.
- `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json`: ausentes no repositório (`SAFETY.md §SC-9`).
- **Comando falsificador:** `npx vitest run test/unit/tool-validation-allowlist.test.ts` (reprova antes do fix por falta dos schemas Zod nas 23 tools, presença de `api_key` em `cnpj_intelligence` e ausência dos artefatos de governança).

## Log de transicoes

- 2026-11-20T15:16:13Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T16:46:05Z - **triaged** - Triagem de FND-0004 (Zod runtime nas 23 tools, remocao de api_key e artefatos SC-9) com criterios verificaveis [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T16:46:54Z - **linked** - links updated
- 2026-11-20T16:46:54Z - **designed** - DES-0015 (Threat Model T1-T5) e playbook de 4 passos aprovados em L3
- 2026-11-20T16:46:54Z - **linked** - links updated
- 2026-11-20T16:46:55Z - **executing** - Iniciando implementacao de DES-0015 em branch bugfix/TCK-0016-zod-runtime-validation-capabilities-allowlist (RUN-20261120-164654-zod-runtime-validation-capabilities-allowlist)
- 2026-11-20T16:53:44Z - **verifying** - Implementacao, 23 schemas Zod, artefatos SC-9, testes e builds concluidos; iniciando verify adversarial independente
- 2026-11-20T16:59:49Z - **done** - Verify adversarial independente aprovado (VER-20261120-165846-tck-0016) e judge verdict aprovado
