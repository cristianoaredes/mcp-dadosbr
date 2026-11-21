---
id: TCK-0036
slug: delimitar-outputs-externos-anti-prompt-injection-limitar-payload-mcp-e-alinhar-a
title: "Delimitar outputs externos anti-prompt-injection, limitar payload MCP e alinhar allowlist"
source: audit
created_at: 2026-11-21T13:09:43Z
created_by: ops
updated_at: 2026-11-21T13:09:43Z
status: raw
severity: medium
category: agentic-security
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0021
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/mcp-tool-allowlist.json
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance: []
---
# TCK-0036 - Delimitar outputs externos anti-prompt-injection, limitar payload MCP e alinhar allowlist

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0021`** (`agentic-security`, `medium`).

**Problema:** Outputs externos (snippets web/HTML de busca/legal) e o campo `context` em `strategic_osint_prompt` não são encapsulados com delimitadores anti-prompt-injection de conteúdo não confiável; respostas de tools em `mcp-server.ts` e `cloudflare.ts` não possuem teto/truncamento uniforme de payload; e `.archagents/mcp-tool-allowlist.json:L56` diverge de `lib/core/tool-schemas.ts:L59` (`10` vs `20` queries).

**Evidências (`a3a2e12`):**
- `lib/core/search-providers.ts:L96-L105,L209-L223`
- `lib/tools/legal.ts:L221-L237`
- `lib/tools/osint.ts:L95-L114`
- `lib/core/mcp-server.ts:L212-L220`
- `lib/adapters/cloudflare.ts:L290-L302`
- `.archagents/mcp-tool-allowlist.json:L56` vs `lib/core/tool-schemas.ts:L59`

**Mitigação sugerida:**
- Encapsular snippets externos/HTML e `context` em `strategic_osint_prompt` com delimitadores explícitos de dado não confiável anti-prompt-injection.
- Impor teto máximo e truncamento de payload de saída em `mcp-server.ts` e `cloudflare.ts`.
- Alinhar `.archagents/mcp-tool-allowlist.json:L56` ao limite vigente em `lib/core/tool-schemas.ts:L59` (`20` queries).

## Falsificador

Antes do fix, `lib/core/search-providers.ts:L96-L105,L209-L223`, `lib/tools/legal.ts:L221-L237` e `lib/tools/osint.ts:L95-L114` não delimitam outputs/contextos não confiáveis, `lib/core/mcp-server.ts:L212-L220` e `lib/adapters/cloudflare.ts:L290-L302` não aplicam limite/truncamento de saída e `.archagents/mcp-tool-allowlist.json:L56` diverge de `lib/core/tool-schemas.ts:L59`.

## Log de transicoes

- 2026-11-21T13:09:43Z - **raw** - criado via scripts/ops/ticket/create.py.
